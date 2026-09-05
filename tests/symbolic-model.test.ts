import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import test from "node:test";
import { validateScenario, type Choice, type Condition, type Effect, type Scenario } from "../src/engine/content.js";
import {
  SymbolicModel,
  SymbolicTransitionError,
  symbolicReachability,
} from "../src/verification/symbolic-model.js";

interface RawScenario {
  version: 1;
  initialScene: string;
  initialResources: Record<string, number>;
  initialFacts: string[];
  clocks?: { id: string; resource: string; max: number }[];
  scenes: { id: string; title: string; text: { text: string; when?: RawCondition[] }[] }[];
  choices: RawChoice[];
}

type RawCondition =
  | { type: "flag"; flag: string; value: boolean }
  | { type: "resourceAtLeast" | "resourceAtMost"; resource: string; value: number };
type RawEffect =
  | { type: "setFlag"; flag: string; value: boolean }
  | { type: "setResource"; resource: string; value: number }
  | { type: "adjustResource"; resource: string; delta: number }
  | { type: "advanceClock"; clock: string; delta: number }
  | { type: "addFact"; fact: string }
  | { type: "goTo"; scene: string };
interface RawChoice {
  id: string;
  scene: string;
  label: string;
  description: string;
  when?: RawCondition[];
  effects: RawEffect[];
  outcome?: { status: "completed" | "departed" | "dead"; summary: string };
}

function scene(id: string, text = `${id} scene.`): RawScenario["scenes"][number] {
  return { id, title: id[0]!.toUpperCase() + id.slice(1), text: [{ text }] };
}

function terminal(
  id: string,
  sceneId: string,
  status: "completed" | "departed" | "dead",
  summary: string,
  effects: RawEffect[] = [],
  when?: RawCondition[],
): RawChoice {
  return { id, scene: sceneId, label: id, description: id, ...(when === undefined ? {} : { when }), effects, outcome: { status, summary } };
}

/**
 * One small fixture exercises every current DSL operation. The two start
 * preparations deliberately correlate stock with ready: the symbolic model
 * must not invent the mixed combinations. The low preparation has only dead
 * or departed exits, while the rich preparation can complete through either a
 * direct terminal or a resettable clock route.
 */
