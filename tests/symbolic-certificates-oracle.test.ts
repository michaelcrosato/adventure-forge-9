import assert from "node:assert/strict";
import test from "node:test";
import {
  validateScenario,
  type Choice,
  type Condition,
  type Scenario,
} from "../src/engine/content.js";
import {
  SymbolicModel,
  type SemanticState,
} from "../src/verification/symbolic-model.js";
import {
  certificateDescriptor,
  verifySymbolicCertificate,
  type SymbolicCertificate,
} from "../src/verification/symbolic-certificates.js";

type Status = SemanticState["status"];
type TerminalStatus = Exclude<Status, "playing">;
type FailureKind = "arithmetic-error" | "bound-exit" | "invalid-success" | "uncovered-enabled";

type RawTransition =
  | { readonly kind: "success"; readonly state: SemanticState }
  | { readonly kind: "fault"; readonly reason: "arithmetic-error" | "bound-exit"; readonly effectIndex: number; readonly resource: string };

interface RawEdge {
  readonly from: string;
  readonly to: string;
  readonly choiceId: string;
}

interface RawGraph {
  readonly scenario: Scenario;
  readonly bounds: Readonly<Record<string, number>>;
  readonly resources: readonly string[];
  readonly flags: readonly string[];
  readonly endings: readonly (readonly [TerminalStatus, string])[];
  readonly states: readonly SemanticState[];
  readonly statesByKey: ReadonlyMap<string, SemanticState>;
  readonly edges: readonly RawEdge[];
  readonly reachable: ReadonlySet<string>;
  readonly completable: ReadonlySet<string>;
  readonly faults: ReadonlySet<string>;
  readonly invalidSuccess: ReadonlySet<string>;
  readonly uncoveredEnabled: ReadonlySet<string>;
  readonly failureSeeds: ReadonlyMap<string, ReadonlyMap<FailureKind, ReadonlySet<string>>>;
  readonly failureCone: ReadonlySet<string>;
  readonly completionOrFailure: ReadonlySet<string>;
  readonly bad: ReadonlySet<string>;
  readonly sceneResidual: ReadonlyMap<string, ReadonlySet<string>>;
  readonly sceneCones: ReadonlyMap<string, ReadonlySet<string>>;
  readonly initialKey: string;
}

/** All fixtures are intentionally independent from the production scenario. */
const SAFE_UNREACHABLE_CYCLE = {
  version: 1,
  initialScene: "start",
  initialResources: { energy: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The safe route begins." }] },
    { id: "hidden", title: "Hidden", text: [{ text: "An unreachable cycle turns in the dark." }] },
  ],
  choices: [
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the start",
      description: "Close the safe route.",
      effects: [],
      outcome: { status: "completed", summary: "The safe route is complete." },
    },
    {
      id: "hidden-cycle",
      scene: "hidden",
      label: "Turn the hidden wheel",
      description: "Remain in the unreachable cycle.",
      effects: [{ type: "goTo", scene: "hidden" }],
    },
  ],
} as const;

