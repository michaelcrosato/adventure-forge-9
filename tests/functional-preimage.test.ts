import assert from "node:assert/strict";
import test from "node:test";
import { FunctionalGeneratorModel } from "../src/tooling/generate-certificates.js";
import {
  SymbolicModel,
  type SemanticState,
  type SymbolicChoice,
  type SymbolicOptions,
} from "../src/verification/symbolic-model.js";
import { proveCompletionSafetyByObligation } from "../src/verification/symbolic-obligations.js";

type TerminalStatus = "completed" | "departed" | "dead";

type RawCondition =
  | { readonly type: "flag"; readonly flag: string; readonly value: boolean }
  | { readonly type: "resourceAtLeast" | "resourceAtMost"; readonly resource: string; readonly value: number };

type RawEffect =
  | { readonly type: "setFlag"; readonly flag: string; readonly value: boolean }
  | { readonly type: "setResource"; readonly resource: string; readonly value: number }
  | { readonly type: "adjustResource"; readonly resource: string; readonly delta: number }
  | { readonly type: "advanceClock"; readonly clock: string; readonly delta: number }
  | { readonly type: "goTo"; readonly scene: string };

interface RawChoice {
  readonly id: string;
  readonly scene: string;
  readonly label: string;
  readonly description: string;
  readonly when?: readonly RawCondition[];
  readonly effects: readonly RawEffect[];
  readonly outcome?: { readonly status: TerminalStatus; readonly summary: string };
}

interface RawScenario {
  readonly version: 1;
  readonly initialScene: string;
  readonly initialResources: Readonly<Record<string, number>>;
  readonly initialFacts: readonly string[];
  readonly clocks: readonly { readonly id: string; readonly resource: string; readonly max: number }[];
  readonly scenes: readonly {
    readonly id: string;
    readonly title: string;
    readonly text: readonly { readonly text: string }[];
  }[];
  readonly choices: readonly RawChoice[];
}

const BOUNDS = Object.freeze({ energy: 2, tide: 2 });
const FIELD_ORDER = [
  "scene",
  "status",
  "ending",
  "resource:energy",
  "resource:tide",
  "flag:ready",
  "flag:sealed",
] as const;