const ORDERED_SCENARIO: RawScenario = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 1, tide: 0 },
  initialFacts: [],
  clocks: [{ id: "phase-clock", resource: "tide", max: 2 }],
  scenes: [
    scene("start", "The preparation choices are correlated."),
    scene("fork", "The fork tests the carried preparation."),
    scene("reset", "The resettable phase can be reopened."),
    scene("finish", "A cleared phase can be completed."),
    scene("dead-hub", "No legal action remains here."),
    scene("orphan", "No action can reach this scene."),
  ],
  choices: [
    {
      id: "prepare-low",
      scene: "start",
      label: "Prepare the low route",
      description: "Carry the low stock route.",
      when: [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtMost", resource: "stock", value: 1 },
      ],
      effects: [
        { type: "setResource", resource: "stock", value: 1 },
        { type: "setFlag", flag: "ready", value: false },
        { type: "setFlag", flag: "never", value: false },
        { type: "addFact", fact: "dry-tanks" },
        { type: "goTo", scene: "fork" },
      ],
    },
    {
      id: "prepare-rich",
      scene: "start",
      label: "Prepare the rich route",
      description: "Carry the rich stock route.",
      when: [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtLeast", resource: "stock", value: 1 },
      ],
      effects: [
        { type: "setResource", resource: "stock", value: 2 },
        { type: "setFlag", flag: "ready", value: true },
        { type: "addFact", fact: "dry-tanks" },
        { type: "goTo", scene: "fork" },
      ],
    },
    {
      id: "to-dead-hub",
      scene: "start",
      label: "Take the dead end",
      description: "Take the route with no legal continuation.",
      effects: [{ type: "goTo", scene: "dead-hub" }],
    },
    {
      id: "unreachable-start",
      scene: "start",
      label: "Take the unreachable branch",
      description: "This branch is gated by a flag with no writer.",
      when: [{ type: "flag", flag: "never", value: true }],
      effects: [{ type: "goTo", scene: "orphan" }],
    },
    {
      id: "reset-through-fork",
      scene: "fork",
      label: "Reset through the fork",
      description: "Clear the ready mark and advance the phase.",
      when: [
        { type: "flag", flag: "ready", value: true },
        { type: "resourceAtLeast", resource: "stock", value: 1 },
        { type: "resourceAtMost", resource: "tide", value: 2 },
      ],
      effects: [
        // Later effects must still apply after this navigation effect.
        { type: "goTo", scene: "reset" },
        { type: "setFlag", flag: "ready", value: false },
        { type: "advanceClock", clock: "phase-clock", delta: 2 },
        { type: "adjustResource", resource: "stock", delta: -1 },
      ],
    },
    terminal(
      "finish-rich",
      "fork",
      "completed",
      "Rich work complete.",
      [
        { type: "setFlag", flag: "sealed", value: true },
        { type: "setResource", resource: "stock", value: 1 },
        { type: "addFact", fact: "dry-tanks" },
      ],
      [
        { type: "flag", flag: "ready", value: true },
        { type: "resourceAtLeast", resource: "stock", value: 2 },
        { type: "resourceAtMost", resource: "tide", value: 2 },
      ],
    ),
    terminal(
      "depart-fork",
      "fork",
      "departed",
      "The low route is left behind.",
      [{ type: "setFlag", flag: "sealed", value: false }],
      [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtMost", resource: "stock", value: 1 },
      ],
    ),
    terminal(
      "die-fork",
      "fork",
      "dead",
      "The low route is lost.",
      [{ type: "advanceClock", clock: "phase-clock", delta: 1 }],
      [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtMost", resource: "tide", value: 2 },
      ],
    ),
    {
      id: "reopen-reset",
      scene: "reset",
      label: "Reopen the reset",
      description: "Reopen the phase and saturate its clock.",
      when: [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtMost", resource: "tide", value: 2 },
      ],
      effects: [
        { type: "setFlag", flag: "ready", value: true },
        { type: "setResource", resource: "stock", value: 2 },
        { type: "advanceClock", clock: "phase-clock", delta: 2 },
        { type: "goTo", scene: "fork" },
      ],
    },
    {
      id: "clear-reset",
      scene: "reset",
      label: "Clear the reset",
      description: "Clear the phase and proceed to finish.",
      when: [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtMost", resource: "tide", value: 2 },
      ],
      effects: [
        { type: "setFlag", flag: "sealed", value: true },
        { type: "goTo", scene: "finish" },
      ],
    },
    terminal(
      "finish-cleared",
      "finish",
      "completed",
      "Cleared work complete.",
      [
        { type: "setFlag", flag: "finished", value: true },
        { type: "adjustResource", resource: "stock", delta: -1 },
        { type: "addFact", fact: "dry-tanks" },
      ],
      [
        { type: "flag", flag: "sealed", value: true },
        { type: "resourceAtLeast", resource: "stock", value: 1 },
      ],
    ),
    {
      id: "dead-locked",
      scene: "dead-hub",
      label: "Locked dead end",
      description: "The lock has no writer.",
      when: [{ type: "flag", flag: "never", value: true }],
      effects: [{ type: "goTo", scene: "dead-hub" }],
    },
    {
      id: "orphan-locked",
      scene: "orphan",
      label: "Locked orphan",
      description: "The orphan branch has no writer.",
      when: [{ type: "flag", flag: "never", value: true }],
      effects: [{ type: "goTo", scene: "orphan" }],
    },
  ],
};

const NO_COMPLETION_SCENARIO: RawScenario = {
  version: 1,
  initialScene: "start",
  initialResources: { token: 0 },
  initialFacts: [],
  scenes: [
    scene("start", "The route has no completed resolution."),
    scene("loop", "The cycle continues."),
    scene("dead-hub", "The reachable dead end has no legal action."),
    scene("orphan", "No path can reach this branch."),
  ],
  choices: [
    { id: "enter-loop", scene: "start", label: "Enter loop", description: "Enter the unresolved loop.", effects: [{ type: "setFlag", flag: "never", value: false }, { type: "goTo", scene: "loop" }] },
    { id: "enter-dead-hub", scene: "start", label: "Enter dead end", description: "Enter the dead end.", effects: [{ type: "goTo", scene: "dead-hub" }] },
    { id: "spin-loop", scene: "loop", label: "Spin", description: "Remain in the cycle.", effects: [{ type: "goTo", scene: "loop" }] },
    terminal("leave-loop", "loop", "departed", "The unresolved cycle is left."),
    terminal("drown-loop", "loop", "dead", "The unresolved cycle takes you."),
    {
      id: "locked-dead-hub",
      scene: "dead-hub",
      label: "Locked dead end",
      description: "A condition with no writer blocks this choice.",
      when: [{ type: "flag", flag: "never", value: true }],
      effects: [{ type: "goTo", scene: "dead-hub" }],
    },
    {
      id: "locked-orphan",
      scene: "orphan",
      label: "Locked orphan",
      description: "An unreachable branch.",
      when: [{ type: "flag", flag: "never", value: true }],
      effects: [{ type: "goTo", scene: "orphan" }],
    },
  ],
};