/** Every hidden playing state reaches failure; its scene certificate must be zero. */
const UNREACHABLE_FAILURE_AFTER_TWO_EDGES = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 0 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The safe route is ready." }] },
    { id: "hidden-a", title: "Hidden A", text: [{ text: "The first hidden road." }] },
    { id: "hidden-b", title: "Hidden B", text: [{ text: "The second hidden road." }] },
    { id: "fault-zone", title: "Fault Zone", text: [{ text: "The hidden tank is already full." }] },
  ],
  choices: [
    {
      id: "finish-start",
      scene: "start",
      label: "Finish safely",
      description: "Close the safe route.",
      effects: [],
      outcome: { status: "completed", summary: "The safe route is complete." },
    },
    {
      id: "to-hidden-b",
      scene: "hidden-a",
      label: "Take the first hidden road",
      description: "Walk to the second hidden road.",
      effects: [{ type: "goTo", scene: "hidden-b" }],
    },
    {
      id: "to-fault-zone",
      scene: "hidden-b",
      label: "Take the second hidden road",
      description: "Walk to the hidden fault zone.",
      effects: [{ type: "goTo", scene: "fault-zone" }],
    },
    {
      id: "overfill-hidden-tank",
      scene: "fault-zone",
      label: "Overfill the tank",
      description: "Push the full tank beyond its bound.",
      effects: [
        { type: "adjustResource", resource: "stock", delta: 1 },
        { type: "goTo", scene: "fault-zone" },
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
    { id: "start", title: "Start", text: [{ text: "Two roads leave the start." }] },
    { id: "trap", title: "Trap", text: [{ text: "The trap has no open road." }] },
  ],
  choices: [
    {
      id: "enter-trap",
      scene: "start",
      label: "Enter the trap",
      description: "Take the road into the trap.",
      effects: [{ type: "goTo", scene: "trap" }],
    },
    {
      id: "blocked-escape",
      scene: "trap",
      label: "Use the water exit",
      description: "Leave only when water is available.",
      when: [{ type: "resourceAtLeast", resource: "water", value: 1 }],
      effects: [{ type: "goTo", scene: "start" }],
    },
  ],
} as const;

const FIRST_FAULT_BEFORE_RESET = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The yard lies beyond the gate." }] },
    { id: "yard", title: "Yard", text: [{ text: "The tank can fail before a reset." }] },
  ],
  choices: [
    {
      id: "enter-yard",
      scene: "start",
      label: "Enter the yard",
      description: "Walk to the full tank.",
      effects: [{ type: "goTo", scene: "yard" }],
    },
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the gate",
      description: "Finish before entering the yard.",
      effects: [],
      outcome: { status: "completed", summary: "The gate route is complete." },
    },
    {
      id: "fail-before-reset",
      scene: "yard",
      label: "Force the failure",
      description: "Overfill first; the later reset is never reached.",
      effects: [
        { type: "adjustResource", resource: "stock", delta: 1 },
        { type: "setResource", resource: "stock", value: 0 },
        { type: "goTo", scene: "yard" },
      ],
    },
    {
      id: "finish-yard",
      scene: "yard",
      label: "Finish the yard",
      description: "Close the yard after a safe visit.",
      effects: [],
      outcome: { status: "completed", summary: "The yard route is complete." },
    },
  ],
} as const;

function tuples<T>(sets: readonly (readonly T[])[]): T[][] {
  let result: T[][] = [[]];
  for (const set of sets) result = result.flatMap(prefix => set.map(value => [...prefix, value]));
  return result;
}

function sortedKeys(record: Readonly<Record<string, unknown>>): readonly string[] {
  return Object.keys(record).sort();
}

function flagNames(scenario: Scenario): readonly string[] {
  const names = new Set<string>();
  const read = (conditions: readonly Condition[] | undefined): void => {
    for (const condition of conditions ?? []) if (condition.type === "flag") names.add(condition.flag);
  };
  for (const scene of scenario.scenes) for (const line of scene.text) read(line.when);
  for (const choice of scenario.choices) {
    read(choice.when);
    for (const effect of choice.effects) if (effect.type === "setFlag") names.add(effect.flag);
  }
  return [...names].sort();
}

function endingPairs(scenario: Scenario): readonly (readonly [TerminalStatus, string])[] {
  const pairs: [TerminalStatus, string][] = [];
  for (const choice of scenario.choices) {
    if (choice.outcome === undefined) continue;
    const pair: [TerminalStatus, string] = [choice.outcome.status, choice.outcome.summary];
    if (!pairs.some(([status, summary]) => status === pair[0] && summary === pair[1])) pairs.push(pair);
  }
  return pairs;
}

function stateKey(state: SemanticState, resources: readonly string[], flags: readonly string[]): string {
  return JSON.stringify([
    state.scene,
    state.status,
    state.ending,
    resources.map(resource => state.resources[resource]),
    flags.map(flag => state.flags[flag] === true),
  ]);
}

function initialState(scenario: Scenario, resources: readonly string[], flags: readonly string[]): SemanticState {
  return {
    scene: scenario.initialScene,
    status: "playing",
    ending: 0,
    resources: Object.fromEntries(resources.map(resource => [resource, scenario.initialResources[resource]!])),
    flags: Object.fromEntries(flags.map(flag => [flag, false])),
  };
}

