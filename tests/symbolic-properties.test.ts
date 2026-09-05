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
  type SymbolicChoice,
} from "../src/verification/symbolic-model.js";
import { proveCompletionSafety } from "../src/verification/symbolic-properties.js";

type Status = SemanticState["status"];
type TerminalStatus = Exclude<Status, "playing">;
type FaultReason = "arithmetic-error" | "bound-exit";

type RawTransition =
  | { readonly kind: "success"; readonly state: SemanticState }
  | {
      readonly kind: "fault";
      readonly reason: FaultReason;
      readonly effectIndex: number;
      readonly resource: string;
    };

interface RawEdge {
  readonly from: string;
  readonly to: string;
  readonly choiceId: string;
}

interface RawGraph {
  readonly scenario: Scenario;
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
  readonly bad: ReadonlySet<string>;
  readonly initialKey: string;
}

const SAFE_CYCLE = {
  version: 1,
  initialScene: "start",
  initialResources: { energy: 1 },
  initialFacts: [],
  scenes: [
    {
      id: "start",
      title: "Start",
      text: [
        { text: "The safe route begins." },
        { text: "The armed marker glints.", when: [{ type: "flag", flag: "armed", value: true }] },
      ],
    },
    {
      id: "loop",
      title: "Loop",
      text: [
        { text: "The loop can be reset before the final step." },
        { text: "The gate is armed.", when: [{ type: "flag", flag: "armed", value: true }] },
      ],
    },
  ],
  choices: [
    {
      id: "enter-loop",
      scene: "start",
      label: "Enter the loop",
      description: "Take the safe route into the working loop.",
      effects: [{ type: "goTo", scene: "loop" }],
    },
    {
      id: "depart-start",
      scene: "start",
      label: "Depart early",
      description: "Leave before committing to the route.",
      effects: [],
      outcome: { status: "departed", summary: "You departed before finishing the route." },
    },
    {
      id: "arm-loop",
      scene: "loop",
      label: "Arm the gate",
      description: "Arm the gate and remain in the loop.",
      when: [{ type: "flag", flag: "armed", value: false }],
      effects: [
        { type: "setFlag", flag: "armed", value: true },
        { type: "goTo", scene: "loop" },
      ],
    },
    {
      id: "reset-loop",
      scene: "loop",
      label: "Reset the gate",
      description: "Restore the spent energy and clear the gate.",
      when: [
        { type: "flag", flag: "armed", value: true },
        { type: "resourceAtMost", resource: "energy", value: 0 },
      ],
      effects: [
        { type: "setResource", resource: "energy", value: 1 },
        { type: "setFlag", flag: "armed", value: false },
        { type: "goTo", scene: "loop" },
      ],
    },
    {
      id: "drain-loop",
      scene: "loop",
      label: "Spend the energy",
      description: "Spend the energy and stay in the loop.",
      when: [
        { type: "flag", flag: "armed", value: true },
        { type: "resourceAtLeast", resource: "energy", value: 1 },
      ],
      effects: [
        { type: "adjustResource", resource: "energy", delta: -1 },
        { type: "goTo", scene: "loop" },
      ],
    },
    {
      id: "finish-loop",
      scene: "loop",
      label: "Finish the route",
      description: "Finish once the gate is armed.",
      when: [{ type: "flag", flag: "armed", value: true }],
      effects: [],
      outcome: { status: "completed", summary: "The safe route is complete." },
    },
    {
      id: "dead-loop",
      scene: "loop",
      label: "Take the fatal shortcut",
      description: "Choose the unarmed shortcut.",
      when: [{ type: "flag", flag: "armed", value: false }],
      effects: [],
      outcome: { status: "dead", summary: "The unarmed shortcut failed." },
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
      id: "enter-safe",
      scene: "start",
      label: "Take the safe path",
      description: "Walk to the safe landing.",
      effects: [{ type: "goTo", scene: "safe" }],
    },
    {
      id: "enter-trap",
      scene: "start",
      label: "Enter the trap",
      description: "Take the path into the dry trap.",
      effects: [{ type: "goTo", scene: "trap" }],
    },
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the start",
      description: "Close the route before walking farther.",
      effects: [],
      outcome: { status: "completed", summary: "The starting route is complete." },
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
      id: "blocked-escape",
      scene: "trap",
      label: "Use the water exit",
      description: "Leave the trap when water is available.",
      when: [{ type: "resourceAtLeast", resource: "water", value: 1 }],
      effects: [{ type: "goTo", scene: "safe" }],
    },
  ],
} as const;

