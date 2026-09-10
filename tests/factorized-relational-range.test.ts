import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ChoiceData, ScenarioData } from "../src/content/scenario.js";
import {
  verifyFactorizedComponent,
  type FactorizedCertificateProgress,
} from "../src/verification/symbolic-factorized-certificates.js";
import {
  SymbolicModel,
  type SemanticState,
  type SymbolicChoice,
  type SymbolicOptions,
} from "../src/verification/symbolic-model.js";

const BOUND = 2;

const RAW: ScenarioData = {
  version: 1,
  initialScene: "start",
  initialResources: { charge: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "A small start." }] },
    { id: "loop", title: "Loop", text: [{ text: "A repeating chamber." }] },
    { id: "end", title: "End", text: [{ text: "A quiet end." }] },
    { id: "dead", title: "Dead", text: [{ text: "An unreachable room." }] },
  ],
  choices: [
    {
      id: "start-hop",
      scene: "start",
      label: "Enter the loop",
      description: "Write a flag and hop to the loop.",
      effects: [
        { type: "setFlag", flag: "armed", value: true },
        { type: "setFlag", flag: "ghost", value: false },
        { type: "goTo", scene: "loop" },
      ],
    },
    {
      id: "zero-relation",
      scene: "start",
      label: "Contradict yourself",
      description: "This choice can never be enabled.",
      when: [
        { type: "flag", flag: "ghost", value: true },
        { type: "flag", flag: "ghost", value: false },
      ],
      effects: [{ type: "goTo", scene: "loop" }],
    },
    {
      id: "loop-self",
      scene: "loop",
      label: "Spin",
      description: "Stay in the loop.",
      when: [{ type: "flag", flag: "armed", value: true }],
      effects: [{ type: "goTo", scene: "loop" }],
    },
    {
      id: "loop-reset",
      scene: "loop",
      label: "Reset the charge",
      description: "Adjust once, then reset the resource.",
      when: [
        { type: "flag", flag: "armed", value: true },
        { type: "resourceAtMost", resource: "charge", value: 1 },
      ],
      effects: [
        { type: "adjustResource", resource: "charge", delta: 1 },
        { type: "setResource", resource: "charge", value: 0 },
        { type: "setFlag", flag: "armed", value: false },
        { type: "goTo", scene: "loop" },
      ],
    },
    {
      id: "loop-end",
      scene: "loop",
      label: "Walk onward",
      description: "Hop to the end scene.",
      when: [{ type: "flag", flag: "armed", value: true }],
      effects: [
        { type: "setFlag", flag: "armed", value: false },
        { type: "goTo", scene: "end" },
      ],
    },
    {
      id: "loop-complete",
      scene: "loop",
      label: "Finish here",
      description: "Produce a terminal output.",
      when: [{ type: "flag", flag: "armed", value: true }],
      effects: [],
      outcome: { status: "completed", summary: "loop complete" },
    },
    {
      id: "intermediate-fault",
      scene: "loop",
      label: "Overload",
      description: "An intermediate arithmetic fault prevents the hop.",
      when: [{ type: "resourceAtLeast", resource: "charge", value: 1 }],
      effects: [
        { type: "setFlag", flag: "armed", value: false },
        { type: "adjustResource", resource: "charge", delta: Number.MAX_SAFE_INTEGER },
        { type: "goTo", scene: "dead" },
      ],
    },
    {
      id: "end-complete",
      scene: "end",
      label: "Finish the path",
      description: "Complete at the terminal scene.",
      effects: [],
      outcome: { status: "completed", summary: "end complete" },
    },
    {
      id: "dead-self",
      scene: "dead",
      label: "Remain lost",
      description: "Stay in the unreachable room.",
      effects: [{ type: "goTo", scene: "dead" }],
    },
  ],
};

interface PlayingState {
  readonly scene: string;
  readonly charge: number;
  readonly armed: boolean;
  readonly ghost: boolean;
}

