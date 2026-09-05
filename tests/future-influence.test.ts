import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeFutureInfluence,
  createFutureInfluenceAnalyzer,
  type FutureInfluenceState,
} from "../src/engine/future-influence.js";
import type { Scenario } from "../src/engine/content.js";
import { SCENARIO } from "../src/engine/content.js";
import { sharedLowResolved } from "./reedway-witnesses.js";

const BRANCH_SCENARIO: Scenario = {
  version: 1,
  initialScene: "start",
  initialResources: {
    water: 2,
    supplies: 1,
    "display-only": 4,
    tide: 0,
  },
  initialFacts: [],
  clocks: [{ id: "canal-tide", resource: "tide", max: 3 }],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The road divides." }] },
    {
      id: "distant",
      title: "Distant works",
      text: [{ text: "A private sign catches the light.", when: [{ type: "flag", flag: "weathered-sign", value: true }] }],
    },
    { id: "finish", title: "Finish", text: [{ text: "The work is done." }] },
  ],
  choices: [
    {
      id: "walk-to-distant",
      scene: "start",
      label: "Walk to the distant works",
      description: "Follow the road.",
      effects: [{ type: "goTo", scene: "distant" }],
    },
    {
      id: "spend-distant-supplies",
      scene: "distant",
      label: "Spend supplies",
      description: "Use supplies at the distant works.",
      when: [{ type: "resourceAtLeast", resource: "supplies", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "supplies", delta: -1 },
        { type: "advanceClock", clock: "canal-tide", delta: 1 },
        { type: "setFlag", flag: "distant-work-done", value: true },
        { type: "goTo", scene: "finish" },
      ],
    },
    {
      id: "finish-distant-work",
      scene: "finish",
      label: "Finish",
      description: "Finish the route.",
      effects: [],
      outcome: { status: "completed", summary: "The route is complete." },
    },
  ],
};

const PHASE_SCENARIO: Scenario = {
  version: 1,
  initialScene: "gate",
  initialResources: { water: 1 },
  initialFacts: [],
  scenes: [
    { id: "gate", title: "Gate", text: [{ text: "The phase gate." }] },
    {
      id: "early",
      title: "Early",
      text: [{ text: "The early proof.", when: [{ type: "flag", flag: "early-proof", value: true }] }],
    },
    { id: "later", title: "Later", text: [{ text: "The later path." }] },
    { id: "reset", title: "Reset", text: [{ text: "A resettable gate." }] },
    {
      id: "reset-proof",
      title: "Reset proof",
      text: [{ text: "The reset proof.", when: [{ type: "flag", flag: "reset-proof", value: true }] }],
    },
  ],
  choices: [
    {
      id: "take-early",
      scene: "gate",
      label: "Take the early path",
      description: "Go before the phase changes.",
      when: [{ type: "flag", flag: "phase", value: false }],
      effects: [{ type: "goTo", scene: "early" }],
    },
    {
      id: "raise-phase",
      scene: "gate",
      label: "Raise the phase",
      description: "Raise the phase before continuing.",
      effects: [{ type: "setFlag", flag: "phase", value: true }, { type: "goTo", scene: "later" }],
    },
    {
      id: "enter-reset",
      scene: "gate",
      label: "Enter the resettable gate",
      description: "Enter the gate that can be reset.",
      effects: [{ type: "setFlag", flag: "resettable", value: true }, { type: "goTo", scene: "reset" }],
    },
    {
      id: "take-reset-branch",
      scene: "reset",
      label: "Take the reset branch",
      description: "Use the resettable opening.",
      when: [{ type: "flag", flag: "resettable", value: false }],
      effects: [{ type: "goTo", scene: "reset-proof" }],
    },
    {
      id: "clear-reset",
      scene: "reset",
      label: "Clear the reset",
      description: "Clear the resettable phase.",
      effects: [{ type: "setFlag", flag: "resettable", value: false }, { type: "goTo", scene: "reset-proof" }],
    },
  ],
};

function playing(scene: string, flags: Readonly<Record<string, boolean>> = {}): FutureInfluenceState {
  return { scene, status: "playing", flags };
}

test("the active boundary includes distant condition/effect resources and clock resources", () => {
  const result = analyzeFutureInfluence(BRANCH_SCENARIO, playing("start"));

  assert.deepEqual(result.reachableScenes, ["distant", "finish", "start"]);
  assert.deepEqual(result.reachableChoices, ["finish-distant-work", "spend-distant-supplies", "walk-to-distant"]);
  assert.deepEqual(result.activeResources, ["supplies", "tide"]);
  assert.deepEqual(result.conservedResources, ["display-only", "water"]);
  assert.deepEqual(result.activeFlags, []);
  assert.deepEqual(result.conservedFlags, ["weathered-sign"]);
  assert.deepEqual(result.pruningJustifiers, []);
});

