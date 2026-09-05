import assert from "node:assert/strict";
import test from "node:test";
import { analyzeFutureInfluence, type FutureInfluenceState } from "../src/engine/future-influence.js";
import type { Scenario } from "../src/engine/content.js";

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
  assert.deepEqual(result.activeFlags, ["distant-work-done"]);
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