interface SuccessEdge {
  readonly source: PlayingState;
  readonly output: SemanticState;
}

interface FaultEdge {
  readonly source: PlayingState;
  readonly reason: "arithmetic-error" | "bound-exit";
}

type Interpreted = { readonly success: SuccessEdge } | { readonly fault: FaultEdge } | undefined;

function playingStates(): readonly PlayingState[] {
  const result: PlayingState[] = [];
  for (const scene of RAW.scenes) {
    for (let charge = 0; charge <= BOUND; charge += 1) {
      for (const armed of [false, true]) {
        for (const ghost of [false, true]) result.push({ scene: scene.id, charge, armed, ghost });
      }
    }
  }
  return result;
}

function semantic(state: PlayingState, status: "playing" | "completed" = "playing", ending = 0): SemanticState {
  return {
    scene: state.scene,
    status,
    ending,
    resources: { charge: state.charge },
    flags: { armed: state.armed, ghost: state.ghost },
  };
}

function key(state: SemanticState): string {
  return [
    state.scene,
    state.status,
    state.ending,
    state.resources.charge,
    state.flags.armed ? 1 : 0,
    state.flags.ghost ? 1 : 0,
  ].join("|");
}

function conditionMatches(choice: ChoiceData, state: PlayingState): boolean {
  if (state.scene !== choice.scene) return false;
  return (choice.when ?? []).every((condition) => {
    if (condition.type === "flag") return (condition.flag === "armed" ? state.armed : state.ghost) === condition.value;
    if (condition.type === "resourceAtLeast") return state.charge >= condition.value;
    return state.charge <= condition.value;
  });
}

function interpret(choice: ChoiceData, source: PlayingState): Interpreted {
  if (!conditionMatches(choice, source)) return undefined;
  let scene = source.scene;
  let charge = source.charge;
  let armed = source.armed;
  let ghost = source.ghost;
  for (const effect of choice.effects) {
    if (effect.type === "setFlag") {
      if (effect.flag === "armed") armed = effect.value;
      else ghost = effect.value;
    } else if (effect.type === "setResource") {
      charge = effect.value;
    } else if (effect.type === "adjustResource") {
      const next = charge + effect.delta;
      if (!Number.isSafeInteger(next) || next < 0) {
        return { fault: { source, reason: "arithmetic-error" } };
      }
      if (next > BOUND) return { fault: { source, reason: "bound-exit" } };
      charge = next;
    } else if (effect.type === "goTo") {
      scene = effect.scene;
    }
  }
  const after = { scene, charge, armed, ghost };
  if (choice.outcome !== undefined) {
    const ending = choice.outcome.summary === "loop complete" ? 1 : 2;
    return { success: { source, output: semantic(after, "completed", ending) } };
  }
  return { success: { source, output: semantic(after) } };
}

function edgesFor(choice: ChoiceData): readonly SuccessEdge[] {
  return playingStates().flatMap((source) => {
    const result = interpret(choice, source);
    return result === undefined || !("success" in result) ? [] : [result.success];
  });
}

function faultsFor(choice: ChoiceData): readonly FaultEdge[] {
  return playingStates().flatMap((source) => {
    const result = interpret(choice, source);
    return result === undefined || !("fault" in result) ? [] : [result.fault];
  });
}

function rootForStates(model: SymbolicModel, states: readonly SemanticState[]): number {
  return states.reduce((root, state) => model.bdd.or(root, model.encode(state)), 0);
}

function expectedPreimage(model: SymbolicModel, edges: readonly SuccessEdge[], targets: ReadonlySet<string>): number {
  return rootForStates(model, edges.filter((edge) => targets.has(key(edge.output))).map((edge) => semantic(edge.source)));
}

function rangeFor(model: SymbolicModel, choice: SymbolicChoice): number {
  const nextRange = model.bdd.exists(choice.relation, model.currentVariables);
  const toCurrent = new Map(model.nextVariables.map((variable, index) => [variable, model.currentVariables[index]!]));
  return model.bdd.rename(nextRange, toCurrent);
}