function allStates(
  scenario: Scenario,
  bounds: Readonly<Record<string, number>>,
  resources: readonly string[],
  flags: readonly string[],
  endings: readonly (readonly [TerminalStatus, string])[],
): readonly SemanticState[] {
  const resourceTuples = tuples(resources.map(resource => Array.from({ length: bounds[resource]! + 1 }, (_, value) => value)));
  const flagTuples = tuples(flags.map(() => [false, true]));
  const states: SemanticState[] = [];
  for (const scene of scenario.scenes) {
    for (const resourceTuple of resourceTuples) {
      const resourceValues = Object.fromEntries(resources.map((resource, index) => [resource, resourceTuple[index]!])) as Record<string, number>;
      for (const flagTuple of flagTuples) {
        const flagValues = Object.fromEntries(flags.map((flag, index) => [flag, flagTuple[index]!])) as Record<string, boolean>;
        states.push({ scene: scene.id, status: "playing", ending: 0, resources: resourceValues, flags: flagValues });
        for (const [index, [status]] of endings.entries()) {
          states.push({ scene: scene.id, status, ending: index + 1, resources: resourceValues, flags: flagValues });
        }
      }
    }
  }
  return states;
}

function conditionMatches(condition: Condition, state: SemanticState): boolean {
  if (condition.type === "flag") return state.flags[condition.flag] === condition.value;
  if (condition.type === "resourceAtLeast") return state.resources[condition.resource]! >= condition.value;
  return state.resources[condition.resource]! <= condition.value;
}

function choiceEnabled(choice: Choice, state: SemanticState): boolean {
  return state.status === "playing"
    && choice.scene === state.scene
    && (choice.when ?? []).every(condition => conditionMatches(condition, state));
}

function resourceFailure(resource: string, value: number, effectIndex: number, bounds: Readonly<Record<string, number>>): RawTransition | undefined {
  if (!Number.isSafeInteger(value) || value < 0) return { kind: "fault", reason: "arithmetic-error", effectIndex, resource };
  if (value > bounds[resource]!) return { kind: "fault", reason: "bound-exit", effectIndex, resource };
  return undefined;
}

function rawTransition(
  scenario: Scenario,
  state: SemanticState,
  choice: Choice,
  bounds: Readonly<Record<string, number>>,
  endings: readonly (readonly [TerminalStatus, string])[],
): RawTransition {
  assert.equal(choiceEnabled(choice, state), true, `raw transition requires enabled ${choice.id}`);
  const resources = { ...state.resources };
  const flags = { ...state.flags };
  let scene = state.scene;
  for (const [effectIndex, effect] of choice.effects.entries()) {
    let failure: RawTransition | undefined;
    switch (effect.type) {
      case "setFlag":
        flags[effect.flag] = effect.value;
        break;
      case "setResource":
        resources[effect.resource] = effect.value;
        failure = resourceFailure(effect.resource, effect.value, effectIndex, bounds);
        break;
      case "adjustResource": {
        const value = resources[effect.resource]! + effect.delta;
        resources[effect.resource] = value;
        failure = resourceFailure(effect.resource, value, effectIndex, bounds);
        break;
      }
      case "advanceClock": {
        const clock = scenario.clocks?.find(candidate => candidate.id === effect.clock);
        assert.ok(clock, `clock ${effect.clock} exists`);
        const current = resources[clock!.resource]!;
        const value = effect.delta >= clock!.max - current ? clock!.max : current + effect.delta;
        resources[clock!.resource] = value;
        failure = resourceFailure(clock!.resource, value, effectIndex, bounds);
        break;
      }
      case "goTo":
        scene = effect.scene;
        break;
      case "addFact":
        break;
      default:
        throw new Error(`unknown raw effect ${(effect as { readonly type: string }).type}`);
    }
    if (failure !== undefined) return failure;
  }
  if (choice.outcome === undefined) {
    return { kind: "success", state: { scene, status: "playing", ending: 0, resources, flags } };
  }
  const ending = endings.findIndex(([status, summary]) => status === choice.outcome!.status && summary === choice.outcome!.summary) + 1;
  assert.ok(ending > 0, `ending ${choice.id} exists`);
  return { kind: "success", state: { scene, status: choice.outcome.status, ending, resources, flags } };
}

