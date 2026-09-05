import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import test from "node:test";

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

interface RawScenario {
  version: 1;
  initialScene: string;
  initialResources: Record<string, number>;
  initialFacts: string[];
  clocks?: { id: string; resource: string; max: number }[];
  scenes: { id: string; title: string; text: { text: string; when?: RawCondition[] }[] }[];
  choices: RawChoice[];
}

interface AuditResult {
  readonly exhaustive: true;
  readonly representation?: "conserved-parameters";
  readonly families?: number;
  readonly states?: number;
  readonly transitions: number;
  readonly reachableScenes: readonly string[];
  readonly unreachableScenes: readonly string[];
  readonly unreachableChoices: readonly string[];
  readonly deadEnds: readonly (readonly string[])[];
  readonly noCompletionPaths: readonly { scene: string; path: readonly string[] }[];
  readonly choiceWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly endingWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly mergedVisits?: number;
  readonly congruenceSuccessors?: number;
  readonly witnessReplayChecks?: number;
  readonly representativeMaxProjectionWords?: number;
  readonly projectionWordsExhaustive?: false;
}

const TEST_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function scene(id: string, text = `${id} scene.`): RawScenario["scenes"][number] {
  return { id, title: id[0]!.toUpperCase() + id.slice(1), text: [{ text }] };
}

function terminal(id: string, sceneId: string, status: "completed" | "departed" | "dead", summary: string): RawChoice {
  return { id, scene: sceneId, label: id, description: id, effects: [], outcome: { status, summary } };
}