function faultScenario(order: "bound-first" | "arithmetic-first"): RawScenario {
  const effects: RawEffect[] = order === "bound-first"
    ? [
      { type: "setResource", resource: "stock", value: 2 },
      { type: "adjustResource", resource: "water", delta: Number.MAX_SAFE_INTEGER },
      { type: "goTo", scene: "done" },
    ]
    : [
      { type: "adjustResource", resource: "water", delta: Number.MAX_SAFE_INTEGER },
      { type: "setResource", resource: "stock", value: 2 },
      { type: "goTo", scene: "done" },
    ];
  return {
    version: 1,
    initialScene: "start",
    initialResources: { stock: 0, water: 1 },
    initialFacts: [],
    scenes: [scene("start"), scene("done")],
    choices: [
      { id: "enter-fault", scene: "start", label: "Enter", description: "Enter the fault fixture.", effects: [{ type: "goTo", scene: "done" }] },
      { id: "fault", scene: "done", label: "Fault", description: "Trigger the authored fault.", effects },
      terminal("finish", "done", "completed", "Finished."),
    ],
  };
}

const UNREACHABLE_INVALID_SCENARIO: RawScenario = {
  version: 1,
  initialScene: "start",
  initialResources: { stock: 1 },
  initialFacts: [],
  scenes: [scene("start"), scene("done")],
  choices: [
    {
      id: "unreachable-overflow",
      scene: "start",
      label: "Unreachable overflow",
      description: "A permanently gated unsafe choice.",
      when: [{ type: "flag", flag: "ghost", value: true }],
      effects: [
        { type: "adjustResource", resource: "stock", delta: Number.MAX_SAFE_INTEGER },
        { type: "goTo", scene: "done" },
      ],
    },
    { id: "finish-route", scene: "start", label: "Finish route", description: "Use the safe route.", effects: [{ type: "setFlag", flag: "ghost", value: false }, { type: "goTo", scene: "done" }] },
    terminal("finish", "done", "completed", "Finished safely."),
  ],
};

interface OracleState {
  readonly scene: string;
  readonly status: "playing" | "completed" | "departed" | "dead";
  readonly ending: number;
  readonly resources: Readonly<Record<string, number>>;
  readonly flags: Readonly<Record<string, boolean>>;
}

interface OracleEdge {
  readonly from: string;
  readonly to: string;
  readonly choiceId: string;
}

interface OracleGraph {
  readonly states: Map<string, OracleState>;
  readonly edges: OracleEdge[];
  readonly frontiers: readonly (readonly string[])[];
  readonly completable: ReadonlySet<string>;
  readonly deadEnds: ReadonlySet<string>;
  readonly noCompletion: ReadonlySet<string>;
  readonly flags: readonly string[];
  readonly resources: readonly string[];
  readonly endingPairs: readonly (readonly [string, string])[];
}

function flagNames(scenario: Scenario): string[] {
  const names = new Set<string>();
  const read = (conditions: readonly Condition[] | undefined) => {
    for (const condition of conditions ?? []) if (condition.type === "flag") names.add(condition.flag);
  };
  for (const sceneValue of scenario.scenes) for (const line of sceneValue.text) read(line.when);
  for (const choice of scenario.choices) {
    read(choice.when);
    for (const effect of choice.effects) if (effect.type === "setFlag") names.add(effect.flag);
  }
  return [...names].sort();
}

function endingPairs(scenario: Scenario): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const choice of scenario.choices) {
    if (choice.outcome === undefined) continue;
    const pair: [string, string] = [choice.outcome.status, choice.outcome.summary];
    if (!pairs.some(([status, summary]) => status === pair[0] && summary === pair[1])) pairs.push(pair);
  }
  return pairs;
}

function stateKey(state: OracleState, resources: readonly string[], flags: readonly string[]): string {
  return JSON.stringify([
    state.scene,
    state.status,
    state.ending,
    resources.map((resource) => state.resources[resource]),
    flags.map((flag) => state.flags[flag] === true),
  ]);
}