function assertSameRoot(model: SymbolicModel, actual: number, expected: number, label: string): void {
  assert.equal(model.bdd.xor(actual, expected), 0, label);
}

const CUSTOM_FIELD_ORDER = ["flag:ghost", "ending", "resource:charge", "scene", "flag:armed", "status"] as const;

function modelOptions(order: "interleaved" | "blocked", custom: boolean): SymbolicOptions {
  return {
    order,
    ...(custom ? { fieldOrder: CUSTOM_FIELD_ORDER } : {}),
    transitionMode: "relational",
    nodeLimit: 100_000,
    cacheLimit: 1,
  };
}

test("raw relational ranges preserve exact predecessor truth tables across layouts", () => {
  const allPlaying = playingStates().map((state) => semantic(state));
  const allCompleted = playingStates().flatMap((state) => [semantic(state, "completed", 1), semantic(state, "completed", 2)]);
  const targets = [...allPlaying, ...allCompleted];
  const choices = RAW.choices;

  for (const order of ["interleaved", "blocked"] as const) {
    for (const custom of [false, true]) {
      const model = new SymbolicModel(RAW, { charge: BOUND }, modelOptions(order, custom));
      assertSameRoot(model, model.playing, rootForStates(model, allPlaying), `${order}/${custom}: playing table`);
      for (const rawChoice of choices) {
        const choice = model.choices.find((candidate) => candidate.id === rawChoice.id)!;
        const edges = edgesFor(rawChoice);
        const range = rangeFor(model, choice);
        const rawRange = rootForStates(model, edges.map((edge) => edge.output));
        assertSameRoot(model, range, rawRange, `${order}/${custom}/${choice.id}: output range`);
        if (choice.id === "zero-relation" || choice.id === "intermediate-fault") {
          assert.equal(choice.relation, 0, `${order}/${custom}/${choice.id}: successful relation is empty`);
        }
        if (choice.id === "intermediate-fault") {
          assert.ok(faultsFor(rawChoice).some((fault) => fault.reason === "arithmetic-error"), "raw interpreter sees intermediate arithmetic fault");
          assert.equal(edges.length, 0, "faulting effect prevents the later goTo");
        }
        if (choice.id === "loop-reset") {
          assert.ok(edges.some((edge) => edge.source.charge === 1 && edge.output.resources.charge === 0), "raw reset follows adjustment");
        }

        const offRange = targets.find((target) => !edges.some((edge) => key(edge.output) === key(target)))!;
        const mixedTargetStates = [...edges.map((edge) => edge.output), offRange];
        const mixedTarget = rootForStates(model, mixedTargetStates);
        const targetSets = [
          new Set([key(offRange)]),
          new Set(mixedTargetStates.map(key)),
          new Set(targets.map(key)),
        ];
        for (const targetKeys of targetSets) {
          const target = rootForStates(model, targets.filter((candidate) => targetKeys.has(key(candidate))));
          const full = model.preimage(target, choice);
          const restricted = model.preimage(model.bdd.and(target, range), choice);
          assertSameRoot(model, full, restricted, `${order}/${custom}/${choice.id}: restricted predecessor`);
          assertSameRoot(model, full, expectedPreimage(model, edges, targetKeys), `${order}/${custom}/${choice.id}: raw predecessor`);
        }
        assertSameRoot(model, model.preimage(mixedTarget, choice), model.preimage(model.bdd.and(mixedTarget, range), choice), `${order}/${custom}/${choice.id}: mixed range restriction`);
      }
    }
  }
});

interface TraceEntry {
  readonly owner: TracingModel;
  readonly choiceId: string;
  readonly target: number;
  readonly range: number;
}

class TracingModel extends SymbolicModel {
  readonly trace: TraceEntry[];
  private readonly boundsSnapshot: Readonly<Record<string, number>>;
  private readonly optionsSnapshot: SymbolicOptions;