test("terminal states keep all resources and current-scene text flags as parameters", () => {
  const result = analyzeFutureInfluence(BRANCH_SCENARIO, {
    scene: "distant",
    status: "completed",
    flags: { "distant-work-done": true, "weathered-sign": true },
  });

  assert.deepEqual(result.reachableScenes, ["distant"]);
  assert.deepEqual(result.reachableChoices, []);
  assert.deepEqual(result.activeResources, []);
  assert.deepEqual(result.conservedResources, ["display-only", "supplies", "tide", "water"]);
  assert.deepEqual(result.activeFlags, []);
  assert.deepEqual(result.conservedFlags, ["weathered-sign"]);
  assert.deepEqual(result.pruningJustifiers, []);
});

test("resettable gates remain in the closure while a later true write closes a false-first branch", () => {
  const analysis = analyzeFutureInfluence(PHASE_SCENARIO, playing("gate"));
  const before = analyzeFutureInfluence(PHASE_SCENARIO, playing("gate", { phase: true }));
  const reset = analyzeFutureInfluence(PHASE_SCENARIO, playing("reset", { resettable: true }));

  assert.ok(analysis.reachableScenes.includes("early"));
  assert.ok(analysis.activeFlags.includes("phase"));
  assert.ok(before.reachableScenes.includes("later"));
  assert.equal(before.reachableScenes.includes("early"), false);
  assert.equal(before.reachableChoices.includes("take-early"), false);
  assert.deepEqual(before.pruningJustifiers, ["phase"]);
  assert.equal(before.activeFlags.includes("early-proof"), false);
  assert.ok(reset.reachableScenes.includes("reset-proof"));
  assert.ok(reset.activeFlags.includes("resettable"));
  assert.deepEqual(reset.pruningJustifiers, []);
});

test("unknown conditions, effects, references, and destinations fail closed", () => {
  const unknownCondition = {
    ...BRANCH_SCENARIO,
    scenes: BRANCH_SCENARIO.scenes.map((scene, index) => index === 0
      ? { ...scene, text: [{ text: "unknown", when: [{ type: "futureCondition" }] }] }
      : scene),
  } as unknown as Scenario;
  const unknownEffect = {
    ...BRANCH_SCENARIO,
    choices: BRANCH_SCENARIO.choices.map((choice, index) => index === 0
      ? { ...choice, effects: [{ type: "futureEffect" }] }
      : choice),
  } as unknown as Scenario;
  const unknownClock = {
    ...BRANCH_SCENARIO,
    choices: BRANCH_SCENARIO.choices.map((choice, index) => index === 0
      ? { ...choice, effects: [{ type: "advanceClock", clock: "missing-clock", delta: 1 }] }
      : choice),
  } as unknown as Scenario;
  const unknownDestination = {
    ...BRANCH_SCENARIO,
    choices: BRANCH_SCENARIO.choices.map((choice, index) => index === 0
      ? { ...choice, effects: [{ type: "goTo", scene: "missing-scene" }] }
      : choice),
  } as unknown as Scenario;

  assert.throws(() => analyzeFutureInfluence(unknownCondition, playing("start")), /unknown condition type/);
  assert.throws(() => analyzeFutureInfluence(unknownEffect, playing("start")), /unknown effect type/);
  assert.throws(() => analyzeFutureInfluence(unknownClock, playing("start")), /unknown clock/);
  assert.throws(() => analyzeFutureInfluence(unknownDestination, playing("start")), /unknown destination/);
});

test("permanent closure cannot hide unknown behavior from the influence proof", () => {
  const invalid = {
    ...PHASE_SCENARIO,
    choices: PHASE_SCENARIO.choices.map(choice => choice.id === "take-early"
      ? { ...choice, effects: [{ type: "unsupported-behind-closed-gate" }] }
      : choice),
  } as unknown as Scenario;
  assert.throws(() => analyzeFutureInfluence(invalid, playing("gate", { phase: true })), /unknown effect type/);
});

test("resolved shores retain future costs while preserving old displayed history as parameters", () => {
  const result = analyzeFutureInfluence(SCENARIO, sharedLowResolved());
  assert.deepEqual(result.conservedResources, ["archive-evidence", "evacuees", "tide"]);
  assert.ok(result.activeResources.includes("water"), "the canalwright exchange still spends water");
  assert.ok(result.activeResources.includes("risk"), "old completed choices still read Risk");
  assert.ok(result.conservedFlags.includes("archive-verdict-exposed"));
  assert.ok(result.conservedFlags.includes("shared-water"));
  assert.ok(result.activeFlags.includes("reedway-salvager-hostile"), "care can still reset hostility");
  assert.ok(result.pruningJustifiers.includes("blackglass-resolved"));
  assert.equal(result.reachableScenes.includes("pressure-control"), false);
});