function conditionMatches(condition: Condition, state: OracleState): boolean {
  if (condition.type === "flag") return state.flags[condition.flag] === condition.value;
  if (condition.type === "resourceAtLeast") return (state.resources[condition.resource] ?? 0) >= condition.value;
  return (state.resources[condition.resource] ?? 0) <= condition.value;
}

function legalChoices(scenario: Scenario, state: OracleState): readonly Choice[] {
  if (state.status !== "playing") return [];
  return scenario.choices.filter((choice) => choice.scene === state.scene && (choice.when ?? []).every((condition) => conditionMatches(condition, state)));
}

function oracleTransition(
  scenario: Scenario,
  state: OracleState,
  choice: Choice,
  bounds: Readonly<Record<string, number>>,
  pairs: readonly (readonly [string, string])[],
): OracleState {
  const resources: Record<string, number> = { ...state.resources };
  const flags: Record<string, boolean> = { ...state.flags };
  let scene = state.scene;
  for (const effect of choice.effects) {
    if (effect.type === "setFlag") flags[effect.flag] = effect.value;
    else if (effect.type === "setResource") resources[effect.resource] = effect.value;
    else if (effect.type === "adjustResource") resources[effect.resource] = (resources[effect.resource] ?? 0) + effect.delta;
    else if (effect.type === "advanceClock") {
      const clock = scenario.clocks?.find((candidate) => candidate.id === effect.clock);
      assert.ok(clock, `oracle clock ${effect.clock} exists`);
      const current = resources[clock.resource] ?? 0;
      resources[clock.resource] = effect.delta >= clock.max - current ? clock.max : current + effect.delta;
    } else if (effect.type === "goTo") scene = effect.scene;
    // addFact intentionally has no semantic projection in this independent model.

    for (const resource of Object.keys(resources)) {
      const value = resources[resource]!;
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`oracle arithmetic error at ${choice.id}/${resource}`);
      if (value > bounds[resource]!) throw new Error(`oracle bound exit at ${choice.id}/${resource}`);
    }
  }
  if (choice.outcome === undefined) {
    return { scene, status: "playing", ending: 0, resources, flags };
  }
  const ending = pairs.findIndex(([status, summary]) => status === choice.outcome!.status && summary === choice.outcome!.summary) + 1;
  assert.ok(ending > 0);
  return { scene, status: choice.outcome.status, ending, resources, flags };
}

function buildOracle(rawScenario: RawScenario | Scenario, bounds: Readonly<Record<string, number>>): OracleGraph {
  const scenario = validateScenario(rawScenario);
  const flags = flagNames(scenario);
  const resources = Object.keys(scenario.initialResources).sort();
  const pairs = endingPairs(scenario);
  const initial: OracleState = {
    scene: scenario.initialScene,
    status: "playing",
    ending: 0,
    resources: Object.fromEntries(resources.map((resource) => [resource, scenario.initialResources[resource]!])),
    flags: Object.fromEntries(flags.map((flag) => [flag, false])),
  };
  const states = new Map<string, OracleState>();
  const edges: OracleEdge[] = [];
  const frontiers: string[][] = [[stateKey(initial, resources, flags)]];
  const distances = new Map<string, number>();
  const queue: OracleState[] = [initial];
  states.set(frontiers[0]![0]!, initial);
  distances.set(frontiers[0]![0]!, 0);

  while (queue.length > 0) {
    const state = queue.shift()!;
    const from = stateKey(state, resources, flags);
    for (const choice of legalChoices(scenario, state)) {
      const next = oracleTransition(scenario, state, choice, bounds, pairs);
      const to = stateKey(next, resources, flags);
      edges.push({ from, to, choiceId: choice.id });
      if (states.has(to)) continue;
      states.set(to, next);
      const distance = distances.get(from)! + 1;
      distances.set(to, distance);
      (frontiers[distance] ??= []).push(to);
      queue.push(next);
    }
  }

  const completable = new Set<string>([...states.entries()]
    .filter(([, state]) => state.status === "completed")
    .map(([key]) => key));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (completable.has(edge.from) || !completable.has(edge.to)) continue;
      if (states.get(edge.from)!.status !== "playing") continue;
      completable.add(edge.from);
      changed = true;
    }
  }
  const deadEnds = new Set<string>();
  for (const [key, state] of states) {
    if (state.status === "playing" && legalChoices(scenario, state).length === 0) deadEnds.add(key);
  }
  const noCompletion = new Set([...states.entries()]
    .filter(([, state]) => state.status === "playing" && !completable.has(stateKey(state, resources, flags)))
    .map(([key]) => key));
  return { states, edges, frontiers, completable, deadEnds, noCompletion, flags, resources, endingPairs: pairs };
}