const UNREACHABLE_BAD = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The sealed route is safe." }] },
    { id: "hidden", title: "Hidden", text: [{ text: "A hidden route contains a fault." }] },
  ],
  choices: [
    {
      id: "finish-start",
      scene: "start",
      label: "Finish the sealed route",
      description: "Finish without entering the hidden route.",
      effects: [],
      outcome: { status: "completed", summary: "The sealed route is complete." },
    },
    {
      id: "hidden-boom",
      scene: "hidden",
      label: "Overfill the hidden tank",
      description: "Push the hidden tank beyond the modeled bound.",
      effects: [
        { type: "adjustResource", resource: "stock", delta: 1 },
        { type: "goTo", scene: "hidden" },
      ],
    },
    {
      id: "finish-hidden",
      scene: "hidden",
      label: "Finish the hidden route",
      description: "Close the hidden route safely.",
      effects: [],
      outcome: { status: "completed", summary: "The hidden route is complete." },
    },
  ],
} as const;

const REACHABLE_FAULTS = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The work route begins." }] },
    { id: "work", title: "Work", text: [{ text: "The tank can be reset or overfilled." }] },
  ],
  choices: [
    {
      id: "enter-work",
      scene: "start",
      label: "Enter the work yard",
      description: "Walk into the work yard.",
      effects: [{ type: "goTo", scene: "work" }],
    },
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the gate",
      description: "Finish before entering the yard.",
      effects: [],
      outcome: { status: "completed", summary: "The starting work is complete." },
    },
    {
      id: "reset-stock",
      scene: "work",
      label: "Reset the tank",
      description: "Reset the full tank to zero and remain in the yard.",
      when: [{ type: "resourceAtLeast", resource: "stock", value: 1 }],
      effects: [
        { type: "setResource", resource: "stock", value: 0 },
        { type: "goTo", scene: "work" },
      ],
    },
    {
      id: "restore-stock",
      scene: "work",
      label: "Restore the tank",
      description: "Restore a zero tank to one unit and remain in the yard.",
      when: [{ type: "resourceAtMost", resource: "stock", value: 0 }],
      effects: [
        { type: "setResource", resource: "stock", value: 1 },
        { type: "goTo", scene: "work" },
      ],
    },
    {
      id: "overflow-stock",
      scene: "work",
      label: "Overfill the tank",
      description: "Add one unit to the full tank.",
      when: [{ type: "resourceAtLeast", resource: "stock", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "stock", delta: 1 },
        { type: "goTo", scene: "work" },
      ],
    },
    {
      id: "arithmetic-overflow",
      scene: "work",
      label: "Force an integer overflow",
      description: "Apply the largest safe integer to the full tank.",
      when: [{ type: "resourceAtLeast", resource: "stock", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "stock", delta: Number.MAX_SAFE_INTEGER },
        { type: "goTo", scene: "work" },
      ],
    },
    {
      id: "finish-work",
      scene: "work",
      label: "Finish the yard",
      description: "Finish from either safe tank level.",
      effects: [],
      outcome: { status: "completed", summary: "The work yard is complete." },
    },
  ],
} as const;

const TERMINAL_ONLY = {
  version: 1,
  initialScene: "start",
  initialResources: { token: 0 },
  initialFacts: [],
  scenes: [{ id: "start", title: "Start", text: [{ text: "Only terminal exits remain." }] }],
  choices: [
    {
      id: "depart-only",
      scene: "start",
      label: "Depart",
      description: "Leave the route.",
      effects: [],
      outcome: { status: "departed", summary: "You departed without completing the route." },
    },
    {
      id: "die-only",
      scene: "start",
      label: "Take the fatal exit",
      description: "Take the fatal exit.",
      effects: [],
      outcome: { status: "dead", summary: "The fatal exit ended the route." },
    },
  ],
} as const;

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

