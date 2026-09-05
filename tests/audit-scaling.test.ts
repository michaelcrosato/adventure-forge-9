import assert from "node:assert/strict";
import test from "node:test";
import { analyzeFutureReads, auditScenario, futureStateKey } from "../src/engine/audit.js";
import { SCENARIO, type Scenario } from "../src/engine/content.js";
import type { AuditStateProjection } from "../src/engine/audit.js";

const MINI_SCENARIO: Scenario = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The beginning." }] },
    {
      id: "late",
      title: "Late branch",
      text: [{ text: "The late proof is visible.", when: [{ type: "flag", flag: "late-proof", value: true }] }],
    },
    {
      id: "side",
      title: "Side branch",
      text: [{ text: "The side proof is visible.", when: [{ type: "flag", flag: "side-proof", value: true }] }],
    },
  ],
  choices: [
    {
      id: "go-late",
      scene: "start",
      label: "Go late",
      description: "Take the late branch.",
      when: [{ type: "flag", flag: "early-only", value: true }],
      effects: [{ type: "goTo", scene: "late" }],
    },
    {
      id: "go-side",
      scene: "start",
      label: "Go side",
      description: "Take the side branch.",
      effects: [{ type: "goTo", scene: "side" }],
    },
    {
      id: "finish-late",
      scene: "late",
      label: "Finish late",
      description: "Finish the late branch.",
      effects: [],
      outcome: { status: "completed", summary: "The late branch is complete." },
    },
    {
      id: "finish-side",
      scene: "side",
      label: "Finish side",
      description: "Finish the side branch.",
      effects: [],
      outcome: { status: "completed", summary: "The side branch is complete." },
    },
  ],
};

const RESETTABLE_SCENARIO: Scenario = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The beginning." }] },
    { id: "reset", title: "Reset", text: [{ text: "The resettable gate." }] },
    { id: "branch", title: "Branch", text: [{ text: "The branch proof.", when: [{ type: "flag", flag: "branch-proof", value: true }] }] },
  ],
  choices: [
    {
      id: "enter-reset",
      scene: "start",
      label: "Enter reset",
      description: "Enter the resettable gate.",
      effects: [{ type: "setFlag", flag: "resettable-phase", value: true }, { type: "goTo", scene: "reset" }],
    },
    {
      id: "reset-phase",
      scene: "reset",
      label: "Reset phase",
      description: "Reset the phase before continuing.",
      effects: [{ type: "setFlag", flag: "resettable-phase", value: false }, { type: "goTo", scene: "branch" }],
    },
    {
      id: "follow-resettable-branch",
      scene: "reset",
      label: "Follow the branch",
      description: "Follow the branch while the phase is clear.",
      when: [{ type: "flag", flag: "resettable-phase", value: false }],
      effects: [{ type: "goTo", scene: "branch" }],
    },
    {
      id: "finish-reset-branch",
      scene: "branch",
      label: "Finish",
      description: "Finish the branch.",
      effects: [],
      outcome: { status: "completed", summary: "The reset branch is complete." },
    },
  ],
};

const FALSE_FIRST_SCENARIO: Scenario = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The beginning." }] },
    { id: "gate", title: "Gate", text: [{ text: "The phase gate." }] },
    { id: "before", title: "Before", text: [{ text: "The early proof.", when: [{ type: "flag", flag: "before-proof", value: true }] }] },
    { id: "after", title: "After", text: [{ text: "The later path." }] },
  ],
  choices: [
    {
      id: "enter-gate",
      scene: "start",
      label: "Enter gate",
      description: "Enter the phase gate.",
      effects: [{ type: "goTo", scene: "gate" }],
    },
    {
      id: "take-before",
      scene: "gate",
      label: "Take the early path",
      description: "Take the path before the phase changes.",
      when: [{ type: "flag", flag: "phase", value: false }],
      effects: [{ type: "goTo", scene: "before" }],
    },
    {
      id: "raise-phase",
      scene: "gate",
      label: "Raise the phase",
      description: "Raise the phase before continuing.",
      effects: [{ type: "setFlag", flag: "phase", value: true }, { type: "goTo", scene: "after" }],
    },
    {
      id: "finish-before",
      scene: "before",
      label: "Finish before",
      description: "Finish the early path.",
      effects: [],
      outcome: { status: "completed", summary: "The early path is complete." },
    },
    {
      id: "finish-after",
      scene: "after",
      label: "Finish after",
      description: "Finish the later path.",
      effects: [],
      outcome: { status: "completed", summary: "The later path is complete." },
    },
  ],
};