function stateFromKey(graph: OracleGraph, key: string): OracleState {
  const state = graph.states.get(key);
  assert.ok(state, `oracle state ${key} exists`);
  return state;
}

function formulaForStates(model: SymbolicModel, states: readonly OracleState[]): number {
  return states.reduce((root, state) => model.bdd.or(root, model.encode(state)), 0);
}

function expectedStateSet(graph: OracleGraph, keys: ReadonlySet<string>): OracleState[] {
  return [...keys].map((key) => stateFromKey(graph, key));
}

function cartesian<T>(sets: readonly (readonly T[])[]): T[][] {
  return sets.reduce<T[][]>(
    (prefixes, choices) => prefixes.flatMap((prefix) => choices.map((choice) => [...prefix, choice])),
    [[]],
  );
}

/** Enumerate the complete small modeled domain for relation preimage checks. */
function allValidStates(rawScenario: RawScenario | Scenario, bounds: Readonly<Record<string, number>>): OracleState[] {
  const scenario = validateScenario(rawScenario);
  const flags = flagNames(scenario);
  const resources = Object.keys(scenario.initialResources).sort();
  const pairs = endingPairs(scenario);
  const resourceTuples = cartesian(resources.map((resource) => Array.from({ length: bounds[resource]! + 1 }, (_, value) => value)));
  const flagTuples = cartesian(flags.map(() => [false, true]));
  const states: OracleState[] = [];
  for (const sceneId of scenario.scenes.map((sceneValue) => sceneValue.id)) {
    for (const resourceTuple of resourceTuples) {
      const resourceValues = Object.fromEntries(resources.map((resource, index) => [resource, resourceTuple[index]!])) as Record<string, number>;
      for (const flagTuple of flagTuples) {
        const flagValues = Object.fromEntries(flags.map((flag, index) => [flag, flagTuple[index]!])) as Record<string, boolean>;
        states.push({ scene: sceneId, status: "playing", ending: 0, resources: resourceValues, flags: flagValues });
        for (const [index, [status]] of pairs.entries()) {
          states.push({ scene: sceneId, status: status as OracleState["status"], ending: index + 1, resources: resourceValues, flags: flagValues });
        }
      }
    }
  }
  return states;
}

function replayOraclePath(
  scenario: Scenario,
  path: readonly string[],
  bounds: Readonly<Record<string, number>>,
  pairs: readonly (readonly [string, string])[],
): OracleState {
  let state: OracleState = {
    scene: scenario.initialScene,
    status: "playing",
    ending: 0,
    resources: Object.fromEntries(Object.entries(scenario.initialResources)),
    flags: Object.fromEntries(flagNames(scenario).map((flag) => [flag, false])),
  };
  for (const choiceId of path) {
    const choice = legalChoices(scenario, state).find((candidate) => candidate.id === choiceId);
    assert.ok(choice, `oracle witness action ${choiceId} is legal at ${state.scene}`);
    state = oracleTransition(scenario, state, choice, bounds, pairs);
  }
  return state;
}

function tsxLoader(): string {
  return createRequire(import.meta.url).resolve("tsx");
}