function tuples<T>(sets: readonly (readonly T[])[]): T[][] {
  let result: T[][] = [[]];
  for (const set of sets) result = result.flatMap(prefix => set.map(value => [...prefix, value]));
  return result;
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

function resourceFailure(
  resource: string,
  value: number,
  effectIndex: number,
  bounds: Readonly<Record<string, number>>,
): RawTransition | undefined {
  if (!Number.isSafeInteger(value) || value < 0) {
    return { kind: "fault", reason: "arithmetic-error", effectIndex, resource };
  }
  if (value > bounds[resource]!) {
    return { kind: "fault", reason: "bound-exit", effectIndex, resource };
  }
  return undefined;
}

function rawTransition(
  scenario: Scenario,
  state: SemanticState,
  choice: Choice,
  bounds: Readonly<Record<string, number>>,
  endings: readonly (readonly [TerminalStatus, string])[],
): RawTransition {
  assert.equal(choiceEnabled(choice, state), true, `raw transition requires enabled choice ${choice.id}`);
  const resources: Record<string, number> = { ...state.resources };
  const flags: Record<string, boolean> = { ...state.flags };
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
        assert.ok(clock, `raw clock ${effect.clock} exists`);
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
        return assertNever(effect);
    }
    if (failure !== undefined) return failure;
  }
  if (choice.outcome === undefined) {
    return { kind: "success", state: { scene, status: "playing", ending: 0, resources, flags } };
  }
  const ending = endings.findIndex(([status, summary]) => status === choice.outcome!.status && summary === choice.outcome!.summary) + 1;
  assert.ok(ending > 0, `raw ending ${choice.id} exists`);
  return { kind: "success", state: { scene, status: choice.outcome.status, ending, resources, flags } };
}

function assertNever(value: never): never {
  throw new Error(`raw oracle encountered unknown vocabulary ${JSON.stringify(value)}`);
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
    assert.equal(statesByKey.has(key), false, `raw domain duplicate ${key}`);
    statesByKey.set(key, state);
  }

  const edges: RawEdge[] = [];
  const faults = new Set<string>();
  const invalidSuccess = new Set<string>();
  const uncoveredEnabled = new Set<string>();
  for (const state of states) {
    const from = stateKey(state, resources, flags);
    for (const choice of scenario.choices) {
      if (!choiceEnabled(choice, state)) continue;
      const transition = rawTransition(scenario, state, choice, bounds, endings);
      if (transition.kind === "fault") {
        faults.add(from);
        continue;
      }
      const to = stateKey(transition.state, resources, flags);
      if (!statesByKey.has(to)) {
        invalidSuccess.add(from);
        continue;
      }
      edges.push({ from, to, choiceId: choice.id });
    }
  }

  const start = initialState(scenario, resources, flags);
  const initialKey = stateKey(start, resources, flags);
  assert.ok(statesByKey.has(initialKey), "raw initial state belongs to domain");
  const outgoing = new Map<string, RawEdge[]>();
  for (const edge of edges) {
    const prior = outgoing.get(edge.from);
    if (prior === undefined) outgoing.set(edge.from, [edge]);
    else prior.push(edge);
  }
  const reachable = new Set<string>([initialKey]);
  const pending = [initialKey];
  for (let index = 0; index < pending.length; index++) {
    for (const edge of outgoing.get(pending[index]!) ?? []) {
      if (reachable.has(edge.to)) continue;
      reachable.add(edge.to);
      pending.push(edge.to);
    }
  }

  const completable = new Set<string>(states
    .filter(state => state.status === "completed")
    .map(state => stateKey(state, resources, flags)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (!completable.has(edge.to) || completable.has(edge.from)) continue;
      const source = statesByKey.get(edge.from);
      assert.ok(source !== undefined);
      if (source!.status !== "playing") continue;
      completable.add(edge.from);
      changed = true;
    }
  }

  const bad = new Set<string>(states
    .filter(state => state.status === "playing" && !completable.has(stateKey(state, resources, flags)))
    .map(state => stateKey(state, resources, flags)));
  for (const key of faults) bad.add(key);
  for (const key of invalidSuccess) bad.add(key);
  for (const key of uncoveredEnabled) bad.add(key);
  changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (!bad.has(edge.to) || bad.has(edge.from)) continue;
      bad.add(edge.from);
      changed = true;
    }
  }

  return {
    scenario,
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
    bad,
    initialKey,
  };
}

