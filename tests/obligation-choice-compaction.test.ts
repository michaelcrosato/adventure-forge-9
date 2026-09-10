import assert from "node:assert/strict";
import test from "node:test";
import { FunctionalGeneratorModel } from "../src/tooling/generate-certificates.js";
import { SymbolicModel } from "../src/verification/symbolic-model.js";
import { proveCompletionSafetyByObligation } from "../src/verification/symbolic-obligations.js";

const SCENARIO = {
  version: 1,
  initialScene: "start",
  initialResources: { token: 1 },
  initialFacts: [],
  clocks: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "A safe start." }] },
    { id: "finish", title: "Finish", text: [{ text: "A completed route." }] },
    { id: "bridge", title: "Bridge", text: [{ text: "A bounded resource fault." }] },
    { id: "trap", title: "Trap", text: [{ text: "A non-completing loop." }] },
  ],
  choices: [
    { id: "enter-finish", scene: "start", label: "Finish", description: "Take the safe route.", effects: [{ type: "goTo", scene: "finish" }] },
    { id: "complete", scene: "finish", label: "Complete", description: "End the route.", effects: [], outcome: { status: "completed", summary: "The route is complete." } },
    { id: "cross-bridge", scene: "bridge", label: "Cross", description: "Increase the bounded resource before crossing.", effects: [{ type: "adjustResource", resource: "token", delta: 1 }, { type: "goTo", scene: "trap" }] },
    { id: "loop", scene: "trap", label: "Loop", description: "Remain trapped.", effects: [{ type: "goTo", scene: "trap" }] },
  ],
} as const;

for (const order of ["interleaved", "blocked"] as const) {
  for (const unsafe of [false, true]) {
    for (const interval of [0, 1, 1_000_000]) {
    test(`choice-level copying preserves exact predicates: ${order}, unsafe=${unsafe}, interval=${interval}`, () => {
      const scenario = {
        ...SCENARIO,
        choices: [...SCENARIO.choices, ...(unsafe ? [{
          id: "enter-bridge", scene: "start", label: "Enter bridge", description: "Enter the unsafe branch.",
          effects: [{ type: "goTo", scene: "bridge" }],
        }] : [])],
      };
      const options = { order, transitionMode: "partitioned" as const, nodeLimit: 30_000, cacheLimit: 1 };
      const normal = new SymbolicModel(scenario, { token: 1 }, options);
      const generator = new FunctionalGeneratorModel(scenario, { token: 1 }, options);
      const normalCones = new Map<string, readonly number[]>();
      const compactedCones = new Map<string, readonly number[]>();
      const proofOptions = {
        roundLimit: 32,
        nonCompletionMode: "failure-absorbed" as const,
        nonCompletionPartition: "scene" as const,
        failurePartition: "combined" as const,
        fixedPointCompactEvery: 1,
        obligationCompactEvery: 1,
      };
      const baseline = proveCompletionSafetyByObligation(normal, {
        ...proofOptions,
        onObligation: ({ model, seed, bad, summary }) => {
          normalCones.set(summary.id, model.bdd.copyForestTo(normal.bdd, [seed, bad]));
        },
      });
      let withinSweepCopies = 0;
      const compacted = proveCompletionSafetyByObligation(generator, {
        ...proofOptions,
        obligationChoiceCompactAt: 1,
        obligationChoiceCompactInterval: interval,
        onProgress: progress => {
          if (progress.phase === "obligation-compact" && progress.choiceId !== undefined) withinSweepCopies++;
        },
        onObligation: ({ model, seed, bad, summary }) => {
          compactedCones.set(summary.id, model.bdd.copyForestTo(normal.bdd, [seed, bad]));
        },
      });
      if (interval < 1_000_000) {
        assert.ok(withinSweepCopies > 0, "force copies within sweeps, not only at round boundaries");
      } else {
        assert.equal(withinSweepCopies, 0, "a large interval avoids copying after tiny allocation increases");
      }
      assert.deepEqual(compactedCones, normalCones, "all seed and closure predicates are exactly equal");
      assert.deepEqual(
        compacted.model.bdd.copyForestTo(normal.bdd, [compacted.completable, compacted.completionOrFailure!]),
        baseline.model.bdd.copyForestTo(normal.bdd, [baseline.completable, baseline.completionOrFailure!]),
      );
      assert.deepEqual(compacted.failureSeeds, baseline.failureSeeds);
      assert.ok(compacted.failureSeeds!.some(seed => !seed.seedZero), "exercise actual bounded-resource failure seeds");
      assert.notEqual(compactedCones.get("failure-union:")![1], 0);
      assert.equal(baseline.initialInBad, unsafe);
      assert.equal(compacted.initialInBad, unsafe);
      assert.equal(compacted.complete, true);
      assert.deepEqual(
        compacted.obligations.map(({ id, kind, sceneId, choiceId, seedZero, initialInBad }) => ({ id, kind, sceneId, choiceId, seedZero, initialInBad })),
        baseline.obligations.map(({ id, kind, sceneId, choiceId, seedZero, initialInBad }) => ({ id, kind, sceneId, choiceId, seedZero, initialInBad })),
      );
    });
    }
  }
}