test("a compiled analyzer keeps a detached Scenario snapshot", () => {
  const mutableScenario = structuredClone(BRANCH_SCENARIO) as Scenario;
  const analyzer = createFutureInfluenceAnalyzer(mutableScenario);
  const before = analyzer(playing("start"));

  const firstChoice = mutableScenario.choices[0] as unknown as {
    effects: Array<{ type: string; scene?: string }>;
  };
  firstChoice.effects[0]!.scene = "finish";
  assert.equal(firstChoice.effects[0]!.scene, "finish");

  assert.deepEqual(analyzer(playing("start")), before);
  assert.ok(before.reachableScenes.includes("distant"));
});

test("the cache follows monotone phase flags and ignores irrelevant history flags", () => {
  const analyzer = createFutureInfluenceAnalyzer(PHASE_SCENARIO);
  const flags: Record<string, boolean> = {};

  const open = analyzer({ scene: "gate", status: "playing", flags });
  assert.ok(open.reachableScenes.includes("early"));

  flags.phase = true;
  const closed = analyzer({ scene: "gate", status: "playing", flags });
  assert.equal(closed.reachableScenes.includes("early"), false);
  assert.deepEqual(closed.pruningJustifiers, ["phase"]);

  const sameClosed = analyzer({
    scene: "gate",
    status: "playing",
    flags: { phase: true, "unrelated-history": true },
  });
  assert.strictEqual(sameClosed, closed);

  flags.phase = false;
  const reopened = analyzer({ scene: "gate", status: "playing", flags });
  assert.ok(reopened.reachableScenes.includes("early"));
  assert.notStrictEqual(reopened, closed);
});

test("compiled analyses are deeply immutable and cannot poison the cache", () => {
  const analyzer = createFutureInfluenceAnalyzer(BRANCH_SCENARIO);
  const first = analyzer(playing("start"));

  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.reachableScenes), true);
  assert.throws(() => (first.reachableScenes as string[]).push("poison"), TypeError);
  assert.throws(() => {
    (first as { activeFlags: readonly string[] }).activeFlags = ["poison"];
  }, TypeError);

  const second = analyzer(playing("start"));
  assert.strictEqual(second, first);
  assert.equal(second.reachableScenes.includes("poison"), false);
});

test("globally unread flag writers stay outside the future influence boundary", () => {
  const scenario = structuredClone(BRANCH_SCENARIO) as Scenario;
  const firstChoice = scenario.choices[0] as unknown as { effects: Array<Record<string, unknown>> };
  firstChoice.effects.unshift({ type: "setFlag", flag: "unread-marker", value: true });

  const result = analyzeFutureInfluence(scenario, playing("start"));
  assert.equal(result.activeFlags.includes("unread-marker"), false);
  assert.equal(result.conservedFlags.includes("unread-marker"), false);
});

test("a writer is retained when a later scene-text condition reads its flag", () => {
  const scenario = structuredClone(BRANCH_SCENARIO) as Scenario;
  const firstChoice = scenario.choices[0] as unknown as { effects: Array<Record<string, unknown>> };
  firstChoice.effects.unshift({ type: "setFlag", flag: "late-text-marker", value: true });
  const distant = scenario.scenes.find((scene) => scene.id === "distant") as unknown as { text: Array<unknown> };
  distant.text.push({
    text: "The later marker catches the light.",
    when: [{ type: "flag", flag: "late-text-marker", value: true }],
  });

  const result = analyzeFutureInfluence(scenario, playing("start"));
  assert.ok(result.activeFlags.includes("late-text-marker"));
  assert.equal(result.conservedFlags.includes("late-text-marker"), false);
});

test("a writer is retained when a later choice condition reads its flag", () => {
  const scenario = structuredClone(BRANCH_SCENARIO) as Scenario;
  const firstChoice = scenario.choices[0] as unknown as { effects: Array<Record<string, unknown>> };
  firstChoice.effects.unshift({ type: "setFlag", flag: "choice-marker", value: true });
  const spendChoice = scenario.choices.find((choice) => choice.id === "spend-distant-supplies") as unknown as {
    when?: Array<Record<string, unknown>>;
  };
  spendChoice.when = [
    ...(spendChoice.when ?? []),
    { type: "flag", flag: "choice-marker", value: true },
  ];

  const result = analyzeFutureInfluence(scenario, playing("start"));
  assert.ok(result.activeFlags.includes("choice-marker"));
  assert.equal(result.conservedFlags.includes("choice-marker"), false);
});