function formulaForKeys(model: SymbolicModel, graph: RawGraph, keys: ReadonlySet<string>): number {
  let result = 0;
  for (const key of keys) {
    const state = graph.statesByKey.get(key);
    assert.ok(state !== undefined, `raw state ${key} exists`);
    result = model.bdd.or(result, model.encode(state!));
  }
  return result;
}

function reversedFieldOrder(scenario: Scenario): readonly string[] {
  return [
    "scene",
    "status",
    "ending",
    ...sortedKeys(scenario.initialResources).map(resource => `resource:${resource}`),
    ...flagNames(scenario).map(flag => `flag:${flag}`),
  ].reverse();
}

function assertCurrentOnly(model: SymbolicModel, root: number, label: string): void {
  assert.equal(model.bdd.exists(root, model.nextVariables), root, `${label} is current-only`);
}

function assertProofMatches(model: SymbolicModel, graph: RawGraph, result: ReturnType<typeof proveCompletionSafety>, label: string): void {
  assert.equal(result.complete, true, `${label} completes both fixed points`);
  assert.strictEqual(result.model, model, `${label} keeps the caller's owner`);
  assert.ok(Object.isFrozen(result), `${label} result is immutable`);
  const roots = [
    ["completable", result.completable, graph.completable],
    ["bad", result.bad, graph.bad],
    ["faults", result.faults, graph.faults],
    ["invalidSuccess", result.invalidSuccess, graph.invalidSuccess],
    ["uncoveredEnabled", result.uncoveredEnabled, graph.uncoveredEnabled],
  ] as const;
  for (const [name, actual, expected] of roots) {
    const formula = formulaForKeys(model, graph, expected);
    assert.equal(actual, formula, `${label} ${name} matches the independent finite oracle`);
    assertCurrentOnly(model, actual, `${label} ${name}`);
  }
  assert.equal(result.initialInBad, graph.bad.has(graph.initialKey), `${label} initial bad membership`);
  assert.ok(result.completionRounds >= 1 && result.completionRounds <= 64, `${label} completion rounds are bounded`);
  assert.ok(result.badRounds >= 1 && result.badRounds <= 64, `${label} bad rounds are bounded`);

  for (const key of graph.reachable) {
    const state = graph.statesByKey.get(key)!;
    if (state.status !== "playing") continue;
    assert.ok(graph.completable.has(key) || graph.bad.has(key), `${label} reachable playing state is classified`);
    if (!graph.bad.has(graph.initialKey)) {
      assert.equal(graph.completable.has(key), true, `${label} safe reachable state has a completion path`);
      assert.equal(graph.faults.has(key), false, `${label} safe reachable state has no fault`);
      assert.equal(graph.invalidSuccess.has(key), false, `${label} safe reachable state has no invalid success`);
      assert.equal(graph.uncoveredEnabled.has(key), false, `${label} safe reachable state has no uncovered action`);
    }
  }
}

function modelFor(
  scenario: Scenario,
  bounds: Readonly<Record<string, number>>,
  order: "interleaved" | "blocked",
  transitionMode: "relational" | "partitioned",
  reorder: boolean,
): SymbolicModel {
  return new SymbolicModel(scenario, bounds, {
    order,
    transitionMode,
    fieldOrder: reorder ? reversedFieldOrder(scenario) : undefined,
    nodeLimit: 100_000,
    cacheLimit: 20_000,
  });
}

function checkScenario(
  raw: unknown,
  bounds: Readonly<Record<string, number>>,
  label: string,
  allLayouts = false,
): void {
  const graph = buildRawGraph(raw, bounds);
  const orders = allLayouts ? (["interleaved", "blocked"] as const) : (["interleaved"] as const);
  const modes = ["relational", "partitioned"] as const;
  const reorders = allLayouts ? [false, true] : [false];
  for (const order of orders) for (const transitionMode of modes) for (const reorder of reorders) {
    const model = modelFor(graph.scenario, bounds, order, transitionMode, reorder);
    const result = proveCompletionSafety(model, { roundLimit: 64 });
    assertProofMatches(model, graph, result, `${label}/${order}/${transitionMode}/${reorder ? "reversed" : "default"}`);
  }
}