const DIFFERENT_JUSTIFIERS_SCENARIO: Scenario = {
  version: 1,
  initialScene: "hub",
  initialResources: { water: 1 },
  initialFacts: [],
  scenes: [
    { id: "hub", title: "Hub", text: [{ text: "The two gates." }] },
    { id: "first", title: "First", text: [{ text: "The first proof.", when: [{ type: "flag", flag: "first-proof", value: true }] }] },
    { id: "second", title: "Second", text: [{ text: "The second proof.", when: [{ type: "flag", flag: "second-proof", value: true }] }] },
  ],
  choices: [
    {
      id: "go-first",
      scene: "hub",
      label: "Go first",
      description: "Take the first gate.",
      when: [{ type: "flag", flag: "phase-a", value: false }],
      effects: [{ type: "goTo", scene: "first" }],
    },
    {
      id: "go-second",
      scene: "hub",
      label: "Go second",
      description: "Take the second gate.",
      when: [{ type: "flag", flag: "phase-b", value: false }],
      effects: [{ type: "goTo", scene: "second" }],
    },
    {
      id: "finish-first",
      scene: "first",
      label: "Finish first",
      description: "Finish the first gate.",
      effects: [{ type: "setFlag", flag: "phase-a", value: true }],
      outcome: { status: "completed", summary: "The first gate is complete." },
    },
    {
      id: "finish-second",
      scene: "second",
      label: "Finish second",
      description: "Finish the second gate.",
      effects: [{ type: "setFlag", flag: "phase-b", value: true }],
      outcome: { status: "completed", summary: "The second gate is complete." },
    },
  ],
};

function playingProjection(scene: string, flags: Readonly<Record<string, boolean>> = {}): AuditStateProjection {
  return { scene, status: "playing", flags, resources: { water: 1 } };
}

test("future reads follow every authored edge and drop reads from the past", () => {
  const analysis = analyzeFutureReads(MINI_SCENARIO);

  assert.deepEqual(analysis.reachableScenes, ["late", "side", "start"]);
  assert.deepEqual(analysis.reachableScenesByScene.get("late"), ["late"]);
  assert.deepEqual(analysis.reachableScenesByScene.get("side"), ["side"]);
  assert.deepEqual(analysis.retainedFlagsByScene.get("start"), ["early-only", "late-proof", "side-proof"]);
  assert.deepEqual(analysis.retainedFlagsByScene.get("late"), ["late-proof"]);
  assert.deepEqual(analysis.retainedFlagsByScene.get("side"), ["side-proof"]);
  assert.deepEqual(analysis.terminalTextFlagsByScene.get("start"), []);
  assert.deepEqual(analysis.terminalTextFlagsByScene.get("late"), ["late-proof"]);
  assert.deepEqual(analysis.terminalTextFlagsByScene.get("side"), ["side-proof"]);
});

test("terminal keys keep visible text, resources, and ending identity while dropping choice-only flags", () => {
  const analysis = analyzeFutureReads(MINI_SCENARIO);
  const terminalFlags = new Set(analysis.terminalTextFlagsByScene.get("late") ?? []);
  const playingFlags = new Set(analysis.retainedFlagsByScene.get("start") ?? []);
  const terminal: AuditStateProjection = {
    scene: "late",
    resources: { water: 2 },
    flags: { "late-proof": false, "early-only": true },
    status: "completed",
    receipt: { kind: "completed", summary: "The late branch is complete." },
  };

  assert.notEqual(
    futureStateKey(terminal, terminalFlags),
    futureStateKey({ ...terminal, flags: { "late-proof": true, "early-only": true } }, terminalFlags),
    "terminal text conditions remain observable",
  );
  assert.notEqual(
    futureStateKey(terminal, terminalFlags),
    futureStateKey({ ...terminal, resources: { water: 1 } }, terminalFlags),
    "terminal resource projections remain exact",
  );
  assert.notEqual(
    futureStateKey(terminal, terminalFlags),
    futureStateKey({ ...terminal, receipt: { kind: "departed", summary: "The late branch was left." } }, terminalFlags),
    "terminal ending identity remains distinct",
  );
  assert.equal(
    futureStateKey(
      { ...terminal, scene: "start", flags: { "early-only": true }, receipt: { kind: "completed", summary: "The run is complete." } },
      new Set(analysis.terminalTextFlagsByScene.get("start") ?? []),
    ),
    futureStateKey(
      { ...terminal, scene: "start", flags: { "early-only": false }, receipt: { kind: "completed", summary: "The run is complete." } },
      new Set(analysis.terminalTextFlagsByScene.get("start") ?? []),
    ),
    "flags used only by a future choice are irrelevant after termination",
  );
  assert.notEqual(
    futureStateKey(
      { ...terminal, scene: "start", status: "playing", receipt: undefined },
      playingFlags,
    ),
    futureStateKey(
      { ...terminal, scene: "start", status: "playing", receipt: undefined, flags: { "late-proof": false, "early-only": false } },
      playingFlags,
    ),
    "playing keys retain flags needed to enumerate legal choices",
  );
});