function predecessorClosure(graph: Pick<RawGraph, "edges">, seed: ReadonlySet<string>): ReadonlySet<string> {
  const result = new Set(seed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) {
      if (!result.has(edge.to) || result.has(edge.from)) continue;
      result.add(edge.from);
      changed = true;
    }
  }
  return result;
}

function buildRawGraph(raw: unknown, bounds: Readonly<Record<string, number>>): RawGraph {
  const scenario = validateScenario(raw);
  const resources = sortedKeys(scenario.initialResources);
  const flags = flagNames(scenario);
  const endings = endingPairs(scenario);
  const states = allStates(scenario, bounds, resources, flags, endings);
  const statesByKey = new Map<string, SemanticState>();
  for (const state of states) {
    const key = stateKey(state, resources, flags);
    assert.equal(statesByKey.has(key), false, `duplicate raw state ${key}`);
    statesByKey.set(key, state);
  }

  const edges: RawEdge[] = [];
  const faults = new Set<string>();
  const invalidSuccess = new Set<string>();
  const uncoveredEnabled = new Set<string>();
  const failureSeeds = new Map<string, Map<FailureKind, Set<string>>>();
  for (const choice of scenario.choices) {
    failureSeeds.set(choice.id, new Map([
      ["arithmetic-error", new Set<string>()],
      ["bound-exit", new Set<string>()],
      ["invalid-success", new Set<string>()],
      ["uncovered-enabled", new Set<string>()],
    ]));
  }
  for (const state of states) {
    if (state.status !== "playing") continue;
    const from = stateKey(state, resources, flags);
    for (const choice of scenario.choices) {
      if (!choiceEnabled(choice, state)) continue;
      const transition = rawTransition(scenario, state, choice, bounds, endings);
      const seeds = failureSeeds.get(choice.id)!;
      if (transition.kind === "fault") {
        faults.add(from);
        seeds.get(transition.reason)!.add(from);
        continue;
      }
      const to = stateKey(transition.state, resources, flags);
      if (!statesByKey.has(to)) {
        invalidSuccess.add(from);
        seeds.get("invalid-success")!.add(from);
        continue;
      }
      edges.push({ from, to, choiceId: choice.id });
    }
  }
  const outgoing = new Map<string, RawEdge[]>();
  for (const edge of edges) {
    const list = outgoing.get(edge.from);
    if (list === undefined) outgoing.set(edge.from, [edge]);
    else list.push(edge);
  }
  const start = initialState(scenario, resources, flags);
  const initialKey = stateKey(start, resources, flags);
  assert.ok(statesByKey.has(initialKey));
  const reachable = new Set<string>([initialKey]);
  const pending = [initialKey];
  for (let index = 0; index < pending.length; index += 1) {
    for (const edge of outgoing.get(pending[index]!) ?? []) {
      if (reachable.has(edge.to)) continue;
      reachable.add(edge.to);
      pending.push(edge.to);
    }
  }

  const completed = new Set(states
    .filter(state => state.status === "completed")
    .map(state => stateKey(state, resources, flags)));
  const completable = new Set(predecessorClosure({ edges }, completed));
  const failureSeed = new Set<string>();
  for (const key of faults) failureSeed.add(key);
  for (const key of invalidSuccess) failureSeed.add(key);
  for (const key of uncoveredEnabled) failureSeed.add(key);
  const failureCone = predecessorClosure({ edges }, failureSeed);
  const completionOrFailure = predecessorClosure({ edges }, new Set([...completed, ...failureSeed]));
  const badSeed = new Set(states
    .filter(state => state.status === "playing" && !completable.has(stateKey(state, resources, flags)))
    .map(state => stateKey(state, resources, flags)));
  for (const key of failureSeed) badSeed.add(key);
  const bad = predecessorClosure({ edges }, badSeed);

  const sceneResidual = new Map<string, ReadonlySet<string>>();
  const sceneCones = new Map<string, ReadonlySet<string>>();
  for (const scene of scenario.scenes) {
    const residual = new Set(states
      .filter(state => state.status === "playing" && state.scene === scene.id)
      .map(state => stateKey(state, resources, flags))
      .filter(key => !completionOrFailure.has(key)));
    sceneResidual.set(scene.id, residual);
    sceneCones.set(scene.id, predecessorClosure({ edges }, residual));
  }
  return {
    scenario,
    bounds,
    resources,
    flags,
    endings,
    states,
    statesByKey,
    edges,
    reachable,
    completable,
    faults,
    invalidSuccess,
    uncoveredEnabled,
    failureSeeds: new Map([...failureSeeds].map(([choiceId, seeds]) => [choiceId, new Map([...seeds].map(([kind, keys]) => [kind, new Set(keys)]))])),
    failureCone,
    completionOrFailure,
    bad,
    sceneResidual,
    sceneCones,
    initialKey,
  };
}