function fixtureScenarioSource(scenario: RawScenario): string {
  const facts = new Set<string>(scenario.initialFacts);
  for (const choice of scenario.choices) for (const effect of choice.effects) if (effect.type === "addFact") facts.add(effect.fact);
  const labels = Object.fromEntries([...facts].map((fact) => [fact, `Fixture fact: ${fact}`]));
  return `
export type ScenarioStatus = "completed" | "departed" | "dead";
export interface FlagConditionData { readonly type: "flag"; readonly flag: string; readonly value: boolean; }
export interface ResourceConditionData { readonly type: "resourceAtLeast" | "resourceAtMost"; readonly resource: string; readonly value: number; }
export type ConditionData = FlagConditionData | ResourceConditionData;
export interface SetFlagEffectData { readonly type: "setFlag"; readonly flag: string; readonly value: boolean; }
export interface SetResourceEffectData { readonly type: "setResource"; readonly resource: string; readonly value: number; }
export interface AdjustResourceEffectData { readonly type: "adjustResource"; readonly resource: string; readonly delta: number; }
export interface AdvanceClockEffectData { readonly type: "advanceClock"; readonly clock: string; readonly delta: number; }
export interface AddFactEffectData { readonly type: "addFact"; readonly fact: string; }
export interface GoToEffectData { readonly type: "goTo"; readonly scene: string; }
export type EffectData = SetFlagEffectData | SetResourceEffectData | AdjustResourceEffectData | AdvanceClockEffectData | AddFactEffectData | GoToEffectData;
export interface TextLineData { readonly text: string; readonly when?: readonly ConditionData[]; }
export interface SceneData { readonly id: string; readonly title: string; readonly text: readonly TextLineData[]; }
export interface OutcomeData { readonly status: ScenarioStatus; readonly summary: string; }
export interface ChoiceData { readonly id: string; readonly scene: string; readonly label: string; readonly description: string; readonly when?: readonly ConditionData[]; readonly effects: readonly EffectData[]; readonly outcome?: OutcomeData; }
export interface ClockData { readonly id: string; readonly resource: string; readonly max: number; }
export interface ScenarioData { readonly version: 1; readonly initialScene: string; readonly initialResources: Readonly<Record<string, number>>; readonly initialFacts: readonly string[]; readonly clocks?: readonly ClockData[]; readonly scenes: readonly SceneData[]; readonly choices: readonly ChoiceData[]; }
export const FACT_LABELS = ${JSON.stringify(labels)} as const;
export const RAW_SCENARIO = ${JSON.stringify(scenario)} as const;
`;
}

function materializeEngineFixture(scenario: RawScenario): { root: string; cleanup: () => void } {
  const testRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const root = mkdtempSync(join(tmpdir(), "af9-symbolic-engine-"));
  mkdirSync(join(root, "src", "engine"), { recursive: true });
  mkdirSync(join(root, "src", "content"), { recursive: true });
  for (const file of ["index.ts", "types.ts", "content.ts", "build-id.ts"]) {
    copyFileSync(join(testRoot, "src", "engine", file), join(root, "src", "engine", file));
  }
  writeFileSync(join(root, "src", "content", "scenario.ts"), fixtureScenarioSource(scenario));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "af9-symbolic-engine-fixture", type: "module" }));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

interface EngineReplay {
  readonly scene: string;
  readonly status: string;
  readonly resources: Readonly<Record<string, number>>;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly history: readonly string[];
  readonly stateHash: string;
  readonly restoredHash: string;
}