const COLLAPSE_SCENARIO: RawScenario = {
  version: 1,
  initialScene: "start",
  initialResources: { display: 0, supplies: 0 },
  initialFacts: [],
  scenes: [
    scene("start", "Two routes reach the same ledger."),
    {
      id: "hub",
      title: "Hub",
      text: [
        { text: "The slate is blank.", when: [{ type: "resourceAtMost", resource: "display", value: 1 }] },
        { text: "The slate is full.", when: [{ type: "resourceAtLeast", resource: "display", value: 2 }] },
        { text: "A red mark catches the light.", when: [{ type: "flag", flag: "mark", value: true }] },
      ],
    },
  ],
  choices: [
    {
      id: "choose-low",
      scene: "start",
      label: "Choose the low route",
      description: "Leave a blank slate.",
      effects: [
        { type: "setResource", resource: "display", value: 0 },
        { type: "setFlag", flag: "mark", value: false },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "choose-high",
      scene: "start",
      label: "Choose the high route",
      description: "Leave a full slate.",
      effects: [
        { type: "setResource", resource: "display", value: 4 },
        { type: "setFlag", flag: "mark", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    terminal("finish", "hub", "completed", "The ledger is complete."),
  ],
};

const CORRELATION_SCENARIO: RawScenario = {
  version: 1,
  initialScene: "start",
  initialResources: { supplies: 0 },
  initialFacts: [],
  scenes: [scene("start", "Two correlated preparations."), scene("hub", "The final choice depends on both fields.")],
  choices: [
    {
      id: "poor-preparation",
      scene: "start",
      label: "Take the poor preparation",
      description: "Arrive with no supply and no seal.",
      effects: [
        { type: "setResource", resource: "supplies", value: 0 },
        { type: "setFlag", flag: "seal", value: false },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "rich-preparation",
      scene: "start",
      label: "Take the rich preparation",
      description: "Arrive with one supply and a seal.",
      effects: [
        { type: "setResource", resource: "supplies", value: 1 },
        { type: "setFlag", flag: "seal", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "fabricated-combination",
      scene: "hub",
      label: "Use the fabricated combination",
      description: "This must never be legal: one supply with no seal.",
      when: [
        { type: "resourceAtLeast", resource: "supplies", value: 1 },
        { type: "flag", flag: "seal", value: false },
      ],
      effects: [],
      outcome: { status: "completed", summary: "Impossible combination." },
    },
    {
      id: "finish-poor",
      scene: "hub",
      label: "Finish without supply",
      description: "Use the no-supply route.",
      when: [{ type: "resourceAtMost", resource: "supplies", value: 0 }],
      effects: [],
      outcome: { status: "completed", summary: "The poor preparation is complete." },
    },
    {
      id: "finish-rich",
      scene: "hub",
      label: "Finish with the sealed supply",
      description: "Use the sealed route.",
      when: [
        { type: "resourceAtLeast", resource: "supplies", value: 1 },
        { type: "flag", flag: "seal", value: true },
      ],
      effects: [],
      outcome: { status: "completed", summary: "The rich preparation is complete." },
    },
  ],
};

const RESETTABLE_CLOCK_SCENARIO: RawScenario = {
  version: 1,
  initialScene: "start",
  initialResources: { display: 7, tide: 0 },
  initialFacts: [],
  clocks: [{ id: "phase-clock", resource: "tide", max: 2 }],
  scenes: [
    scene("start", "Enter the gate."),
    scene("gate", "The gate can be reset."),
    scene("late", "The late writer is now visible."),
    scene("finish", "The clock has reached its end."),
  ],
  choices: [
    {
      id: "enter-gate",
      scene: "start",
      label: "Enter the gate",
      description: "Open the resettable phase.",
      effects: [{ type: "setFlag", flag: "gate-open", value: true }, { type: "goTo", scene: "gate" }],
    },
    {
      id: "reset-phase",
      scene: "gate",
      label: "Reset and advance",
      description: "Clear the phase and advance the tide.",
      effects: [
        { type: "setFlag", flag: "gate-open", value: false },
        { type: "advanceClock", clock: "phase-clock", delta: 1 },
        { type: "goTo", scene: "late" },
      ],
    },
    {
      id: "take-closed-gate",
      scene: "gate",
      label: "Take the cleared opening",
      description: "Use the gate only after the phase is cleared.",
      when: [{ type: "flag", flag: "gate-open", value: false }],
      effects: [{ type: "goTo", scene: "late" }],
    },
    terminal("leave-gate", "gate", "departed", "The gate is left unresolved."),
    {
      id: "finish-late",
      scene: "late",
      label: "Finish the late work",
      description: "Advance the late clock and finish.",
      when: [{ type: "flag", flag: "gate-open", value: false }],
      effects: [{ type: "advanceClock", clock: "phase-clock", delta: 1 }, { type: "goTo", scene: "finish" }],
    },
    terminal("finish-clock", "finish", "completed", "The resettable clock is complete."),
  ],
};

const NO_COMPLETION_CYCLE_SCENARIO: RawScenario = {
  version: 1,
  initialScene: "start",
  initialResources: { token: 0 },
  initialFacts: [],
  scenes: [scene("start", "The route has no completed resolution."), scene("loop", "The cycle continues.")],
  choices: [
    {
      id: "enter-cycle",
      scene: "start",
      label: "Enter the cycle",
      description: "Step into the unresolved loop.",
      effects: [{ type: "goTo", scene: "loop" }],
    },
    {
      id: "spin-cycle",
      scene: "loop",
      label: "Continue circling",
      description: "Remain in the unresolved loop.",
      effects: [{ type: "goTo", scene: "loop" }],
    },
    terminal("leave-cycle", "loop", "departed", "You leave the unresolved cycle."),
    terminal("drown-cycle", "loop", "dead", "The unresolved cycle takes you."),
  ],
};

const DUPLICATE_ENDING_SCENARIO: RawScenario = {
  version: 1,
  initialScene: "start",
  initialResources: { token: 0 },
  initialFacts: [],
  scenes: [scene("start", "Enter the terminal ledger."), scene("hub", "Two authored endings share one result.")],
  choices: [
    {
      id: "enter-terminal-ledger",
      scene: "start",
      label: "Enter the terminal ledger",
      description: "Reach the final record.",
      effects: [{ type: "goTo", scene: "hub" }],
    },
    terminal("finish-alpha", "hub", "completed", "The shared ending is complete."),
    terminal("finish-beta", "hub", "completed", "The shared ending is complete."),
  ],
};

function fixtureScenarioSource(scenario: RawScenario): string {
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
export const FACT_LABELS = {} as const;
export const RAW_SCENARIO = ${JSON.stringify(scenario)} as const satisfies ScenarioData;
`;
}

function tsxLoader(): string {
  return createRequire(import.meta.url).resolve("tsx");
}

function materializeFixture(scenario: RawScenario): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "af9-family-mini-"));
  mkdirSync(join(root, "src", "engine"), { recursive: true });
  mkdirSync(join(root, "src", "content"), { recursive: true });
  for (const file of readdirSync(join(TEST_ROOT, "src", "engine"))) {
    if (!file.endsWith(".ts")) continue;
    copyFileSync(join(TEST_ROOT, "src", "engine", file), join(root, "src", "engine", file));
  }
  writeFileSync(join(root, "src", "content", "scenario.ts"), fixtureScenarioSource(scenario));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "af9-family-fixture", type: "module" }));
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function runFixture(label: string, scenario: RawScenario, extraSource = "extra = {}; ", allowFamilyEndingExtras = false): Record<string, unknown> {
  const fixture = materializeFixture(scenario);
  try {
    const probePath = join(fixture.root, "probe.mjs");
    writeFileSync(probePath, `
import { auditScenario } from "./src/engine/audit.ts";
import { auditScenarioFamilies } from "./src/engine/family-audit.ts";
import { analyzeFutureInfluence } from "./src/engine/future-influence.ts";
import { bindParameters, instantiateText, parameterizeText } from "./src/engine/conserved-projection.ts";
import { SCENARIO } from "./src/engine/content.ts";
import { choose, observe, replay, start } from "./src/engine/index.ts";

function keys(value) { return Object.keys(value).sort(); }
function sceneSet(value) { return [...new Set(value.map(entry => entry.scene))].sort(); }
function replayWitnesses(result, label) {
  let checks = 0;
  for (const [choiceId, path] of Object.entries(result.choiceWitnesses)) {
    const actions = path.map((id, index) => ({ choiceId: id, expectedRevision: index }));
    const state = replay(1, actions);
    if (path.at(-1) !== choiceId || state.history.map(entry => entry.choiceId).join("\\0") !== path.join("\\0")) {
      throw new Error(label + " choice witness failed to replay: " + choiceId);
    }
    checks++;
  }
  for (const [choiceId, path] of Object.entries(result.endingWitnesses)) {
    const actions = path.map((id, index) => ({ choiceId: id, expectedRevision: index }));
    const state = replay(1, actions);
    if (path.at(-1) !== choiceId || state.status === "playing") {
      throw new Error(label + " ending witness failed to replay: " + choiceId);
    }
    checks++;
  }
  return checks;
}
function parity(exact, family) {
  for (const field of ["reachableScenes", "unreachableScenes", "unreachableChoices"]) {
    if (JSON.stringify(exact[field]) !== JSON.stringify(family[field])) throw new Error("${label}: " + field + " diverged");
  }
  if (JSON.stringify(keys(exact.choiceWitnesses)) !== JSON.stringify(keys(family.choiceWitnesses))) throw new Error("${label}: choice witness set diverged");
  const exactEndingKeys = keys(exact.endingWitnesses);
  const familyEndingKeys = keys(family.endingWitnesses);
  if (${allowFamilyEndingExtras ? "false" : "true"} && JSON.stringify(exactEndingKeys) !== JSON.stringify(familyEndingKeys)) throw new Error("${label}: ending witness set diverged");
  if (${allowFamilyEndingExtras ? "true" : "false"} && !exactEndingKeys.every(id => familyEndingKeys.includes(id))) throw new Error("${label}: family dropped an exact ending witness");
  if (JSON.stringify(sceneSet(exact.noCompletionPaths)) !== JSON.stringify(sceneSet(family.noCompletionPaths))) throw new Error("${label}: completion scene set diverged");
  if (exact.deadEnds.length !== family.deadEnds.length) throw new Error("${label}: dead-end count diverged");
}
const exact = auditScenario();
const family = auditScenarioFamilies();
parity(exact, family);
const replayChecks = replayWitnesses(exact, "exact") + replayWitnesses(family, "family");
let extra = {};
${extraSource}
console.log(JSON.stringify({
  label: "${label}",
  exact: { states: exact.states, transitions: exact.transitions, reachableScenes: exact.reachableScenes, unreachableScenes: exact.unreachableScenes, unreachableChoices: exact.unreachableChoices, deadEnds: exact.deadEnds, noCompletionPaths: exact.noCompletionPaths, choiceWitnesses: exact.choiceWitnesses, endingWitnesses: exact.endingWitnesses },
  family: { families: family.families, transitions: family.transitions, mergedVisits: family.mergedVisits, congruenceSuccessors: family.congruenceSuccessors, witnessReplayChecks: family.witnessReplayChecks, reachableScenes: family.reachableScenes, unreachableScenes: family.unreachableScenes, unreachableChoices: family.unreachableChoices, deadEnds: family.deadEnds, noCompletionPaths: family.noCompletionPaths, choiceWitnesses: family.choiceWitnesses, endingWitnesses: family.endingWitnesses, representativeMaxProjectionWords: family.representativeMaxProjectionWords, projectionWordsExhaustive: family.projectionWordsExhaustive },
  replayChecks,
  extra,
}));
`);
    try {
      const stdout = execFileSync(process.execPath, ["--import", tsxLoader(), probePath], {
        cwd: fixture.root,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      });
      return JSON.parse(stdout.trim()) as Record<string, unknown>;
    } catch (error) {
      const detail = error as { stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
      throw new Error(`${label} isolated probe failed: ${detail.stderr?.toString() ?? detail.message ?? String(error)}\n${detail.stdout?.toString() ?? ""}`);
    }
  } finally {
    fixture.cleanup();
  }
}

test("family audit collapses exact conserved bindings while preserving their text", () => {
  const result = runFixture("collapse", COLLAPSE_SCENARIO, `
const low = choose(start(1), "choose-low", 0);
const high = choose(start(1), "choose-high", 0);
if (low.resources.display === high.resources.display || low.flags.mark === high.flags.mark) throw new Error("collapse fixture did not create distinct bindings");
const analysis = analyzeFutureInfluence(SCENARIO, { scene: "hub", status: "playing", flags: low.flags });
if (analysis.activeResources.length !== 0 || analysis.activeFlags.length !== 0) throw new Error("collapse fixture unexpectedly made parameters active");
const fields = { resources: analysis.conservedResources, flags: analysis.conservedFlags };
const hub = SCENARIO.scenes.find(value => value.id === "hub");
if (hub === undefined) throw new Error("collapse hub missing");
const lowTemplate = parameterizeText(hub, low, fields);
const highTemplate = parameterizeText(hub, high, fields);
if (JSON.stringify(lowTemplate) !== JSON.stringify(highTemplate)) throw new Error("conserved text templates diverged");
if (JSON.stringify(instantiateText(lowTemplate, bindParameters(low, fields))) !== JSON.stringify(observe(low).text)) throw new Error("low binding text diverged");
if (JSON.stringify(instantiateText(highTemplate, bindParameters(high, fields))) !== JSON.stringify(observe(high).text)) throw new Error("high binding text diverged");
let capError = "";
try { auditScenarioFamilies(1); } catch (error) { capError = String(error && error.message || error); }
if (!/exceeded 1/.test(capError)) throw new Error("family cap did not fail closed: " + capError);
extra = { analysis, lowText: observe(low).text, highText: observe(high).text, capError, exactStates: exact.states, families: family.families };
`);
  const exact = result.exact as { states: number; choiceWitnesses: Record<string, unknown>; endingWitnesses: Record<string, unknown> };
  const family = result.family as { families: number; mergedVisits: number; projectionWordsExhaustive: false };
  const extra = result.extra as { lowText: string[]; highText: string[]; capError: string; analysis: { conservedResources: string[]; conservedFlags: string[] } };
  assert.ok(exact.states > family.families, "conserved bindings should collapse at least one family");
  assert.ok((family.mergedVisits ?? 0) > 0);
  assert.equal(family.projectionWordsExhaustive, false);
  assert.deepEqual(extra.lowText, ["The slate is blank."]);
  assert.deepEqual(extra.highText, ["The slate is full.", "A red mark catches the light."]);
  assert.deepEqual(extra.analysis.conservedResources, ["display", "supplies"]);
  assert.deepEqual(extra.analysis.conservedFlags, ["mark"]);
  assert.match(extra.capError, /exceeded 1/);
  assert.ok(Object.hasOwn(exact.choiceWitnesses, "finish"));
  assert.ok(Object.hasOwn(exact.endingWitnesses, "finish"));
});

test("family audit retains correlated active fields and cannot fabricate a mixed branch", () => {
  const result = runFixture("correlation", CORRELATION_SCENARIO, `
const low = choose(start(1), "poor-preparation", 0);
const high = choose(start(1), "rich-preparation", 0);
const lowView = observe(low);
const highView = observe(high);
if (!lowView.choices.some(choice => choice.id === "finish-poor") || lowView.choices.some(choice => choice.id === "fabricated-combination")) throw new Error("poor correlation legality changed");
if (!highView.choices.some(choice => choice.id === "finish-rich") || highView.choices.some(choice => choice.id === "fabricated-combination")) throw new Error("rich correlation legality changed");
const analysis = analyzeFutureInfluence(SCENARIO, { scene: "hub", status: "playing", flags: low.flags });
if (!analysis.activeResources.includes("supplies") || !analysis.activeFlags.includes("seal")) throw new Error("correlation fields were not retained jointly");
extra = { analysis, lowChoices: lowView.choices.map(choice => choice.id), highChoices: highView.choices.map(choice => choice.id), fabricatedWitness: Object.hasOwn(exact.choiceWitnesses, "fabricated-combination") };
`);
  const exact = result.exact as { unreachableChoices: string[]; choiceWitnesses: Record<string, unknown> };
  const extra = result.extra as { analysis: { activeResources: string[]; activeFlags: string[] }; lowChoices: string[]; highChoices: string[]; fabricatedWitness: boolean };
  assert.ok(exact.unreachableChoices.includes("fabricated-combination"));
  assert.equal(extra.fabricatedWitness, false);
  assert.deepEqual(extra.lowChoices, ["finish-poor"]);
  assert.deepEqual(extra.highChoices, ["finish-rich"]);
  assert.ok(extra.analysis.activeResources.includes("supplies"));
  assert.ok(extra.analysis.activeFlags.includes("seal"));
});

test("family audit retains resettable late writers and bounded clock resources", () => {
  const result = runFixture("resettable-clock", RESETTABLE_CLOCK_SCENARIO, `
const entered = choose(start(1), "enter-gate", 0);
const analysis = analyzeFutureInfluence(SCENARIO, { scene: "gate", status: "playing", flags: entered.flags });
if (!analysis.activeResources.includes("tide") || !analysis.activeFlags.includes("gate-open")) throw new Error("late writer or clock was dropped");
if (analysis.pruningJustifiers.length !== 0 || !analysis.reachableChoices.includes("take-closed-gate")) throw new Error("resettable gate was pruned");
const reset = choose(entered, "reset-phase", entered.revision);
const finished = choose(reset, "finish-late", reset.revision);
const terminal = choose(finished, "finish-clock", finished.revision);
if (terminal.resources.tide !== 2 || terminal.status !== "completed") throw new Error("clock did not saturate through late writer");
extra = { analysis, terminalTide: terminal.resources.tide, terminalStatus: terminal.status };
`);
  const extra = result.extra as { analysis: { activeResources: string[]; activeFlags: string[]; pruningJustifiers: string[]; reachableChoices: string[] }; terminalTide: number; terminalStatus: string };
  assert.ok(extra.analysis.activeResources.includes("tide"));
  assert.ok(extra.analysis.activeFlags.includes("gate-open"));
  assert.deepEqual(extra.analysis.pruningJustifiers, []);
  assert.ok(extra.analysis.reachableChoices.includes("take-closed-gate"));
  assert.equal(extra.terminalTide, 2);
  assert.equal(extra.terminalStatus, "completed");
});

test("family audit preserves departed/dead no-completion cycles", () => {
  const result = runFixture("no-completion-cycle", NO_COMPLETION_CYCLE_SCENARIO);
  const exact = result.exact as { noCompletionPaths: { scene: string }[]; endingWitnesses: Record<string, unknown> };
  const family = result.family as { noCompletionPaths: { scene: string }[]; endingWitnesses: Record<string, unknown> };
  assert.deepEqual([...new Set(exact.noCompletionPaths.map(entry => entry.scene))].sort(), ["loop", "start"]);
  assert.deepEqual([...new Set(family.noCompletionPaths.map(entry => entry.scene))].sort(), ["loop", "start"]);
  assert.deepEqual(Object.keys(exact.endingWitnesses).sort(), ["drown-cycle", "leave-cycle"]);
  assert.deepEqual(Object.keys(family.endingWitnesses).sort(), ["drown-cycle", "leave-cycle"]);
  const exactChoices = result.exact as { choiceWitnesses: Record<string, unknown> };
  assert.equal(result.replayChecks, 2 * (Object.keys(exactChoices.choiceWitnesses).length + Object.keys(exact.endingWitnesses).length));
});

test("family audit retains distinct authored terminal witnesses after terminal-family merging", () => {
  const result = runFixture("duplicate-endings", DUPLICATE_ENDING_SCENARIO, "extra = {}; ", true);
  const exact = result.exact as { endingWitnesses: Record<string, unknown> };
  const family = result.family as { endingWitnesses: Record<string, unknown>; mergedVisits: number };
  assert.deepEqual(Object.keys(family.endingWitnesses).sort(), ["finish-alpha", "finish-beta"]);
  assert.ok(Object.keys(exact.endingWitnesses).length < Object.keys(family.endingWitnesses).length, "fixture should exercise the historical terminal witness merge");
  assert.ok(family.mergedVisits > 0);
  const exactChoices = result.exact as { choiceWitnesses: Record<string, unknown> };
  assert.equal(result.replayChecks, 2 * Object.keys(exactChoices.choiceWitnesses).length + Object.keys(exact.endingWitnesses).length + Object.keys(family.endingWitnesses).length);
});