test("symbolic completion and safety properties match an independent finite oracle", () => {
  checkScenario(SAFE_CYCLE, { energy: 1 }, "safe-cycle", true);
  checkScenario(REACHABLE_TRAP, { water: 1 }, "reachable-trap", false);
  checkScenario(UNREACHABLE_BAD, { stock: 1 }, "unreachable-bad", false);
  checkScenario(REACHABLE_FAULTS, { stock: 1 }, "reachable-faults", false);
  checkScenario(TERMINAL_ONLY, { token: 0 }, "terminal-only", false);

  const safe = buildRawGraph(SAFE_CYCLE, { energy: 1 });
  assert.equal(safe.bad.has(safe.initialKey), false, "departed/dead alternatives are allowed when completion exists");
  const terminalOnly = buildRawGraph(TERMINAL_ONLY, { token: 0 });
  assert.equal(terminalOnly.bad.has(terminalOnly.initialKey), true, "only departed/dead routes fail completion safety");

  const faultGraph = buildRawGraph(REACHABLE_FAULTS, { stock: 1 });
  const workFull = [...faultGraph.statesByKey.entries()].find(([, state]) => state.scene === "work"
    && state.status === "playing" && state.resources.stock === 1)![0];
  assert.ok(faultGraph.faults.has(workFull), "reachable bound and safe-integer faults share their source state");
  assert.ok(faultGraph.edges.some(edge => edge.choiceId === "reset-stock"), "safe reset remains in the finite oracle");

  const unreachableGraph = buildRawGraph(UNREACHABLE_BAD, { stock: 1 });
  assert.ok(unreachableGraph.bad.size > 0, "unreachable bad states remain represented globally");
  assert.equal(unreachableGraph.bad.has(unreachableGraph.initialKey), false, "unreachable bad states do not poison the initial state");
});

test("completion safety reports progress and rejects invalid round limits", () => {
  const scenario = validateScenario(SAFE_CYCLE);
  const model = modelFor(scenario, { energy: 1 }, "interleaved", "partitioned", false);
  const events: { readonly phase: "completion" | "bad"; readonly round: number; readonly nodes: number; readonly fixed: boolean }[] = [];
  const result = proveCompletionSafety(model, {
    roundLimit: 64,
    onProgress: progress => events.push(progress),
  });
  assert.ok(events.some(event => event.phase === "completion"));
  assert.ok(events.some(event => event.phase === "bad"));
  for (const event of events) {
    assert.ok(Object.isFrozen(event));
    assert.ok(Number.isSafeInteger(event.nodes));
  }
  for (const phase of ["completion", "bad"] as const) {
    const phaseEvents = events.filter(event => event.phase === phase);
    assert.equal(phaseEvents.at(-1)?.fixed, true, `${phase} reports its fixed point`);
  }

  for (const roundLimit of [null, 0, -1, 1.5, Number.NaN, "64"] as const) {
    assert.throws(
      () => proveCompletionSafety(model, { roundLimit: roundLimit as never }),
      /roundLimit|round limit|fixed point|incomplete/i,
      `rejects roundLimit=${String(roundLimit)}`,
    );
  }
  assert.throws(() => proveCompletionSafety(model, null as never), /options/i);
  assert.throws(() => proveCompletionSafety(model, { onProgress: null as never }), /onProgress|function/i);
  assert.throws(() => proveCompletionSafety({} as never), /model|SymbolicModel/i);

  assert.throws(
    () => proveCompletionSafety(model, { roundLimit: 1 }),
    /fixed point|round limit|incomplete/i,
    "a cap below the safe cycle depth fails closed",
  );
});

class SyntheticInvalidSuccessModel extends SymbolicModel {
  private readonly invalidTarget: number;
  private readonly injectedChoice: SymbolicChoice;

  constructor(scenario: Scenario, bounds: Readonly<Record<string, number>>) {
    super(scenario, bounds, { order: "interleaved", transitionMode: "relational", nodeLimit: 100_000, cacheLimit: 20_000 });
    this.invalidTarget = this.bdd.not(this.validDomain);
    this.injectedChoice = this.choices[0]!;
  }

  override preimage(target: number, choice?: SymbolicChoice): number {
    if (target === this.invalidTarget && choice === this.injectedChoice) return this.initial;
    return super.preimage(target, choice);
  }
}

