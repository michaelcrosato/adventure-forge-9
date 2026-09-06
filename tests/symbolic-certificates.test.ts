import assert from "node:assert/strict";
import test from "node:test";
import {
  certificateDescriptor,
  type SymbolicCertificate,
  type SymbolicModelDescriptor,
  verifySymbolicCertificate,
} from "../src/verification/symbolic-certificates.js";
import { type BddForest } from "../src/verification/bdd.js";
import { validateScenario, type Scenario } from "../src/engine/content.js";
import { SymbolicModel } from "../src/verification/symbolic-model.js";
import { proveCompletionSafetyByObligation } from "../src/verification/symbolic-obligations.js";

const FAILURE_CHAIN = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The route starts safely." }] },
    { id: "hidden", title: "Hidden", text: [{ text: "The hidden approach leads onward." }] },
    { id: "middle", title: "Middle", text: [{ text: "The middle route can fail." }] },
  ],
  choices: [
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the start",
      description: "Finish the safe starting route.",
      effects: [],
      outcome: { status: "completed", summary: "The safe route is complete." },
    },
    {
      id: "enter-middle",
      scene: "hidden",
      label: "Enter the middle route",
      description: "Set the tank and enter the middle route.",
      effects: [
        { type: "setResource", resource: "stock", value: 1 },
        { type: "goTo", scene: "middle" },
      ],
    },
    {
      id: "prime-middle",
      scene: "middle",
      label: "Prime the tank",
      description: "Restore the tank before the final operation.",
      when: [{ type: "resourceAtMost", resource: "stock", value: 0 }],
      effects: [
        { type: "setResource", resource: "stock", value: 1 },
        { type: "goTo", scene: "middle" },
      ],
    },
    {
      id: "fail-middle",
      scene: "middle",
      label: "Force the bad operation",
      description: "Add one unit to the full tank.",
      when: [{ type: "resourceAtLeast", resource: "stock", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "stock", delta: 1 },
        { type: "goTo", scene: "middle" },
      ],
    },
  ],
} as const;

const REACHABLE_TRAP = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 0 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "Two paths leave the start." }] },
    { id: "safe", title: "Safe", text: [{ text: "The safe landing is open." }] },
    { id: "trap", title: "Trap", text: [{ text: "The dry trap has no open exit." }] },
  ],
  choices: [
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the start",
      description: "Finish the route here.",
      effects: [],
      outcome: { status: "completed", summary: "The starting route is complete." },
    },
    {
      id: "enter-safe",
      scene: "start",
      label: "Take the safe path",
      description: "Walk to the safe landing.",
      effects: [{ type: "goTo", scene: "safe" }],
    },
    {
      id: "finish-safe",
      scene: "safe",
      label: "Finish safely",
      description: "Complete the safe landing.",
      effects: [],
      outcome: { status: "completed", summary: "The safe landing is complete." },
    },
    {
      id: "enter-trap",
      scene: "start",
      label: "Enter the trap",
      description: "Take the path into the dry trap.",
      effects: [{ type: "goTo", scene: "trap" }],
    },
    {
      id: "blocked-escape",
      scene: "trap",
      label: "Use the water exit",
      description: "Leave the trap when water is available.",
      when: [{ type: "resourceAtLeast", resource: "water", value: 1 }],
      effects: [{ type: "goTo", scene: "safe" }],
    },
  ],
} as const;

type ForestTable = Map<string, BddForest>;

function modelFor(raw: unknown, bounds: Readonly<Record<string, number>>): SymbolicModel {
  return new SymbolicModel(raw, bounds, { nodeLimit: 25_000, cacheLimit: 5_000 });
}

function certificateFor(
  model: SymbolicModel,
  failureForest: BddForest,
  sceneRoots: Readonly<Record<string, number>>,
): { readonly certificate: SymbolicCertificate; readonly forests: ForestTable } {
  const forests: ForestTable = new Map([["failure", failureForest]]);
  const sceneForests = model.scenario.scenes.map(scene => {
    const forestId = `scene:${scene.id}`;
    forests.set(forestId, model.bdd.exportForest([sceneRoots[scene.id] ?? 0]));
    return Object.freeze({ sceneId: scene.id, forestId });
  });
  return Object.freeze({
    certificate: Object.freeze({
      schema: "af9-symbolic-certificate-v1",
      descriptor: certificateDescriptor(model),
      failureForestId: "failure",
      sceneForests: Object.freeze(sceneForests),
    }),
    forests,
  });
}

