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