function formulaForKeys(model: SymbolicModel, graph: RawGraph, keys: ReadonlySet<string>): number {
  let root = 0;
  for (const key of keys) {
    const state = graph.statesByKey.get(key);
    assert.ok(state !== undefined, `missing raw state ${key}`);
    root = model.bdd.or(root, model.encode(state!));
  }
  return root;
}

function unionSets(sets: Iterable<ReadonlySet<string>>): ReadonlySet<string> {
  const result = new Set<string>();
  for (const set of sets) for (const key of set) result.add(key);
  return result;
}

function assertRawFailureAlgebra(graph: RawGraph): void {
  const sceneUnion = unionSets(graph.sceneCones.values());
  const certificateUnion = unionSets([graph.failureCone, sceneUnion]);
  assert.deepEqual(
    [...certificateUnion].sort(),
    [...graph.bad].sort(),
    "independent BF union all scene cones equals the raw aggregate bad set",
  );
  const nonCompletablePlaying = graph.states
    .filter(state => state.status === "playing")
    .map(state => stateKey(state, graph.resources, graph.flags))
    .filter(key => !graph.completable.has(key));
  for (const key of nonCompletablePlaying) {
    assert.equal(
      certificateUnion.has(key),
      true,
      `every playing state outside C is covered by BF or its scene cone: ${key}`,
    );
  }
}

function assertOwnedRootMatchesRawSet(
  model: SymbolicModel,
  graph: RawGraph,
  root: number,
  keys: ReadonlySet<string>,
  label: string,
): void {
  const expected = formulaForKeys(model, graph, keys);
  assert.equal(model.bdd.xor(root, expected), 0, `${label} equals the independent raw formula`);
  for (const state of graph.states) {
    const key = stateKey(state, graph.resources, graph.flags);
    const stateRoot = model.encode(state);
    const member = model.bdd.and(root, stateRoot) !== 0;
    assert.equal(member, keys.has(key), `${label} membership matches raw state ${key}`);
  }
}

function modelFor(graph: RawGraph, bounds = graph.bounds): SymbolicModel {
  return new SymbolicModel(graph.scenario, bounds, { nodeLimit: 100_000, cacheLimit: 20_000 });
}

interface CertificateBundle {
  readonly graph: RawGraph;
  readonly model: SymbolicModel;
  readonly certificate: SymbolicCertificate;
  readonly forests: ReadonlyMap<string, unknown>;
}

function makeCertificate(graph: RawGraph, model = modelFor(graph)): CertificateBundle {
  const forests = new Map<string, unknown>();
  const failureRoot = formulaForKeys(model, graph, graph.failureCone);
  forests.set("failure", model.bdd.exportForest([failureRoot]));
  const sceneForests = graph.scenario.scenes.map(scene => {
    const forestId = `scene:${scene.id}`;
    forests.set(forestId, model.bdd.exportForest([formulaForKeys(model, graph, graph.sceneCones.get(scene.id)!)]));
    return Object.freeze({ sceneId: scene.id, forestId });
  });
  const certificate: SymbolicCertificate = Object.freeze({
    schema: "af9-symbolic-certificate-v1",
    descriptor: certificateDescriptor(model),
    failureForestId: "failure",
    sceneForests: Object.freeze(sceneForests),
  });
  return Object.freeze({ graph, model, certificate, forests });
}

function loader(bundle: CertificateBundle): (forestId: string) => unknown {
  return forestId => bundle.forests.get(forestId);
}