function captureFailureForests(model: SymbolicModel): { readonly closure: BddForest; readonly seed: BddForest } {
  let closure: BddForest | undefined;
  let seed: BddForest | undefined;
  proveCompletionSafetyByObligation(model, {
    roundLimit: 64,
    failurePartition: "combined",
    onObligation: payload => {
      if (payload.summary.kind !== "failure-union") return;
      closure = payload.model.bdd.exportForest([payload.bad]);
      seed = payload.model.bdd.exportForest([payload.seed]);
    },
  });
  assert.ok(closure !== undefined, "the fixture has a failure-union obligation");
  assert.ok(seed !== undefined, "the fixture has a failure-union seed");
  return { closure: closure!, seed: seed! };
}

function withLoader(forests: ForestTable): (id: string) => unknown {
  return id => forests.get(id);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("verifies a fresh C, regenerated four-kind seeds, and a two-step failure cone", () => {
  const model = modelFor(FAILURE_CHAIN, { stock: 1 });
  const generated = captureFailureForests(model);
  const prepared = certificateFor(model, generated.closure, {
    start: 0,
    hidden: 0,
    middle: 0,
  });
  const progress: Array<{ readonly phase: string; readonly id?: string; readonly fixed?: boolean }> = [];
  const result = verifySymbolicCertificate(model, prepared.certificate, withLoader(prepared.forests), {
    roundLimit: 64,
    completionCompactEvery: 1,
    onProgress: event => progress.push(event),
  });

  assert.equal(result.complete, true);
  assert.notStrictEqual(result.model, model, "the returned completion root has an explicit fresh owner");
  assert.equal(result.model.bdd.exists(result.completable, result.model.nextVariables), result.completable);
  assert.deepEqual(result.sceneIds, ["start", "hidden", "middle"]);
  assert.equal(result.checkedSceneForests, 3);
  assert.equal(result.checkedFailureForest, true);
  assert.equal(result.failureSeeds.length, model.choices.length * 4);
  assert.deepEqual(
    result.failureSeeds.map(seed => seed.id),
    model.choices.flatMap(choice => [
      `arithmetic-error:${choice.id}`,
      `bound-exit:${choice.id}`,
      `invalid-success:${choice.id}`,
      `uncovered-enabled:${choice.id}`,
    ]),
  );
  assert.equal(result.failureSeeds.some(seed => seed.id === "bound-exit:fail-middle" && !seed.seedZero), true);
  assert.ok(progress.some(event => event.phase === "completion" && event.fixed === true));
  assert.equal(progress.filter(event => event.phase === "failure").length, 1);
  assert.equal(progress.filter(event => event.phase === "scene").length, 3);
});

test("rejects a reachable bad cycle and a raw failure seed without predecessor closure", () => {
  const chainModel = modelFor(FAILURE_CHAIN, { stock: 1 });
  const generated = captureFailureForests(chainModel);
  const rawSeedCertificate = certificateFor(chainModel, generated.seed, {
    start: 0,
    hidden: 0,
    middle: 0,
  });
  assert.throws(
    () => verifySymbolicCertificate(chainModel, rawSeedCertificate.certificate, withLoader(rawSeedCertificate.forests), { roundLimit: 64 }),
    /predecessor-closed/i,
  );

  const trapModel = modelFor(REACHABLE_TRAP, { water: 1 });
  const trap = trapModel.bdd.and(trapModel.atScene("trap"), trapModel.playing);
  const trapCertificate = certificateFor(trapModel, trapModel.bdd.exportForest([0]), {
    start: 0,
    safe: 0,
    trap,
  });
  assert.throws(
    () => verifySymbolicCertificate(trapModel, trapCertificate.certificate, withLoader(trapCertificate.forests), { roundLimit: 64 }),
    /predecessor-closed/i,
    "a reachable predecessor of the trap must invalidate the cone",
  );
});

test("requires the exact scene catalog and every freshly regenerated failure seed", () => {
  const model = modelFor(FAILURE_CHAIN, { stock: 1 });
  const generated = captureFailureForests(model);
  const missingScene = certificateFor(model, generated.closure, { start: 0, hidden: 0 });
  const missingSceneCertificate: SymbolicCertificate = {
    ...missingScene.certificate,
    sceneForests: missingScene.certificate.sceneForests.slice(0, 2),
  };
  assert.throws(
    () => verifySymbolicCertificate(model, missingSceneCertificate, withLoader(missingScene.forests)),
    /exactly 3 authored scenes/i,
  );

  const missingSeed = certificateFor(model, model.bdd.exportForest([0]), {
    start: 0,
    hidden: 0,
    middle: 0,
  });
  assert.throws(
    () => verifySymbolicCertificate(model, missingSeed.certificate, withLoader(missingSeed.forests)),
    /failure seed bound-exit:fail-middle/i,
  );
});

test("fails closed for tampered, next-phase, and out-of-domain forests", () => {
  const model = modelFor(FAILURE_CHAIN, { stock: 1 });
  const generated = captureFailureForests(model);
  const valid = certificateFor(model, generated.closure, { start: 0, hidden: 0, middle: 0 });

  const tampered = new Map(valid.forests);
  const malformed = clone(generated.closure) as unknown as { roots: number[]; nodes: readonly (readonly [number, number, number])[] };
  malformed.roots = [malformed.nodes.length + 2];
  tampered.set("failure", malformed as unknown as BddForest);
  assert.throws(
    () => verifySymbolicCertificate(model, valid.certificate, withLoader(tampered)),
    /failure forest.*root|wire|valid/i,
  );

  const next = model.bdd.variable(model.nextVariables[0]!);
  const nextCertificate = certificateFor(model, generated.closure, { start: next, hidden: 0, middle: 0 });
  assert.throws(
    () => verifySymbolicCertificate(model, nextCertificate.certificate, withLoader(nextCertificate.forests)),
    /current-only/i,
  );

  const invalidCertificate = certificateFor(model, generated.closure, { start: 1, hidden: 0, middle: 0 });
  assert.throws(
    () => verifySymbolicCertificate(model, invalidCertificate.certificate, withLoader(invalidCertificate.forests)),
    /validDomain|superset/i,
  );
});

test("binds wire forests to the descriptor and rejects foreign numeric handles", () => {
  const model = modelFor(FAILURE_CHAIN, { stock: 1 });
  const generated = captureFailureForests(model);
  const prepared = certificateFor(model, generated.closure, { start: 0, hidden: 0, middle: 0 });
  const foreign = {
    schema: "af9-bdd-forest-v1",
    variableCount: prepared.certificate.descriptor.variableCount,
    roots: [model.initial],
    nodes: [],
  };
  const foreignTable = new Map(prepared.forests);
  foreignTable.set("failure", foreign as unknown as BddForest);
  assert.throws(
    () => verifySymbolicCertificate(model, prepared.certificate, withLoader(foreignTable)),
    /failure forest.*root|wire|valid/i,
  );

  const shiftedModel = modelFor(FAILURE_CHAIN, { stock: 2 });
  assert.notDeepEqual(
    certificateDescriptor(model).anchors,
    certificateDescriptor(shiftedModel).anchors,
    "the anchor domain distinguishes resource bounds with the same field strategy",
  );
  assert.throws(
    () => verifySymbolicCertificate(shiftedModel, prepared.certificate, withLoader(prepared.forests)),
    /descriptor/i,
  );
});

test("descriptor is stable across a fresh owner and records the full strategy", () => {
  const model = modelFor(validateScenario(FAILURE_CHAIN), { stock: 1 });
  const fresh = model.fresh();
  const descriptor = certificateDescriptor(model);
  const freshDescriptor: SymbolicModelDescriptor = certificateDescriptor(fresh);
  assert.deepEqual(freshDescriptor, descriptor);
  assert.equal(descriptor.strategy.transitionMode, "relational");
  assert.equal(descriptor.strategy.order, "interleaved");
  assert.deepEqual(descriptor.fieldOrder, ["scene", "status", "ending", "resource:stock"]);
  assert.deepEqual(descriptor.currentVariables, fresh.currentVariables);
  assert.deepEqual(descriptor.nextVariables, fresh.nextVariables);
  assert.equal(Object.isFrozen(descriptor.anchors), true);
});