const RAW_SCENARIO = {
  version: 1,
  initialScene: "start",
  initialResources: { energy: 1, tide: 0 },
  initialFacts: [],
  clocks: [{ id: "phase", resource: "tide", max: 2 }],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The route begins." }] },
    { id: "hub", title: "Hub", text: [{ text: "The route can be settled." }] },
  ],
  choices: [
    {
      id: "enter-hub",
      scene: "start",
      label: "Enter the hub",
      description: "Walk into the working hub.",
      effects: [{ type: "goTo", scene: "hub" }],
    },
    {
      id: "prime-hub",
      scene: "start",
      label: "Prime the hub",
      description: "Fill the reserve and arm the route.",
      when: [{ type: "resourceAtLeast", resource: "energy", value: 1 }],
      effects: [
        { type: "setResource", resource: "energy", value: 2 },
        { type: "setFlag", flag: "ready", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "settle-hub",
      scene: "hub",
      label: "Settle the hub",
      description: "Spend energy, overwrite the marker, saturate the phase, and return to the hub.",
      when: [
        { type: "flag", flag: "ready", value: true },
        { type: "resourceAtLeast", resource: "energy", value: 1 },
      ],
      effects: [
        { type: "adjustResource", resource: "energy", delta: -1 },
        { type: "setFlag", flag: "ready", value: true },
        { type: "setFlag", flag: "ready", value: false },
        { type: "advanceClock", clock: "phase", delta: 5 },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "underflow-recovery",
      scene: "hub",
      label: "Try the underflow recovery",
      description: "Subtract and restore energy; the intermediate value must remain bounded.",
      when: [{ type: "resourceAtLeast", resource: "energy", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "energy", delta: -1 },
        { type: "adjustResource", resource: "energy", delta: 1 },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "overflow-recovery",
      scene: "hub",
      label: "Try the overflow recovery",
      description: "Add and restore energy; the intermediate value must remain bounded.",
      effects: [
        { type: "adjustResource", resource: "energy", delta: 1 },
        { type: "adjustResource", resource: "energy", delta: -1 },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "complete-sealed",
      scene: "hub",
      label: "Complete with the seal",
      description: "Record the sealed completion receipt.",
      when: [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtLeast", resource: "tide", value: 2 },
      ],
      effects: [{ type: "setFlag", flag: "sealed", value: true }],
      outcome: { status: "completed", summary: "The hub is sealed." },
    },
    {
      id: "complete-open",
      scene: "hub",
      label: "Complete without the seal",
      description: "Record the open completion receipt.",
      when: [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtLeast", resource: "tide", value: 2 },
      ],
      effects: [{ type: "setFlag", flag: "sealed", value: false }],
      outcome: { status: "completed", summary: "The hub remains open." },
    },
    {
      id: "depart-hub",
      scene: "hub",
      label: "Depart before the phase",
      description: "Leave while the phase is not yet saturated.",
      when: [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtMost", resource: "tide", value: 1 },
      ],
      effects: [],
      outcome: { status: "departed", summary: "The hub is left behind." },
    },
  ],
} as const satisfies RawScenario;

interface MutableState {
  scene: string;
  status: SemanticState["status"];
  ending: number;
  resources: Record<string, number>;
  flags: Record<string, boolean>;
}

interface Edge {
  readonly choiceId: string;
  readonly source: SemanticState;
  readonly target: SemanticState;
}

const ENDING_BY_CHOICE = new Map<string, number>();
let nextEnding = 0;
for (const choice of RAW_SCENARIO.choices) {
  if ("outcome" in choice && choice.outcome !== undefined) ENDING_BY_CHOICE.set(choice.id, ++nextEnding);
}

function semanticState(
  scene: string,
  energy: number,
  tide: number,
  ready: boolean,
  sealed: boolean,
  status: SemanticState["status"] = "playing",
  ending = 0,
): SemanticState {
  return {
    scene,
    status,
    ending,
    resources: { energy, tide },
    flags: { ready, sealed },
  };
}

function mutableState(source: SemanticState): MutableState {
  return {
    scene: source.scene,
    status: source.status,
    ending: source.ending,
    resources: { ...source.resources },
    flags: { ...source.flags },
  };
}

function immutableState(source: MutableState): SemanticState {
  return {
    scene: source.scene,
    status: source.status,
    ending: source.ending,
    resources: { ...source.resources },
    flags: { ...source.flags },
  };
}

function stateKey(state: SemanticState): string {
  return JSON.stringify([
    state.scene,
    state.status,
    state.ending,
    state.resources["energy"],
    state.resources["tide"],
    state.flags["ready"],
    state.flags["sealed"],
  ]);
}

function allPlayingStates(): readonly SemanticState[] {
  const states: SemanticState[] = [];
  for (const scene of RAW_SCENARIO.scenes.map(value => value.id)) {
    for (let energy = 0; energy <= BOUNDS.energy; energy += 1) {
      for (let tide = 0; tide <= BOUNDS.tide; tide += 1) {
        for (const ready of [false, true]) {
          for (const sealed of [false, true]) {
            states.push(semanticState(scene, energy, tide, ready, sealed));
          }
        }
      }
    }
  }
  return Object.freeze(states);
}

const PLAYING_STATES = allPlayingStates();

function uniqueStates(states: readonly SemanticState[]): readonly SemanticState[] {
  const unique = new Map<string, SemanticState>();
  for (const state of states) unique.set(stateKey(state), state);
  return Object.freeze([...unique.values()]);
}

function conditionHolds(condition: RawCondition, state: MutableState): boolean {
  if (condition.type === "flag") return state.flags[condition.flag] === condition.value;
  const value = state.resources[condition.resource];
  if (value === undefined) return false;
  return condition.type === "resourceAtLeast" ? value >= condition.value : value <= condition.value;
}

function applyChoice(source: SemanticState, choice: RawChoice): SemanticState | undefined {
  if (source.status !== "playing" || source.scene !== choice.scene) return undefined;
  const next = mutableState(source);
  if (!(choice.when ?? []).every(condition => conditionHolds(condition, next))) return undefined;

  for (const effect of choice.effects) {
    if (effect.type === "setFlag") {
      next.flags[effect.flag] = effect.value;
      continue;
    }
    if (effect.type === "setResource") {
      const maximum = BOUNDS[effect.resource as keyof typeof BOUNDS];
      if (maximum === undefined || effect.value < 0 || effect.value > maximum) return undefined;
      next.resources[effect.resource] = effect.value;
      continue;
    }
    if (effect.type === "adjustResource") {
      const current = next.resources[effect.resource];
      const maximum = BOUNDS[effect.resource as keyof typeof BOUNDS];
      if (current === undefined || maximum === undefined) return undefined;
      const value = current + effect.delta;
      if (!Number.isSafeInteger(value) || value < 0 || value > maximum) return undefined;
      next.resources[effect.resource] = value;
      continue;
    }
    if (effect.type === "advanceClock") {
      const clock = RAW_SCENARIO.clocks.find(candidate => candidate.id === effect.clock);
      if (clock === undefined) return undefined;
      const current = next.resources[clock.resource];
      if (current === undefined) return undefined;
      next.resources[clock.resource] = Math.min(clock.max, current + effect.delta);
      continue;
    }
    next.scene = effect.scene;
  }

  if (choice.outcome !== undefined) {
    const ending = ENDING_BY_CHOICE.get(choice.id);
    if (ending === undefined) return undefined;
    next.status = choice.outcome.status;
    next.ending = ending;
  }
  return immutableState(next);
}

function oracleEdges(choice: RawChoice): readonly Edge[] {
  const edges: Edge[] = [];
  for (const source of PLAYING_STATES) {
    const target = applyChoice(source, choice);
    if (target !== undefined) edges.push({ choiceId: choice.id, source, target });
  }
  return Object.freeze(edges);
}

function oracleEdgesFor(choiceId?: string): readonly Edge[] {
  const choices = choiceId === undefined
    ? RAW_SCENARIO.choices
    : RAW_SCENARIO.choices.filter(choice => choice.id === choiceId);
  return Object.freeze(choices.flatMap(choice => oracleEdges(choice)));
}

function choice(model: SymbolicModel, id: string): SymbolicChoice {
  const found = model.choices.find(candidate => candidate.id === id);
  assert.ok(found, `choice ${id} is present`);
  return found;
}

function union(model: SymbolicModel, states: readonly SemanticState[]): number {
  return uniqueStates(states).reduce((root, state) => model.bdd.or(root, model.encode(state)), 0);
}

function memberKeys(model: SymbolicModel, root: number, states: readonly SemanticState[]): readonly string[] {
  return states
    .filter(state => model.bdd.and(root, model.encode(state)) !== 0)
    .map(stateKey)
    .sort();
}

function assertPredecessors(
  model: SymbolicModel,
  root: number,
  expected: readonly SemanticState[],
  label: string,
): void {
  assert.deepEqual(memberKeys(model, root, PLAYING_STATES), [...new Set(expected.map(stateKey))].sort(), label);
}

function allModelOptions(order: "interleaved" | "blocked", customFields: boolean, transitionMode: SymbolicOptions["transitionMode"]): SymbolicOptions {
  return {
    order,
    transitionMode,
    fieldOrder: customFields ? [...FIELD_ORDER].reverse() : undefined,
    nodeLimit: 20_000,
    cacheLimit: 1,
  };
}

function modelFor(
  order: "interleaved" | "blocked",
  customFields: boolean,
  transitionMode: SymbolicOptions["transitionMode"],
): SymbolicModel {
  return new SymbolicModel(RAW_SCENARIO, BOUNDS, allModelOptions(order, customFields, transitionMode));
}

test("functional preimage matches the independent raw DSL oracle for singleton and set targets", () => {
  const choiceEdges = new Map(RAW_SCENARIO.choices.map(rawChoice => [rawChoice.id, oracleEdges(rawChoice)]));
  const allEdges = oracleEdgesFor();

  for (const order of ["interleaved", "blocked"] as const) {
    for (const customFields of [false, true]) {
      for (const transitionMode of ["relational", "partitioned"] as const) {
        const model = modelFor(order, customFields, transitionMode);
        const label = `${order}/${customFields ? "custom-fields" : "default-fields"}/${transitionMode}`;

        for (const rawChoice of RAW_SCENARIO.choices) {
          const edges = choiceEdges.get(rawChoice.id)!;
          const targetStates = uniqueStates(edges.map(edge => edge.target));
          const expectedSources = edges.map(edge => edge.source);
          const targetSet = union(model, targetStates);
          const functionalSet = model.functionalPreimage(targetSet, choice(model, rawChoice.id));
          const relationalSet = model.preimage(targetSet, choice(model, rawChoice.id));
          assertPredecessors(model, functionalSet, expectedSources, `${label}/${rawChoice.id} functional set preimage`);
          assertPredecessors(model, relationalSet, expectedSources, `${label}/${rawChoice.id} relational set preimage`);
          assert.deepEqual(
            memberKeys(model, functionalSet, PLAYING_STATES),
            memberKeys(model, relationalSet, PLAYING_STATES),
            `${label}/${rawChoice.id} functional and relational set preimages agree`,
          );

          if (targetStates.length === 0) continue;
          const singleton = targetStates[0]!;
          const singletonRoot = model.encode(singleton);
          const expectedSingletonSources = edges
            .filter(edge => stateKey(edge.target) === stateKey(singleton))
            .map(edge => edge.source);
          const functionalSingleton = model.functionalPreimage(singletonRoot, choice(model, rawChoice.id));
          const relationalSingleton = model.preimage(singletonRoot, choice(model, rawChoice.id));
          assertPredecessors(model, functionalSingleton, expectedSingletonSources, `${label}/${rawChoice.id} functional singleton preimage`);
          assertPredecessors(model, relationalSingleton, expectedSingletonSources, `${label}/${rawChoice.id} relational singleton preimage`);
        }

        const allTargets = uniqueStates(allEdges.map(edge => edge.target));
        const allTargetRoot = union(model, allTargets);
        const expectedAllSources = allEdges.map(edge => edge.source);
        const functionalAll = model.functionalPreimage(allTargetRoot);
        const relationalAll = model.preimage(allTargetRoot);
        assertPredecessors(model, functionalAll, expectedAllSources, `${label}/all-choice optional functional preimage`);
        assertPredecessors(model, relationalAll, expectedAllSources, `${label}/all-choice optional relational preimage`);
      }
    }
  }

  const settle = choiceEdges.get("settle-hub")!;
  const representative = settle.find(edge => edge.source.resources["energy"] === 1 && edge.source.resources["tide"] === 2 && edge.source.flags["ready"] === true)!;
  assert.equal(representative.target.scene, "hub", "the authored navigation effect determines the destination");
  assert.equal(representative.target.flags["ready"], false, "the last flag overwrite wins");
  assert.equal(representative.target.resources["tide"], 2, "the clock saturates at its maximum");

  const underflowEnergy = new Set(choiceEdges.get("underflow-recovery")!.map(edge => edge.source.resources["energy"]));
  const overflowEnergy = new Set(choiceEdges.get("overflow-recovery")!.map(edge => edge.source.resources["energy"]));
  assert.deepEqual([...underflowEnergy].sort(), [1, 2], "underflow recovery rejects an intermediate negative value");
  assert.deepEqual([...overflowEnergy].sort(), [0, 1], "overflow recovery rejects an intermediate over-bound value");

  const sealedTarget = choiceEdges.get("complete-sealed")!.find(edge => edge.target.ending === 1)!.target;
  const openTarget = choiceEdges.get("complete-open")!.find(edge => edge.target.ending === 2)!.target;
  assert.equal(sealedTarget.status, "completed");
  assert.equal(openTarget.status, "completed");
  assert.notEqual(sealedTarget.ending, openTarget.ending, "terminal receipts retain authored identity");
});

test("functional preimage preserves current-only and choice-owner validation", () => {
  const model = modelFor("blocked", true, "partitioned");
  const selected = choice(model, "enter-hub");
  const nextPredicate = model.bdd.variable(model.nextVariables[0]!);
  assert.throws(() => model.functionalPreimage(nextPredicate, selected), /current-only predicate/);
  assert.throws(() => model.functionalPreimage(nextPredicate), /current-only predicate/);

  const foreign = modelFor("interleaved", false, "relational");
  assert.throws(() => model.functionalPreimage(model.initial, choice(foreign, "enter-hub")), /different model/);
});

const GENERATOR_SCENARIO = {
  version: 1,
  initialScene: "start",
  initialResources: { token: 1 },
  initialFacts: [],
  clocks: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The safe route begins." }] },
    { id: "finish", title: "Finish", text: [{ text: "The safe route ends." }] },
    { id: "unreachable", title: "Unreachable loop", text: [{ text: "This loop has no route from the start." }] },
  ],
  choices: [
    {
      id: "enter-finish",
      scene: "start",
      label: "Enter the finish",
      description: "Take the safe route.",
      effects: [{ type: "goTo", scene: "finish" }],
    },
    {
      id: "complete-finish",
      scene: "finish",
      label: "Complete the route",
      description: "Close the safe route.",
      effects: [],
      outcome: { status: "completed", summary: "The safe route is complete." },
    },
    {
      id: "loop-unreachable",
      scene: "unreachable",
      label: "Remain in the unreachable loop",
      description: "This disconnected branch cannot complete.",
      effects: [{ type: "goTo", scene: "unreachable" }],
    },
  ],
} as const satisfies RawScenario;

function obligationSignature(
  result: ReturnType<typeof proveCompletionSafetyByObligation>,
  model: SymbolicModel,
): Readonly<Record<string, unknown>> {
  return {
    complete: result.complete,
    initialInBad: result.initialInBad,
    completionOrFailureRounds: result.completionOrFailureRounds,
    completableCount: model.bdd.count(result.completable, model.currentVariables).toString(),
    completionOrFailureCount: result.completionOrFailure === undefined
      ? undefined
      : model.bdd.count(result.completionOrFailure, model.currentVariables).toString(),
    obligations: result.obligations.map(summary => ({
      id: summary.id,
      kind: summary.kind,
      sceneId: summary.sceneId,
      choiceId: summary.choiceId,
      rounds: summary.rounds,
      seedZero: summary.seedZero,
      initialInBad: summary.initialInBad,
    })),
    failureSeeds: result.failureSeeds?.map(seed => ({
      id: seed.id,
      kind: seed.kind,
      choiceId: seed.choiceId,
      seedZero: seed.seedZero,
    })),
  };
}

test("FunctionalGeneratorModel fresh owners preserve options and match normal obligation results", () => {
  const options: SymbolicOptions = {
    order: "blocked",
    transitionMode: "partitioned",
    fieldOrder: ["scene", "status", "ending", "resource:token"],
    nodeLimit: 10_000,
    cacheLimit: 1,
  };
  const normal = new SymbolicModel(GENERATOR_SCENARIO, { token: 1 }, options);
  const generator = new FunctionalGeneratorModel(GENERATOR_SCENARIO, { token: 1 }, options);
  const fresh = generator.fresh();

  assert.ok(fresh instanceof FunctionalGeneratorModel);
  assert.notEqual(fresh, generator);
  assert.notEqual(fresh.bdd, generator.bdd);
  assert.deepEqual(fresh.scenario, generator.scenario);
  assert.deepEqual(fresh.fieldOrder, generator.fieldOrder);
  assert.deepEqual(fresh.currentVariables, generator.currentVariables);
  assert.deepEqual(fresh.nextVariables, generator.nextVariables);
  assert.equal(fresh.transitionMode, generator.transitionMode);
  assert.equal(
    fresh.bdd.count(fresh.validDomain, fresh.currentVariables),
    generator.bdd.count(generator.validDomain, generator.currentVariables),
    "fresh owner retains the original bounds-derived finite domain",
  );

  const proofOptions = {
    roundLimit: 32,
    nonCompletionMode: "failure-absorbed" as const,
    nonCompletionPartition: "scene" as const,
    failurePartition: "combined" as const,
    fixedPointCompactEvery: 1,
    obligationCompactEvery: 1,
  };
  // Compare canonical predicates in one owner, not merely their cardinalities.
  // Capture obligation roots while each disposable owner is still available.
  const normalCones = new Map<string, readonly number[]>();
  const functionalCones = new Map<string, readonly number[]>();
  const normalResult = proveCompletionSafetyByObligation(normal, {
    ...proofOptions,
    onObligation: ({ model, seed, bad, summary }) => {
      normalCones.set(summary.id, model.bdd.copyForestTo(normal.bdd, [seed, bad]));
    },
  });
  const functionalResult = proveCompletionSafetyByObligation(generator, {
    ...proofOptions,
    onObligation: ({ model, seed, bad, summary }) => {
      functionalCones.set(summary.id, model.bdd.copyForestTo(normal.bdd, [seed, bad]));
    },
  });
  assert.notEqual(normalResult.completionOrFailure, undefined);
  assert.notEqual(functionalResult.completionOrFailure, undefined);
  assert.deepEqual(
    functionalResult.model.bdd.copyForestTo(normal.bdd, [
      functionalResult.completable, functionalResult.completionOrFailure!,
    ]),
    normalResult.model.bdd.copyForestTo(normal.bdd, [
      normalResult.completable, normalResult.completionOrFailure!,
    ]),
    "completion and completion-or-failure predicates are exactly equal",
  );
  assert.deepEqual(functionalCones, normalCones, "every obligation seed and closure is exactly equal");
  assert.ok([...normalCones.values()].some(([, bad]) => bad !== 0), "the fixture exercises a nonzero bad cone");
  assert.equal(normalResult.completionRounds, 3, "synchronous one-edge layers");
  assert.equal(functionalResult.completionRounds, 2, "reverse in-place sweeps");
  assert.equal(normalResult.completionCompactions, 2);
  assert.equal(functionalResult.completionCompactions, 1);
  assert.deepEqual(
    obligationSignature(functionalResult, functionalResult.model),
    obligationSignature(normalResult, normalResult.model),
  );
  assert.equal(normalResult.initialInBad, false);
  assert.equal(functionalResult.initialInBad, false);
  assert.ok(functionalResult.model instanceof FunctionalGeneratorModel);
});