function replayThroughRealEngine(scenario: RawScenario, paths: Readonly<Record<string, readonly string[]>>): Record<string, EngineReplay> {
  const fixture = materializeEngineFixture(scenario);
  try {
    const inputPath = join(fixture.root, "paths.json");
    const probePath = join(fixture.root, "probe.mjs");
    writeFileSync(inputPath, JSON.stringify(paths));
    writeFileSync(probePath, `
import { readFileSync } from "node:fs";
import { replay, restore, save, stateHash } from "./src/engine/index.ts";
const paths = JSON.parse(readFileSync(process.argv[2], "utf8"));
const result = {};
for (const [key, path] of Object.entries(paths)) {
  const state = replay(1, path.map((choiceId, expectedRevision) => ({ choiceId, expectedRevision })));
  const restored = restore(save(state));
  result[key] = {
    scene: state.scene,
    status: state.status,
    resources: state.resources,
    flags: state.flags,
    history: state.history.map((entry) => entry.choiceId),
    stateHash: stateHash(state),
    restoredHash: stateHash(restored),
  };
}
console.log(JSON.stringify(result));
`);
    const stdout = execFileSync(process.execPath, ["--import", tsxLoader(), probePath, inputPath], {
      cwd: fixture.root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    return JSON.parse(stdout.trim()) as Record<string, EngineReplay>;
  } catch (error) {
    const detail = error as { stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    throw new Error(`isolated engine replay failed: ${detail.stderr?.toString() ?? detail.message ?? String(error)}\n${detail.stdout?.toString() ?? ""}`);
  } finally {
    fixture.cleanup();
  }
}

function assertEngineReplayMatches(
  scenario: Scenario,
  graph: OracleGraph,
  paths: Readonly<Record<string, readonly string[]>>,
  replayed: Readonly<Record<string, EngineReplay>>,
  bounds: Readonly<Record<string, number>>,
): void {
  for (const [key, path] of Object.entries(paths)) {
    const actual = replayed[key];
    assert.ok(actual, `real engine replay exists for ${key}`);
    assert.deepEqual(actual.history, path, `${key} retains the authored witness history`);
    assert.equal(actual.stateHash, actual.restoredHash, `${key} survives save/restore`);
    const expected = replayOraclePath(scenario, path, bounds, graph.endingPairs);
    // Receipts are not part of the symbolic projection; derive terminal identity
    // from the path's final authored choice and compare the remaining fields.
    const lastChoice = path.length === 0 ? undefined : scenario.choices.find((choice) => choice.id === path[path.length - 1]);
    const expectedEnding = lastChoice?.outcome === undefined ? 0 : graph.endingPairs.findIndex(([status, summary]) => status === lastChoice.outcome!.status && summary === lastChoice.outcome!.summary) + 1;
    const projected: OracleState = {
      scene: actual.scene,
      status: actual.status as OracleState["status"],
      ending: expectedEnding,
      resources: actual.resources,
      flags: Object.fromEntries(graph.flags.map((flag) => [flag, Object.hasOwn(actual.flags, flag) && actual.flags[flag] === true])),
    };
    assert.deepEqual(projected, expected, `${key} matches the independent semantic interpreter`);
  }
}

function assertSymbolicMatchesOracle(rawScenario: RawScenario, bounds: Readonly<Record<string, number>>): void {
  const validated = validateScenario(rawScenario);
  const graph = buildOracle(validated, bounds);
  const graphStates = [...graph.states.values()];
  const domainStates = allValidStates(validated, bounds);
  for (const order of ["interleaved", "blocked"] as const) {
    const model = new SymbolicModel(rawScenario, bounds, { order, nodeLimit: 200_000, cacheLimit: 20_000 });
    const result = symbolicReachability(model, 64);
    const reachable = formulaForStates(model, graphStates);
    const completable = formulaForStates(model, expectedStateSet(graph, graph.completable));
    const deadEnds = formulaForStates(model, expectedStateSet(graph, graph.deadEnds));
    const noCompletion = formulaForStates(model, expectedStateSet(graph, graph.noCompletion));

    assert.equal(result.exhaustive, true, `${order} fixed point is exhaustive`);
    assert.equal(result.reachable, reachable, `${order} reachable states match the independent oracle`);
    assert.equal(result.completable, completable, `${order} completion predecessor set matches the oracle`);
    assert.equal(result.deadEnds, deadEnds, `${order} dead ends match the oracle`);
    assert.equal(result.noCompletion, noCompletion, `${order} no-completion states match the oracle`);
    assert.equal(result.reachableCount, BigInt(graph.states.size), `${order} reachable count matches the oracle`);
    assert.equal(result.frontiers.length, graph.frontiers.length, `${order} frontier depth matches the oracle`);
    for (const [index, frontier] of result.frontiers.entries()) {
      assert.equal(frontier, formulaForStates(model, [...(graph.frontiers[index] ?? []).map((key) => stateFromKey(graph, key))]), `${order} frontier ${index} matches`);
    }

    assert.deepEqual(result.unreachableScenes, validated.scenes.map((sceneValue) => sceneValue.id).filter((id) => !graphStates.some((state) => state.scene === id)), `${order} unreachable scenes match`);
    const reachableChoiceIds = new Set(graph.edges.map((edge) => edge.choiceId));
    assert.deepEqual(result.unreachableChoices, validated.choices.map((choice) => choice.id).filter((id) => !reachableChoiceIds.has(id)), `${order} unreachable choices match`);
    assert.deepEqual(Object.keys(result.sceneWitnesses).sort(), validated.scenes.map((sceneValue) => sceneValue.id).filter((id) => graphStates.some((state) => state.scene === id)).sort());
    assert.deepEqual(Object.keys(result.choiceWitnesses).sort(), [...reachableChoiceIds].sort());
    assert.deepEqual(Object.keys(result.endingWitnesses).sort(), validated.choices.filter((choice) => choice.outcome !== undefined && reachableChoiceIds.has(choice.id)).map((choice) => choice.id).sort());

    for (const sceneValue of validated.scenes) {
      const expectedScene = formulaForStates(model, graphStates.filter((state) => state.scene === sceneValue.id));
      assert.equal(model.bdd.and(result.reachable, model.atScene(sceneValue.id)), expectedScene, `${order} scene projection ${sceneValue.id} matches`);
    }
    for (const state of graphStates) {
      const encoded = model.encode(state);
      const assignment = model.bdd.satisfyingAssignment(encoded);
      assert.ok(assignment, `${order} can witness encoded ${state.scene}/${state.status}`);
      assert.deepEqual(model.decode(assignment), state, `${order} encode/decode round-trip preserves the full modeled state`);
    }

    const paths: Record<string, readonly string[]> = {};
    for (const [id, path] of Object.entries(result.sceneWitnesses)) paths[`scene:${id}`] = path;
    for (const [id, path] of Object.entries(result.choiceWitnesses)) paths[`choice:${id}`] = path;
    for (const [id, path] of Object.entries(result.endingWitnesses)) paths[`ending:${id}`] = path;
    for (const [key, path] of Object.entries(paths)) {
      const expected = replayOraclePath(validated, path, bounds, graph.endingPairs);
      if (key.startsWith("scene:")) assert.equal(expected.scene, key.slice("scene:".length));
      if (key.startsWith("choice:") || key.startsWith("ending:")) assert.equal(path.at(-1), key.slice(key.indexOf(":") + 1));
    }
    assertEngineReplayMatches(validated, graph, paths, replayThroughRealEngine(rawScenario, paths), bounds);

    for (const choice of model.choices) {
      const choiceEdges = graph.edges.filter((edge) => edge.choiceId === choice.id);
      const expectedImage = formulaForStates(model, choiceEdges.map((edge) => stateFromKey(graph, edge.to)));
      const expectedPreimage = formulaForStates(model, domainStates.filter((state) => {
        if (!legalChoices(validated, state).some((candidate) => candidate.id === choice.id)) return false;
        const next = oracleTransition(validated, state, validated.choices.find((candidate) => candidate.id === choice.id)!, bounds, graph.endingPairs);
        return graph.states.has(stateKey(next, graph.resources, graph.flags));
      }));
      assert.equal(model.image(result.reachable, choice), expectedImage, `${order} image for ${choice.id} matches`);
      assert.equal(model.preimage(result.reachable, choice), expectedPreimage, `${order} preimage for ${choice.id} matches`);
    }
  }
}

test("symbolic model matches an independent finite oracle for every DSL operation and both variable orders", () => {
  assertSymbolicMatchesOracle(ORDERED_SCENARIO, { stock: 2, tide: 2 });
});

test("symbolic completion excludes dead/departed terminals while retaining cycles and dead ends", () => {
  assertSymbolicMatchesOracle(NO_COMPLETION_SCENARIO, { token: 1 });
  const model = new SymbolicModel(NO_COMPLETION_SCENARIO, { token: 1 }, { order: "blocked", nodeLimit: 100_000, cacheLimit: 10_000 });
  const result = symbolicReachability(model, 32);
  assert.equal(result.completable, 0, "dead/departed terminals must not seed completion");
  assert.notEqual(result.deadEnds, 0, "the reachable dead-hub has no legal choices");
  assert.notEqual(result.noCompletion, 0, "the loop has no completed continuation");
  for (const status of ["dead", "departed"] as const) {
    const ending = status === "dead" ? 2 : 1;
    const terminal = model.encode({ scene: "loop", status, ending, resources: { token: 0 }, flags: { never: false } });
    assert.equal(model.bdd.and(result.completable, terminal), 0, `${status} terminal is not a completion predecessor`);
    assert.equal(model.bdd.and(result.noCompletion, terminal), 0, `${status} terminal is not a playing no-completion state`);
  }
});

test("unreachable unsafe arithmetic is ignored, while a reachable intermediate fault returns an authored path", () => {
  const safe = new SymbolicModel(UNREACHABLE_INVALID_SCENARIO, { stock: 2 }, { order: "interleaved", nodeLimit: 100_000, cacheLimit: 10_000 });
  const safeResult = symbolicReachability(safe, 32);
  assert.deepEqual(safeResult.unreachableChoices, ["unreachable-overflow"]);
  assert.ok(Object.hasOwn(safeResult.choiceWitnesses, "finish-route"));

  for (const [order, expectedReason] of [["bound-first", "bound-exit"], ["arithmetic-first", "arithmetic-error"]] as const) {
    const model = new SymbolicModel(faultScenario(order), { stock: 1, water: 2 }, { order: "blocked", nodeLimit: 100_000, cacheLimit: 10_000 });
    assert.throws(() => symbolicReachability(model, 32), (error: unknown) => {
      return error instanceof SymbolicTransitionError
        && error.reason === expectedReason
        && error.choiceId === "fault"
        && JSON.stringify(error.path) === JSON.stringify(["enter-fault", "fault"]);
    }, `${order} reports the first reachable authored failure with its path`);
  }
});