test("choice copying validates and snapshots its opt-in threshold", () => {
  for (const value of [-1, 0.5, NaN, Infinity, "1", null]) {
    assert.throws(() => proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }), {
      obligationChoiceCompactAt: value as number,
    }), /obligationChoiceCompactAt must be a non-negative safe integer/);
  }
  let reads = 0;
  const result = proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }), {
    roundLimit: 32,
    get obligationChoiceCompactAt() { reads++; return 1; },
  });
  assert.equal(reads, 1);
  assert.equal(result.initialInBad, false);
  const baseline = proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }));
  const disabled = proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }), { obligationChoiceCompactAt: 0 });
  assert.deepEqual(disabled.obligations, baseline.obligations);
  assert.equal(disabled.completable, baseline.completable);
  assert.equal(disabled.completionRounds, baseline.completionRounds);
});

test("choice copying rejects an incompatible later owner", () => {
  let copies = 0;
  class DriftingModel extends SymbolicModel {
    override fresh(): SymbolicModel {
      copies++;
      return copies === 1
        ? new DriftingModel(SCENARIO, { token: 1 }, { order: "interleaved" })
        : new SymbolicModel(SCENARIO, { token: 1 }, { order: "blocked" });
    }
  }
  assert.throws(() => proveCompletionSafetyByObligation(new DriftingModel(SCENARIO, { token: 1 }), {
    roundLimit: 32,
    obligationChoiceCompactAt: 1,
  }), /Fresh symbolic model .*not match/);
  assert.ok(copies >= 2, "the incompatible handoff occurs after the initial copy");
});

test("choice allocation intervals validate, snapshot, and preserve the disabled default", () => {
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1", null]) {
    assert.throws(() => proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }), {
      obligationChoiceCompactAt: 1,
      obligationChoiceCompactInterval: value as number,
    }), /obligationChoiceCompactInterval must be a non-negative safe integer/);
  }
  assert.throws(() => proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }), {
    obligationChoiceCompactInterval: 1,
  }), /obligationChoiceCompactInterval requires obligationChoiceCompactAt > 0/);
  let reads = 0;
  const interval = proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }), {
    roundLimit: 32,
    obligationChoiceCompactAt: 1,
    get obligationChoiceCompactInterval() { reads++; return Number.MAX_SAFE_INTEGER; },
  });
  assert.equal(reads, 1);
  assert.equal(interval.initialInBad, false);
  assert.ok(interval.obligations.every(obligation => obligation.compactions === 0));
  const baseline = proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }));
  const disabled = proveCompletionSafetyByObligation(new SymbolicModel(SCENARIO, { token: 1 }), {
    obligationChoiceCompactInterval: 0,
  });
  assert.deepEqual(disabled.obligations, baseline.obligations);
  assert.equal(disabled.completable, baseline.completable);
  assert.equal(disabled.completionRounds, baseline.completionRounds);
});