function assertRawCertificateRoots(bundle: CertificateBundle): void {
  const failureForest = bundle.forests.get("failure");
  const importedFailure = bundle.model.bdd.importForest(failureForest);
  assert.equal(importedFailure.length, 1);
  assert.equal(importedFailure[0], formulaForKeys(bundle.model, bundle.graph, bundle.graph.failureCone));
  for (const scene of bundle.graph.scenario.scenes) {
    const forest = bundle.forests.get(`scene:${scene.id}`);
    const imported = bundle.model.bdd.importForest(forest);
    assert.equal(imported.length, 1);
    assert.equal(imported[0], formulaForKeys(bundle.model, bundle.graph, bundle.graph.sceneCones.get(scene.id)!));
  }
}

function assertCertificateResult(bundle: CertificateBundle, result: ReturnType<typeof verifySymbolicCertificate>): void {
  assert.equal(result.complete, true);
  assert.deepEqual(result.sceneIds, bundle.graph.scenario.scenes.map(scene => scene.id));
  assert.equal(result.checkedSceneForests, bundle.graph.scenario.scenes.length);
  assert.equal(result.checkedFailureForest, true);
  assert.equal(result.failureForestId, "failure");
  const expectedMetadata = bundle.graph.scenario.choices.flatMap(choice => ([
    "arithmetic-error", "bound-exit", "invalid-success", "uncovered-enabled",
  ] as const).map(kind => ({
    id: `${kind}:${choice.id}`,
    kind,
    choiceId: choice.id,
    seedZero: bundle.graph.failureSeeds.get(choice.id)!.get(kind)!.size === 0,
  })));
  assert.deepEqual(result.failureSeeds, expectedMetadata);
  assert.ok(result.completionRounds >= 1 && result.completionRounds <= 128);
  assertRawFailureAlgebra(bundle.graph);
  assertOwnedRootMatchesRawSet(
    result.model,
    bundle.graph,
    result.completable,
    bundle.graph.completable,
    "owned completable root",
  );
  assertRawCertificateRoots(bundle);
}

test("independent raw closures accept safe unreachable cycle and preserve zero failure catalog", () => {
  const graph = buildRawGraph(SAFE_UNREACHABLE_CYCLE, { energy: 2 });
  const bundle = makeCertificate(graph);
  assert.equal(graph.faults.size, 0);
  assert.equal(graph.invalidSuccess.size, 0);
  assert.equal(graph.uncoveredEnabled.size, 0);
  assert.equal(graph.completable.has(graph.initialKey), true);
  assert.equal(graph.failureCone.size, 0);
  assert.equal(graph.sceneResidual.get("start")!.size, 0);
  assert.ok(graph.sceneResidual.get("hidden")!.size > 0, "hidden cycle is non-completable");
  assert.equal(graph.sceneCones.get("hidden")!.has(graph.initialKey), false, "unreachable cone stays disjoint");
  const result = verifySymbolicCertificate(bundle.model, bundle.certificate, loader(bundle), { roundLimit: 128 });
  assertCertificateResult(bundle, result);
  assert.equal(result.failureSeeds.every(seed => seed.seedZero), true, "zero failure entries remain explicit");
});

test("direct coverage uses BF when every hidden scene cone is zero", () => {
  const graph = buildRawGraph(UNREACHABLE_FAILURE_AFTER_TWO_EDGES, { stock: 0 });
  const bundle = makeCertificate(graph);
  assert.ok(graph.failureCone.size > 0);
  assert.equal(graph.failureCone.has(graph.initialKey), false, "unreachable BF remains safe");
  assert.equal(graph.sceneResidual.get("hidden-a")!.size, 0);
  assert.equal(graph.sceneResidual.get("hidden-b")!.size, 0);
  assert.equal(graph.sceneResidual.get("fault-zone")!.size, 0);
  assert.ok(graph.failureCone.has([...graph.statesByKey.entries()].find(([, state]) => state.scene === "hidden-a" && state.status === "playing")![0]),
    "the hidden state reaches failure after two edges");
  const result = verifySymbolicCertificate(bundle.model, bundle.certificate, loader(bundle), { roundLimit: 128 });
  assertCertificateResult(bundle, result);
  const nonzero = result.failureSeeds.filter(seed => !seed.seedZero);
  assert.deepEqual(nonzero.map(seed => `${seed.kind}:${seed.choiceId}`), ["bound-exit:overfill-hidden-tank"]);
});

