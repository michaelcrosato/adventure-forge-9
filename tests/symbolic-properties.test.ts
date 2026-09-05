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
import { proveCompletionSafetyByObligation } from "../src/verification/symbolic-obligations.js";

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

const ARITHMETIC_ONLY = {
  ...REACHABLE_FAULTS,
  choices: REACHABLE_FAULTS.choices.filter(choice => choice.id !== "overflow-stock"),
};

const INTERMEDIATE_BOUND = {
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

const OBLIGATION_DEPTH = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The route begins." }] },
    { id: "middle", title: "Middle", text: [{ text: "The middle road is open." }] },
    { id: "work", title: "Work", text: [{ text: "The work yard is ahead." }] },
  ],
  choices: [
    {
      id: "enter-middle",
      scene: "start",
      label: "Enter the middle road",
      description: "Walk from the start to the middle road.",
      effects: [{ type: "goTo", scene: "middle" }],
    },
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the start",
      description: "Finish the route from the start.",
      effects: [],
      outcome: { status: "completed", summary: "The route is complete." },
    },
    {
      id: "enter-work",
      scene: "middle",
      label: "Enter the work yard",
      description: "Walk from the middle road to the work yard.",
      effects: [{ type: "goTo", scene: "work" }],
    },
    {
      id: "finish-middle",
      scene: "middle",
      label: "Finish in the middle",
      description: "Finish the route from the middle road.",
      effects: [],
      outcome: { status: "completed", summary: "The route is complete." },
    },
    {
      id: "arithmetic-work-fault",
      scene: "work",
      label: "Force the work fault",
      description: "Push the full tank beyond safe integer arithmetic.",
      when: [{ type: "resourceAtLeast", resource: "stock", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "stock", delta: Number.MAX_SAFE_INTEGER },
        { type: "goTo", scene: "work" },
      ],
    },
    {
      id: "finish-work",
      scene: "work",
      label: "Finish the work yard",
      description: "Finish the route from the work yard.",
      effects: [],
      outcome: { status: "completed", summary: "The route is complete." },
    },
  ],
} as const;