class SyntheticUncoveredModel extends SymbolicModel {
  private readonly validTarget: number;
  private readonly injectedChoice: SymbolicChoice;

  constructor(scenario: Scenario, bounds: Readonly<Record<string, number>>) {
    super(scenario, bounds, { order: "blocked", transitionMode: "partitioned", nodeLimit: 100_000, cacheLimit: 20_000 });
    this.validTarget = this.validDomain;
    this.injectedChoice = this.choices[0]!;
  }

  override preimage(target: number, choice?: SymbolicChoice): number {
    if (target === this.validTarget && choice === this.injectedChoice) return 0;
    return super.preimage(target, choice);
  }
}

test("property wrapper propagates synthetic invalid-success and uncovered-action failures", () => {
  const scenario = validateScenario(SAFE_CYCLE);
  const invalidModel = new SyntheticInvalidSuccessModel(scenario, { energy: 1 });
  const invalid = proveCompletionSafety(invalidModel, { roundLimit: 64 });
  assert.notEqual(invalid.invalidSuccess, 0);
  assert.equal(invalid.initialInBad, true);
  assertCurrentOnly(invalidModel, invalid.invalidSuccess, "synthetic invalid-success root");

  const uncoveredModel = new SyntheticUncoveredModel(scenario, { energy: 1 });
  const uncovered = proveCompletionSafety(uncoveredModel, { roundLimit: 64 });
  assert.notEqual(uncovered.uncoveredEnabled, 0);
  assert.equal(uncovered.initialInBad, true);
  assertCurrentOnly(uncoveredModel, uncovered.uncoveredEnabled, "synthetic uncovered-action root");
});

test("property proof distinguishes isolated arithmetic faults and intermediate bound exits", () => {
  const arithmeticOnly = {
    ...REACHABLE_FAULTS,
    choices: REACHABLE_FAULTS.choices.filter(choice => choice.id !== "overflow-stock"),
  };
  checkScenario(arithmeticOnly, { stock: 1 }, "isolated-arithmetic", true);
  const intermediateBound = {
    ...REACHABLE_FAULTS,
    choices: REACHABLE_FAULTS.choices.filter(choice => choice.id !== "arithmetic-overflow")
      .map(choice => choice.id === "overflow-stock" ? {
        ...choice,
        effects: [
          { type: "adjustResource", resource: "stock", delta: 1 },
          { type: "setResource", resource: "stock", value: 0 },
          { type: "goTo", scene: "work" },
        ],
      } : choice),
  };
  checkScenario(intermediateBound, { stock: 1 }, "intermediate-bound-before-reset", true);
  for (const [raw, id, reason] of [
    [arithmeticOnly, "arithmetic-overflow", "arithmetic-error"],
    [intermediateBound, "overflow-stock", "bound-exit"],
  ] as const) {
    const graph = buildRawGraph(raw, { stock: 1 });
    const source = graph.states.find(state => state.scene === "work" && state.status === "playing" && state.resources.stock === 1)!;
    const choice = graph.scenario.choices.find(choice => choice.id === id)!;
    const transition = rawTransition(graph.scenario, source, choice, { stock: 1 }, graph.endings);
    assert.equal(transition.kind, "fault");
    if (transition.kind === "fault") assert.equal(transition.reason, reason);
    assert.equal(graph.bad.has(graph.initialKey), true);
  }
});

test("property proof rejects mixed-phase predecessors and propagates observer interruptions", () => {
  class MixedPhaseModel extends SymbolicModel {
    override preimage(target: number, choice?: SymbolicChoice): number {
      if (target === this.validDomain && choice === this.choices[0]) return this.bdd.variable(this.nextVariables[0]!);
      return super.preimage(target, choice);
    }
  }
  for (const transitionMode of ["relational", "partitioned"] as const) {
    const mixed = new MixedPhaseModel(SAFE_CYCLE, { energy: 1 }, { transitionMode });
    assert.throws(() => proveCompletionSafety(mixed), /current-only/);
    const model = new SymbolicModel(SAFE_CYCLE, { energy: 1 }, { transitionMode });
    const interruption = new Error("intentional bounded observer interruption");
    assert.throws(() => proveCompletionSafety(model, { onProgress: () => { throw interruption; } }), error => error === interruption);
  }
});