test("future keys normalize irrelevant flags while retaining resources and endings", () => {
  const retained = new Set(["late-proof"]);
  const playing: AuditStateProjection = {
    scene: "late",
    resources: { water: 2 },
    flags: { "late-proof": false, "history-only": true },
    status: "playing",
  };
  const sameFutureState: AuditStateProjection = {
    ...playing,
    flags: { "late-proof": false, "different-history-only": false },
  };

  assert.equal(futureStateKey(playing, retained), futureStateKey(sameFutureState, retained));
  assert.equal(
    futureStateKey(playing, retained),
    futureStateKey({ ...playing, flags: {} }, retained),
    "absent and false flags have the same condition semantics",
  );
  assert.notEqual(futureStateKey(playing, retained), futureStateKey({ ...playing, resources: { water: 1 } }, retained));
  assert.notEqual(futureStateKey(playing, retained), futureStateKey({ ...playing, flags: { "late-proof": true } }, retained));
  assert.notEqual(
    futureStateKey(playing, retained),
    futureStateKey({ ...playing, status: "completed", receipt: { kind: "completed", summary: "done" } }, retained),
  );
  assert.notEqual(
    futureStateKey({ ...playing, status: "completed", receipt: { kind: "completed", summary: "done" } }, retained),
    futureStateKey({ ...playing, status: "completed", receipt: { kind: "completed", summary: "different ending" } }, retained),
  );
});

test("resettable flags are never treated as permanent phase gates", () => {
  const analysis = analyzeFutureReads(RESETTABLE_SCENARIO);

  assert.equal(analysis.monotoneFlags.includes("resettable-phase"), false);
  const retained = analysis.retainedFlagsForState(playingProjection("reset", { "resettable-phase": true }));
  assert.ok(retained.includes("resettable-phase"));
  assert.ok(retained.includes("branch-proof"), "a resettable false gate must retain its destination reads");
});

test("a false-first gate is retained until a later true write makes it permanent", () => {
  const analysis = analyzeFutureReads(FALSE_FIRST_SCENARIO);

  assert.ok(analysis.monotoneFlags.includes("phase"));
  const beforePhase = analysis.retainedFlagsForState(playingProjection("gate"));
  assert.deepEqual(beforePhase, ["before-proof", "phase"]);

  const afterPhase = analysis.retainedFlagsForState(playingProjection("gate", { phase: true }));
  assert.deepEqual(afterPhase, ["phase"]);
  assert.deepEqual(
    afterPhase,
    analysis.retainedFlagsForState(playingProjection("gate", { phase: true, "irrelevant-history": true })),
    "historical true flags outside the phase mask do not enter the retained key",
  );
});

test("different phase justifiers produce different retained closures", () => {
  const analysis = analyzeFutureReads(DIFFERENT_JUSTIFIERS_SCENARIO);

  assert.deepEqual(analysis.phaseFlagsByScene.get("hub"), ["phase-a", "phase-b"]);
  assert.deepEqual(
    analysis.retainedFlagsForState(playingProjection("hub", { "phase-a": true, "phase-b": false })),
    ["phase-a", "phase-b", "second-proof"],
  );
  assert.deepEqual(
    analysis.retainedFlagsForState(playingProjection("hub", { "phase-a": false, "phase-b": true })),
    ["first-proof", "phase-a", "phase-b"],
  );
  assert.deepEqual(
    analysis.retainedFlagsForState(playingProjection("hub", { "phase-a": true, "phase-b": true })),
    ["phase-a", "phase-b"],
  );
});

test("the production future read set retains late Archive branches", () => {
  const analysis = analyzeFutureReads(SCENARIO);
  const hallFlags = analysis.retainedFlagsByScene.get("archive-hall") ?? [];
  const reckoningFlags = analysis.retainedFlagsByScene.get("lowsail-reckoning") ?? [];

  assert.ok(analysis.reachableScenes.includes("lowsail-reckoning"));
  assert.ok(hallFlags.includes("archive-verdict-exposed"));
  assert.ok(hallFlags.includes("archive-witness-protected"));
  assert.ok(reckoningFlags.includes("archive-verdict-sealed"));
  assert.equal(reckoningFlags.includes("archive-ledger-evidence"), false);
});

test("future-read analysis fails closed when the content vocabulary grows", () => {
  const unknownEffectScenario = {
    ...MINI_SCENARIO,
    choices: MINI_SCENARIO.choices.map((choice, index) => index === 0
      ? { ...choice, effects: [{ type: "futureEffect" }] }
      : choice),
  } as unknown as Scenario;
  const unknownConditionScenario = {
    ...MINI_SCENARIO,
    scenes: MINI_SCENARIO.scenes.map((scene, index) => index === 0
      ? { ...scene, text: [{ text: "Unknown condition", when: [{ type: "futureCondition" }] }] }
      : scene),
  } as unknown as Scenario;

  assert.throws(() => analyzeFutureReads(unknownEffectScenario), /unknown effect type/);
  assert.throws(() => analyzeFutureReads(unknownConditionScenario), /unknown condition type/);
});

test("a diagnostic workload limit fails without claiming exhaustive coverage", () => {
  assert.throws(() => auditScenario(1), /exceeded 1 future-relevant states; exhaustive coverage is not established/);
  for (const limit of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => auditScenario(limit), /Invalid audit state limit/);
  }
});