  constructor(input: unknown, bounds: Readonly<Record<string, number>>, options: SymbolicOptions, trace: TraceEntry[] = []) {
    super(input, bounds, options);
    this.trace = trace;
    this.boundsSnapshot = Object.freeze({ ...bounds });
    this.optionsSnapshot = Object.freeze({
      ...options,
      ...(options.fieldOrder === undefined ? {} : { fieldOrder: Object.freeze([...options.fieldOrder]) }),
    });
  }

  override fresh(): SymbolicModel {
    return new TracingModel(this.scenario, this.boundsSnapshot, this.optionsSnapshot, this.trace);
  }

  override preimage(target: number, choice?: SymbolicChoice): number {
    if (choice !== undefined) {
      const nextRange = this.bdd.exists(choice.relation, this.currentVariables);
      const toCurrent = new Map(this.nextVariables.map((variable, index) => [variable, this.currentVariables[index]!]));
      this.trace.push({ owner: this, choiceId: choice.id, target, range: this.bdd.rename(nextRange, toCurrent) });
    }
    return super.preimage(target, choice);
  }
}

function deadCone(model: SymbolicModel): number {
  return model.bdd.and(model.playing, model.atScene("dead"));
}

function endCone(model: SymbolicModel): number {
  return model.bdd.and(model.playing, model.atScene("end"));
}

function verifyCone(
  model: SymbolicModel,
  seed: number,
  coneCompactAt: number | undefined,
  label: string,
  onProgress?: (progress: FactorizedCertificateProgress) => void,
): { readonly model: SymbolicModel; readonly root: number } {
  const forest = model.bdd.exportForest([seed]);
  return verifyFactorizedComponent(model, seed, forest, { label, coneCompactAt, onProgress });
}

test("raw unreachable cone is accepted and nonclosed cone is rejected with range-contained calls", () => {
  const options = modelOptions("blocked", true);
  const rawDead = playingStates().filter((state) => state.scene === "dead").map((state) => semantic(state));
  const rawEnd = playingStates().filter((state) => state.scene === "end").map((state) => semantic(state));
  for (const rawChoice of RAW.choices) {
    for (const edge of edgesFor(rawChoice)) {
      if (edge.output.status === "playing" && edge.output.scene === "dead") {
        assert.equal(edge.source.scene, "dead", `${rawChoice.id}: raw dead cone is backward-closed`);
      }
    }
  }

  const traced = new TracingModel(RAW, { charge: BOUND }, options);
  const deadSeed = rootForStates(traced, rawDead);
  const progress: FactorizedCertificateProgress[] = [];
  const accepted = verifyCone(traced, deadSeed, 1, "raw dead compact", (event) => progress.push(event));
  assert.ok(progress.some((event) => event.phase === "cone-compact"), "forced compaction occurred");
  assert.ok(traced.trace.length >= RAW.choices.length, "verifier used the checked fresh owner for each choice");
  for (const call of traced.trace) {
    assert.equal(call.owner.bdd.and(call.target, call.owner.bdd.not(call.range)), 0, `${call.choiceId}: verifier target was range-contained`);
  }
  assertSameRoot(accepted.model, accepted.root, deadCone(accepted.model), "accepted raw dead cone");

  const unforced = new SymbolicModel(RAW, { charge: BOUND }, options);
  const unforcedSeed = deadCone(unforced);
  verifyCone(unforced, unforcedSeed, 0, "raw dead no compact");

  const rejectedWithoutCompaction = new SymbolicModel(RAW, { charge: BOUND }, options);
  assert.throws(
    () => verifyCone(rejectedWithoutCompaction, endCone(rejectedWithoutCompaction), 0, "raw end nonclosed"),
    /predecessor-closed/,
  );
  const rejectedWithCompaction = new SymbolicModel(RAW, { charge: BOUND }, options);
  assert.throws(
    () => verifyCone(rejectedWithCompaction, endCone(rejectedWithCompaction), 1, "raw end nonclosed compact"),
    /predecessor-closed/,
  );
});