const FAULT_ONLY_CONTINUATION = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The only road leaves the start." }] },
    { id: "middle", title: "Middle", text: [{ text: "The only road continues." }] },
    { id: "work", title: "Work", text: [{ text: "The only remaining action can fail." }] },
    { id: "safe", title: "Safe", text: [{ text: "This unreachable branch can finish." }] },
  ],
  choices: [
    {
      id: "enter-middle-only",
      scene: "start",
      label: "Take the only road",
      description: "Walk from the start to the middle road.",
      effects: [{ type: "goTo", scene: "middle" }],
    },
    {
      id: "enter-work-only",
      scene: "middle",
      label: "Continue to the yard",
      description: "Walk from the middle road to the work yard.",
      effects: [{ type: "goTo", scene: "work" }],
    },
    {
      id: "arithmetic-work-only-fault",
      scene: "work",
      label: "Force the only failure",
      description: "Push the full tank beyond safe integer arithmetic.",
      when: [{ type: "resourceAtLeast", resource: "stock", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "stock", delta: Number.MAX_SAFE_INTEGER },
        { type: "goTo", scene: "work" },
      ],
    },
    {
      id: "finish-safe-only",
      scene: "safe",
      label: "Finish the unreachable branch",
      description: "Finish the route from the unreachable safe branch.",
      effects: [],
      outcome: { status: "completed", summary: "The unreachable branch is complete." },
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

type ObligationKind =
  | "non-completion"
  | "arithmetic-error"
  | "bound-exit"
  | "invalid-success"
  | "uncovered-enabled";

interface ExpectedObligation {
  readonly key: string;
  readonly kind: ObligationKind;
  readonly choiceId?: string;
  readonly seed: ReadonlySet<string>;
  readonly bad: ReadonlySet<string>;
}

function obligationKey(kind: ObligationKind, choiceId?: string): string {
  return kind + ":" + (choiceId ?? "");
}

function predecessorClosure(graph: RawGraph, seed: ReadonlySet<string>): ReadonlySet<string> {
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

/** Build each seed independently from the raw transition interpreter. */
function expectedObligations(
  graph: RawGraph,
  nonCompletionMode: "direct" | "failure-absorbed" = "direct",
): readonly ExpectedObligation[] {
  const expected: ExpectedObligation[] = [];
  const completedStates = new Set(graph.states
    .filter(state => state.status === "completed")
    .map(state => stateKey(state, graph.resources, graph.flags)));
  const failureSeed = new Set<string>([
    ...graph.faults,
    ...graph.invalidSuccess,
    ...graph.uncoveredEnabled,
  ]);
  const completionOrFailure = predecessorClosure(graph, new Set([
    ...completedStates,
    ...failureSeed,
  ]));
  const nonCompletionSeed = new Set(graph.states
    .filter(state => state.status === "playing" && !(nonCompletionMode === "failure-absorbed"
      ? completionOrFailure
      : graph.completable).has(stateKey(state, graph.resources, graph.flags)))
    .map(state => stateKey(state, graph.resources, graph.flags)));
  expected.push({
    key: obligationKey("non-completion"),
    kind: "non-completion",
    seed: nonCompletionSeed,
    bad: predecessorClosure(graph, nonCompletionSeed),
  });

  for (const choice of graph.scenario.choices) {
    const seeds: Record<"arithmetic-error" | "bound-exit" | "invalid-success" | "uncovered-enabled", Set<string>> = {
      "arithmetic-error": new Set(),
      "bound-exit": new Set(),
      "invalid-success": new Set(),
      "uncovered-enabled": new Set(),
    };
    for (const state of graph.states) {
      if (!choiceEnabled(choice, state)) continue;
      const from = stateKey(state, graph.resources, graph.flags);
      const transition = rawTransition(graph.scenario, state, choice, graph.bounds, graph.endings);
      if (transition.kind === "fault") {
        seeds[transition.reason].add(from);
        continue;
      }
      if (!graph.statesByKey.has(stateKey(transition.state, graph.resources, graph.flags))) {
        seeds["invalid-success"].add(from);
      }
    }
    for (const kind of ["arithmetic-error", "bound-exit", "invalid-success", "uncovered-enabled"] as const) {
      expected.push({
        key: obligationKey(kind, choice.id),
        kind,
        choiceId: choice.id,
        seed: seeds[kind],
        bad: predecessorClosure(graph, seeds[kind]),
      });
    }
  }
  return expected;
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

function checkObligationScenario(
  raw: unknown,
  bounds: Readonly<Record<string, number>>,
  label: string,
  allLayouts = false,
  nonCompletionMode: "direct" | "failure-absorbed" = "direct",
): void {
  const graph = buildRawGraph(raw, bounds);
  const expected = expectedObligations(graph, nonCompletionMode);
  const expectedByKey = new Map(expected.map(obligation => [obligation.key, obligation]));
  const orders = allLayouts ? (["interleaved", "blocked"] as const) : (["interleaved"] as const);
  const modes = ["relational", "partitioned"] as const;
  const reorders = allLayouts ? [false, true] : [false];
  for (const order of orders) for (const transitionMode of modes) for (const reorder of reorders) {
    const model = modelFor(graph.scenario, bounds, order, transitionMode, reorder);
    const combined = proveCompletionSafety(model, { roundLimit: 64 });
    assert.equal(
      combined.completable,
      formulaForKeys(model, graph, graph.completable),
      label + "/" + order + "/" + transitionMode + "/" + (reorder ? "reversed" : "default") + " source completion root",
    );
    assert.equal(
      combined.bad,
      formulaForKeys(model, graph, graph.bad),
      label + "/" + order + "/" + transitionMode + "/" + (reorder ? "reversed" : "default") + " old combined bad root",
    );

    const callbackIds = new Set<string>();
    const nonzeroOwners = new Set<SymbolicModel>();
    let copiedBad = 0;
    const progress: {
      readonly phase: "completion" | "completion-or-failure" | "obligation";
      readonly id?: string;
      readonly round: number;
      readonly nodes: number;
      readonly fixed: boolean;
    }[] = [];
    const split = proveCompletionSafetyByObligation(model, {
      roundLimit: 64,
      nonCompletionMode,
      onProgress: event => {
        progress.push(event);
        assert.ok(event.phase === "completion" || event.phase === "completion-or-failure" || event.phase === "obligation");
        assert.ok(Number.isSafeInteger(event.round) && event.round >= 1);
        assert.ok(Number.isSafeInteger(event.nodes) && event.nodes >= 2);
        if (event.phase === "obligation") assert.equal(typeof event.id, "string");
      },
      onObligation: payload => {
        const summary = payload.summary;
        const key = obligationKey(summary.kind, summary.choiceId);
        const fixture = expectedByKey.get(key);
        assert.ok(fixture !== undefined, label + " has an expected obligation for " + key);
        assert.equal(callbackIds.has(summary.id), false, label + " obligation IDs are unique");
        callbackIds.add(summary.id);
        assert.ok(Object.isFrozen(summary), label + " " + key + " summary is frozen");
        assert.equal(Object.hasOwn(summary, "seed"), false, label + " " + key + " summary hides seed root");
        assert.equal(Object.hasOwn(summary, "bad"), false, label + " " + key + " summary hides bad root");
        assert.equal(Object.hasOwn(summary, "model"), false, label + " " + key + " summary hides owner");
        assert.ok(Number.isSafeInteger(summary.rounds) && summary.rounds >= 0);
        assert.ok(Number.isSafeInteger(summary.nodes) && summary.nodes >= 2);
        assert.equal(summary.seedZero, fixture!.seed.size === 0, label + " " + key + " seed emptiness");
        assert.equal(summary.initialInBad, fixture!.bad.has(graph.initialKey), label + " " + key + " initial membership");
        assert.ok(payload.model instanceof SymbolicModel);
        assert.equal(
          payload.model.bdd.exists(payload.seed, payload.model.nextVariables),
          payload.seed,
          label + " " + key + " seed is current-only",
        );
        assert.equal(
          payload.model.bdd.exists(payload.bad, payload.model.nextVariables),
          payload.bad,
          label + " " + key + " closure is current-only",
        );
        assert.equal(payload.seed === 0, summary.seedZero, label + " " + key + " seed/root agreement");
        if (summary.seedZero) {
          assert.strictEqual(payload.model, model, label + " " + key + " zero seed may use original owner");
        } else {
          assert.notStrictEqual(payload.model, model, label + " " + key + " uses a fresh owner");
          assert.notStrictEqual(payload.model.bdd, model.bdd, label + " " + key + " uses a fresh BDD owner");
          assert.equal(nonzeroOwners.has(payload.model), false, label + " " + key + " gets its own fresh owner");
          nonzeroOwners.add(payload.model);
        }
        assert.deepEqual(payload.model.fieldOrder, model.fieldOrder, label + " " + key + " field order is preserved");
        assert.deepEqual(payload.model.currentVariables, model.currentVariables, label + " " + key + " current layout is preserved");
        assert.deepEqual(payload.model.nextVariables, model.nextVariables, label + " " + key + " next layout is preserved");
        assert.equal(payload.model.transitionMode, model.transitionMode, label + " " + key + " transition mode is preserved");

        const sourceRoots = payload.model === model
          ? [payload.seed, payload.bad] as const
          : payload.model.bdd.copyForestTo(model.bdd, [payload.seed, payload.bad]);
        const sourceSeed = sourceRoots[0]!;
        const sourceBad = sourceRoots[1]!;
        assert.equal(
          sourceSeed,
          formulaForKeys(model, graph, fixture!.seed),
          label + " " + key + " seed matches the independent oracle",
        );
        assert.equal(
          sourceBad,
          formulaForKeys(model, graph, fixture!.bad),
          label + " " + key + " backward closure matches the independent oracle",
        );
        copiedBad = model.bdd.or(copiedBad, sourceBad);
      },
    });
    assert.equal(split.complete, true, label + " split proof completes");
    assert.strictEqual(split.model, model, label + " split result keeps the original owner");
    assert.equal(split.completable, combined.completable, label + " split completion root matches combined proof");
    assert.equal(split.completionRounds, combined.completionRounds, label + " completion rounds match");
    assert.equal(split.initialInBad, combined.initialInBad, label + " split initial result matches combined proof");
    assert.ok(progress.some(event => event.phase === "completion"), label + " reports completion progress");
    if (nonCompletionMode === "failure-absorbed") {
      const completionOrFailureSeed = new Set([
        ...graph.states.filter(state => state.status === "completed")
          .map(state => stateKey(state, graph.resources, graph.flags)),
        ...graph.faults,
        ...graph.invalidSuccess,
        ...graph.uncoveredEnabled,
      ]);
      assert.equal(
        split.completionOrFailure,
        formulaForKeys(model, graph, predecessorClosure(graph, completionOrFailureSeed)),
        label + " completion-or-failure root matches the independent oracle",
      );
      const completionOrFailureRounds = split.completionOrFailureRounds;
      assert.ok(completionOrFailureRounds !== undefined && Number.isSafeInteger(completionOrFailureRounds)
        && completionOrFailureRounds >= 1, label + " completion-or-failure rounds are bounded");
      assert.ok(progress.some(event => event.phase === "completion-or-failure"), label + " reports completion-or-failure progress");
    } else {
      assert.equal(split.completionOrFailure, undefined, label + " direct mode omits completion-or-failure root");
      assert.equal(split.completionOrFailureRounds, undefined, label + " direct mode omits completion-or-failure rounds");
    }
    if (expected.some(obligation => obligation.seed.size > 0)) {
      assert.ok(progress.some(event => event.phase === "obligation"), label + " reports obligation progress");
    }

    assert.equal(split.obligations.length, 1 + 4 * model.choices.length, label + " retains every obligation");
    assert.equal(new Set(split.obligations.map(summary => summary.id)).size, split.obligations.length, label + " summary IDs are unique");
    assert.equal(callbackIds.size, split.obligations.length, label + " reports every obligation to the callback");
    for (const summary of split.obligations) {
      const key = obligationKey(summary.kind, summary.choiceId);
      const fixture = expectedByKey.get(key);
      assert.ok(fixture !== undefined, label + " returned an expected obligation for " + key);
      assert.ok(Object.isFrozen(summary), label + " returned " + key + " summary is frozen");
      assert.equal(Object.hasOwn(summary, "seed"), false, label + " returned " + key + " hides seed root");
      assert.equal(Object.hasOwn(summary, "bad"), false, label + " returned " + key + " hides bad root");
      assert.equal(summary.seedZero, fixture!.seed.size === 0, label + " returned " + key + " seed emptiness");
      assert.equal(summary.initialInBad, fixture!.bad.has(graph.initialKey), label + " returned " + key + " initial membership");
    }
    assert.equal(copiedBad, combined.bad, label + " split bad closures equal the old combined root");
    assert.equal(copiedBad, formulaForKeys(model, graph, graph.bad), label + " split bad closures match the oracle");
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

class MixedAbsorbedModel extends SyntheticInvalidSuccessModel {
  override preimage(target: number, choice?: SymbolicChoice): number {
    if (choice === undefined && target !== this.completed) {
      return this.bdd.variable(this.nextVariables[0]!);
    }
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

test("failure absorption retains synthetic invalid-success and uncovered-enabled cones", () => {
  const scenario = validateScenario(TERMINAL_ONLY);
  for (const [model, kind] of [
    [new SyntheticInvalidSuccessModel(scenario, { token: 0 }), "invalid-success"],
    [new SyntheticUncoveredModel(scenario, { token: 0 }), "uncovered-enabled"],
  ] as const) {
    const direct = proveCompletionSafety(model, { roundLimit: 64 });
    let directBad = 0;
    const directSplit = proveCompletionSafetyByObligation(model, {
      roundLimit: 64,
      onObligation: payload => {
        const copied = payload.model === model
          ? payload.bad
          : payload.model.bdd.copyForestTo(model.bdd, [payload.bad])[0]!;
        directBad = model.bdd.or(directBad, copied);
      },
    });
    let absorbedBad = 0;
    const absorbed = proveCompletionSafetyByObligation(model, {
      roundLimit: 64,
      nonCompletionMode: "failure-absorbed",
      onObligation: payload => {
        const copied = payload.model === model
          ? payload.bad
          : payload.model.bdd.copyForestTo(model.bdd, [payload.bad])[0]!;
        absorbedBad = model.bdd.or(absorbedBad, copied);
      },
    });
    const directSummary = directSplit.obligations.find(candidate => candidate.kind === kind
      && candidate.choiceId === model.choices[0]!.id);
    const summary = absorbed.obligations.find(candidate => candidate.kind === kind
      && candidate.choiceId === model.choices[0]!.id);
    const directNonCompletion = directSplit.obligations.find(candidate => candidate.kind === "non-completion")!;
    const absorbedNonCompletion = absorbed.obligations.find(candidate => candidate.kind === "non-completion")!;
    assert.equal(direct.initialInBad, true, "synthetic direct failure reaches the initial state");
    assert.equal(directSplit.initialInBad, true, "synthetic direct split reaches the initial state");
    assert.equal(directBad, direct.bad, "synthetic direct split equals the old aggregate");
    assert.equal(absorbedBad, direct.bad, "synthetic absorbed split equals the old aggregate");
    assert.equal(absorbed.completable, direct.completable, "synthetic absorption preserves the completion root");
    assert.ok(directSummary !== undefined, "synthetic direct failure obligation is retained");
    assert.equal(directNonCompletion.seedZero, false, "synthetic initial state is directly non-completable");
    assert.equal(absorbedNonCompletion.seedZero, true, "synthetic failure absorption removes that residual seed");
    assert.ok(summary !== undefined, "synthetic failure obligation is retained");
    assert.equal(summary!.seedZero, false, "synthetic failure seed is nonzero");
    assert.equal(summary!.initialInBad, true, "synthetic failure reaches the initial state");
    assert.equal(absorbed.initialInBad, true, "synthetic failure poisons the aggregate property");
    assert.equal(model.bdd.and(model.initial, absorbed.completionOrFailure!), model.initial, "failure-or-completion closure includes the injected initial state");
    assert.notEqual(absorbed.completionOrFailure, undefined, "absorbed mode returns its closure root");
    const completionOrFailureRounds = absorbed.completionOrFailureRounds;
    assert.ok(completionOrFailureRounds !== undefined && Number.isSafeInteger(completionOrFailureRounds)
      && completionOrFailureRounds >= 1);
  }
});

test("failure-absorbed mode fails closed at its own fixed point and snapshots options", () => {
  const depthModel = modelFor(validateScenario(FAULT_ONLY_CONTINUATION), { stock: 1 }, "interleaved", "relational", false);
  const depthProgress: {
    readonly phase: "completion" | "completion-or-failure" | "obligation";
    readonly id?: string;
    readonly round: number;
    readonly nodes: number;
    readonly fixed: boolean;
  }[] = [];
  assert.throws(
    () => proveCompletionSafetyByObligation(depthModel, {
      roundLimit: 2,
      nonCompletionMode: "failure-absorbed",
      onProgress: event => depthProgress.push(event),
    }),
    /completion-or-failure.*round limit/i,
    "the absorbed closure has its own bounded fixed point",
  );
  assert.ok(depthProgress.some(event => event.phase === "completion" && event.fixed), "completion converges before W");
  assert.ok(depthProgress.some(event => event.phase === "completion-or-failure"
    && event.round === 2
    && !event.fixed), "W consumes the bounded rounds after completion");

  const observerModel = new SyntheticInvalidSuccessModel(validateScenario(TERMINAL_ONLY), { token: 0 });
  const observerError = new Error("intentional completion-or-failure interruption");
  assert.throws(
    () => proveCompletionSafetyByObligation(observerModel, {
      nonCompletionMode: "failure-absorbed",
      onProgress: event => {
        if (event.phase === "completion-or-failure") throw observerError;
      },
    }),
    error => error === observerError,
    "the absorbed fixed-point observer propagates its interruption",
  );

  const mixed = new MixedAbsorbedModel(validateScenario(TERMINAL_ONLY), { token: 0 });
  assert.throws(
    () => proveCompletionSafetyByObligation(mixed, { nonCompletionMode: "failure-absorbed" }),
    /completion-or-failure predecessor.*current-only/i,
    "the absorbed predecessor rejects mixed current/next support",
  );

  const getterModel = modelFor(validateScenario(REACHABLE_TRAP), { water: 1 }, "interleaved", "relational", false);
  let modeReads = 0;
  let roundReads = 0;
  const options = {
    get nonCompletionMode(): "failure-absorbed" {
      modeReads++;
      return "failure-absorbed";
    },
    get roundLimit(): number {
      roundReads++;
      return 64;
    },
  };
  proveCompletionSafetyByObligation(getterModel, options);
  assert.equal(modeReads, 1, "absorbed mode option is read once");
  assert.equal(roundReads, 1, "absorbed round limit is read once");
});

test("property proof distinguishes isolated arithmetic faults and intermediate bound exits", () => {
  checkScenario(ARITHMETIC_ONLY, { stock: 1 }, "isolated-arithmetic", true);
  checkScenario(INTERMEDIATE_BOUND, { stock: 1 }, "intermediate-bound-before-reset", true);
  for (const [raw, id, reason] of [
    [ARITHMETIC_ONLY, "arithmetic-overflow", "arithmetic-error"],
    [INTERMEDIATE_BOUND, "overflow-stock", "bound-exit"],
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

test("split safety obligations match the finite oracle and preserve owner boundaries", () => {
  checkObligationScenario(SAFE_CYCLE, { energy: 1 }, "split-safe-cycle", true);
  checkObligationScenario(REACHABLE_TRAP, { water: 1 }, "split-reachable-trap");
  checkObligationScenario(UNREACHABLE_BAD, { stock: 1 }, "split-unreachable-bad");
  checkObligationScenario(REACHABLE_FAULTS, { stock: 1 }, "split-reachable-faults");
  checkObligationScenario(TERMINAL_ONLY, { token: 0 }, "split-terminal-only");
  checkObligationScenario(ARITHMETIC_ONLY, { stock: 1 }, "split-isolated-arithmetic", true);
  checkObligationScenario(INTERMEDIATE_BOUND, { stock: 1 }, "split-intermediate-bound", true);
});

test("failure-absorbed non-completion seeds preserve the exact aggregate bad set", () => {
  checkObligationScenario(SAFE_CYCLE, { energy: 1 }, "absorbed-safe-cycle", true, "failure-absorbed");
  checkObligationScenario(REACHABLE_TRAP, { water: 1 }, "absorbed-nofault-trap", false, "failure-absorbed");
  checkObligationScenario(REACHABLE_FAULTS, { stock: 1 }, "absorbed-reachable-faults", true, "failure-absorbed");
  checkObligationScenario(UNREACHABLE_BAD, { stock: 1 }, "absorbed-unreachable-fault", false, "failure-absorbed");
  checkObligationScenario(TERMINAL_ONLY, { token: 0 }, "absorbed-terminal-only", false, "failure-absorbed");
  checkObligationScenario(OBLIGATION_DEPTH, { stock: 1 }, "absorbed-completion-plus-fault", false, "failure-absorbed");
  checkObligationScenario(FAULT_ONLY_CONTINUATION, { stock: 1 }, "absorbed-only-fault-continuation", false, "failure-absorbed");
  checkObligationScenario(ARITHMETIC_ONLY, { stock: 1 }, "absorbed-isolated-arithmetic", true, "failure-absorbed");
  checkObligationScenario(INTERMEDIATE_BOUND, { stock: 1 }, "absorbed-intermediate-bound", true, "failure-absorbed");
});

test("failure absorption removes only-fault non-completion states without changing the aggregate result", () => {
  const graph = buildRawGraph(FAULT_ONLY_CONTINUATION, { stock: 1 });
  const directNonCompletion = expectedObligations(graph, "direct").find(obligation => obligation.kind === "non-completion")!;
  const absorbedNonCompletion = expectedObligations(graph, "failure-absorbed").find(obligation => obligation.kind === "non-completion")!;
  assert.ok(directNonCompletion.seed.size > 0, "the only-fault route has non-completable states");
  assert.ok(absorbedNonCompletion.seed.size < directNonCompletion.seed.size, "failure absorption removes a nonempty residual");
  const failureCone = predecessorClosure(graph, new Set([
    ...graph.faults,
    ...graph.invalidSuccess,
    ...graph.uncoveredEnabled,
  ]));
  const onlyFaultStates = [...directNonCompletion.seed].filter(key => failureCone.has(key));
  assert.ok(onlyFaultStates.length > 0, "the route has non-completable states whose continuation reaches a fault");
  assert.equal(onlyFaultStates.some(key => absorbedNonCompletion.seed.has(key)), false, "failure absorption removes every only-fault seed");
  assert.equal(absorbedNonCompletion.seed.has(graph.initialKey), false, "failure absorption removes the initial only-fault seed");
  assert.ok(absorbedNonCompletion.seed.size > 0, "unrelated out-of-route parameter states remain as non-completion seeds");

  const model = modelFor(graph.scenario, { stock: 1 }, "interleaved", "relational", false);
  const direct = proveCompletionSafety(model, { roundLimit: 64 });
  let absorbedBad = 0;
  const absorbed = proveCompletionSafetyByObligation(model, {
    roundLimit: 64,
    nonCompletionMode: "failure-absorbed",
    onObligation: payload => {
      const copied = payload.model === model
        ? payload.bad
        : payload.model.bdd.copyForestTo(model.bdd, [payload.bad])[0]!;
      absorbedBad = model.bdd.or(absorbedBad, copied);
    },
  });
  assert.equal(absorbedBad, direct.bad, "absorbed failure cones equal the direct aggregate bad root");
  assert.equal(absorbedBad, formulaForKeys(model, graph, graph.bad), "absorbed result matches the raw oracle");
  assert.equal(absorbed.completable, direct.completable, "absorption leaves the completion root unchanged");
  assert.equal(absorbed.initialInBad, direct.initialInBad, "absorption leaves initial safety unchanged");
  assert.equal(model.bdd.and(model.initial, absorbed.completionOrFailure!), model.initial, "failure-or-completion closure contains the initial state");
  const summary = absorbed.obligations.find(obligation => obligation.kind === "non-completion")!;
  assert.equal(summary.seedZero, absorbedNonCompletion.seed.size === 0, "the absorbed residual seed matches the independent oracle");
  assert.equal(summary.initialInBad, absorbedNonCompletion.bad.has(graph.initialKey), "the absorbed residual membership matches the independent oracle");
});

class SameOwnerFreshModel extends SymbolicModel {
  override fresh(): SymbolicModel {
    return this;
  }
}

class WrongBoundFreshModel extends SymbolicModel {
  freshCalls = 0;

  override fresh(): SymbolicModel {
    this.freshCalls++;
    return new SymbolicModel(this.scenario, { water: 2 }, {
      order: "interleaved",
      transitionMode: this.transitionMode,
      fieldOrder: this.fieldOrder,
      nodeLimit: 100_000,
      cacheLimit: 20_000,
    });
  }
}

test("split safety obligations fail closed for invalid fresh owners and layouts", () => {
  const scenario = validateScenario(REACHABLE_TRAP);
  for (const nonCompletionMode of ["direct", "failure-absorbed"] as const) {
    const sameOwner = new SameOwnerFreshModel(scenario, { water: 1 }, {
      order: "interleaved",
      transitionMode: "relational",
      nodeLimit: 100_000,
      cacheLimit: 20_000,
    });
    assert.throws(
      () => proveCompletionSafetyByObligation(sameOwner, { roundLimit: 64, nonCompletionMode }),
      /fresh|owner|distinct/i,
      "a fresh obligation manager cannot alias the source owner",
    );

    const wrongBounds = new WrongBoundFreshModel(scenario, { water: 3 });
    assert.throws(
      () => proveCompletionSafetyByObligation(wrongBounds, { roundLimit: 64, nonCompletionMode }),
      /domain|layout|bound|equiv|owner|fresh/i,
      "same-width but different bounds cannot cross-copy symbolic roots",
    );
    assert.ok(wrongBounds.freshCalls > 0, "the trap fixture exercises a nonzero fresh obligation");
  }
});

test("split safety obligations reject invalid caps and propagate observer failures", () => {
  const model = modelFor(validateScenario(REACHABLE_TRAP), { water: 1 }, "interleaved", "partitioned", false);
  for (const roundLimit of [null, 0, -1, 1.5, Number.NaN, "64"] as const) {
    assert.throws(
      () => proveCompletionSafetyByObligation(model, { roundLimit: roundLimit as never }),
      /roundLimit|round limit|fixed point|incomplete|options/i,
      "rejects split roundLimit=" + String(roundLimit),
    );
  }
  assert.throws(() => proveCompletionSafetyByObligation(model, null as never), /options/i);
  assert.throws(
    () => proveCompletionSafetyByObligation(model, { onProgress: null as never }),
    /onProgress|function/i,
  );
  assert.throws(
    () => proveCompletionSafetyByObligation(model, { onObligation: null as never }),
    /onObligation|function/i,
  );
  assert.throws(
    () => proveCompletionSafetyByObligation(model, { nonCompletionMode: null as never }),
    /nonCompletionMode|mode/i,
  );
  assert.throws(
    () => proveCompletionSafetyByObligation(model, { nonCompletionMode: "unsupported" as never }),
    /nonCompletionMode|mode/i,
  );
  assert.throws(
    () => proveCompletionSafetyByObligation(model, { roundLimit: 1 }),
    /fixed point|round limit|incomplete/i,
    "a split cap below the safe cycle depth fails closed",
  );

  const obligationDepth = modelFor(validateScenario(OBLIGATION_DEPTH), { stock: 1 }, "interleaved", "relational", false);
  const depthProgress: {
    readonly phase: "completion" | "completion-or-failure" | "obligation";
    readonly id?: string;
    readonly round: number;
    readonly nodes: number;
    readonly fixed: boolean;
  }[] = [];
  assert.throws(
    () => proveCompletionSafetyByObligation(obligationDepth, {
      roundLimit: 2,
      onProgress: event => depthProgress.push(event),
    }),
    /obligation arithmetic-error:arithmetic-work-fault.*round limit/i,
    "the per-obligation cap fails after completion itself converges",
  );
  assert.ok(depthProgress.some(event => event.phase === "completion" && event.fixed), "completion fixed point was reached before the cap");
  assert.ok(depthProgress.some(event => event.phase === "obligation"
    && event.id === "arithmetic-error:arithmetic-work-fault"
    && event.round === 2
    && !event.fixed), "the arithmetic obligation consumed the bounded rounds");

  const progressError = new Error("intentional split progress interruption");
  assert.throws(
    () => proveCompletionSafetyByObligation(model, {
      onProgress: () => { throw progressError; },
    }),
    error => error === progressError,
  );
  const obligationError = new Error("intentional split obligation interruption");
  assert.throws(
    () => proveCompletionSafetyByObligation(model, {
      onObligation: () => { throw obligationError; },
    }),
    error => error === obligationError,
  );
});