test("raw oracle preserves reachable trap and first-fault-before-reset failures", () => {
  const trap = buildRawGraph(REACHABLE_TRAP, { water: 0 });
  assert.equal(trap.completable.has(trap.initialKey), false);
  assert.equal(trap.bad.has(trap.initialKey), true);
  const trapBundle = makeCertificate(trap);
  assert.throws(
    () => verifySymbolicCertificate(trapBundle.model, trapBundle.certificate, loader(trapBundle), { roundLimit: 128 }),
    /initial|cone|failure|coverage/i,
  );

  const firstFault = buildRawGraph(FIRST_FAULT_BEFORE_RESET, { stock: 1 });
  const faultChoice = firstFault.scenario.choices.find(choice => choice.id === "fail-before-reset")!;
  const fullStateKey = [...firstFault.statesByKey.entries()].find(([, state]) =>
    state.scene === "yard" && state.status === "playing" && state.resources.stock === 1)![0];
  assert.equal(firstFault.failureSeeds.get(faultChoice.id)!.get("bound-exit")!.has(fullStateKey), true);
  assert.equal(firstFault.edges.some(edge => edge.choiceId === faultChoice.id && edge.from === fullStateKey), false);
  assert.equal(firstFault.bad.has(firstFault.initialKey), true);
  const faultBundle = makeCertificate(firstFault);
  assert.throws(
    () => verifySymbolicCertificate(faultBundle.model, faultBundle.certificate, loader(faultBundle), { roundLimit: 128 }),
    /initial|cone|failure|coverage/i,
  );
});

test("certificate descriptors reject stale bounds/catalogs and mixed-phase forests", () => {
  const graph = buildRawGraph(SAFE_UNREACHABLE_CYCLE, { energy: 2 });
  const bundle = makeCertificate(graph);
  const sameWidthModel = new SymbolicModel(graph.scenario, { energy: 3 }, { nodeLimit: 100_000, cacheLimit: 20_000 });
  assert.throws(
    () => verifySymbolicCertificate(sameWidthModel, bundle.certificate, loader(bundle), { roundLimit: 128 }),
    /descriptor/i,
    "same-width bound changes must invalidate the descriptor",
  );

  const missingScene = {
    ...bundle.certificate,
    sceneForests: bundle.certificate.sceneForests.slice(0, -1),
  };
  assert.throws(
    () => verifySymbolicCertificate(bundle.model, missingScene, loader(bundle), { roundLimit: 128 }),
    /sceneForests/i,
  );

  const mixedRoot = bundle.model.bdd.variable(bundle.model.nextVariables[0]!);
  const mixedForest = bundle.model.bdd.exportForest([mixedRoot]);
  const mixedLoader = (id: string): unknown => id === "failure" ? mixedForest : bundle.forests.get(id);
  assert.throws(
    () => verifySymbolicCertificate(bundle.model, bundle.certificate, mixedLoader, { roundLimit: 128 }),
    /current-only/i,
    "a next-variable certificate must not be interpreted as a source predicate",
  );
});

test("serialized forests are owner-neutral but raw foreign handles are rejected", () => {
  const graph = buildRawGraph(SAFE_UNREACHABLE_CYCLE, { energy: 2 });
  const bundle = makeCertificate(graph);
  const foreign = modelFor(graph);
  const foreignBundle = makeCertificate(graph, foreign);
  const importedFromForeign = verifySymbolicCertificate(bundle.model, bundle.certificate, loader(foreignBundle), { roundLimit: 128 });
  assertCertificateResult(bundle, importedFromForeign);

  const rawForeignHandle = foreign.bdd.variable(foreign.currentVariables[0]!);
  assert.equal(typeof rawForeignHandle, "number");
  const rawHandleLoader = (id: string): unknown => id === "failure"
    ? rawForeignHandle
    : bundle.forests.get(id);
  assert.throws(
    () => verifySymbolicCertificate(bundle.model, bundle.certificate, rawHandleLoader, { roundLimit: 128 }),
    /failure forest:.*forest must be an object/i,
    "manager-local numeric handles must never cross the certificate boundary",
  );
});
