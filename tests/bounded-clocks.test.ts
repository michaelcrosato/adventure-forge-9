import assert from "node:assert/strict";
import test from "node:test";
import { analyzeFutureReads, futureStateKey, type AuditStateProjection } from "../src/engine/audit.js";
import { advanceClockValue, replay, restore, save, stateHash } from "../src/engine/index.js";
import { validateScenario, type Scenario } from "../src/engine/content.js";

const RAW_CLOCK_SCENARIO = {
  version: 1,
  initialScene: "clock-start",
  initialResources: { turns: 0, supplies: 1 },
  initialFacts: [],
  clocks: [{ id: "deadline", resource: "turns", max: 3 }],
  scenes: [
    {
      id: "clock-start",
      title: "Clock start",
      text: [{ text: "A bounded clock waits at the start." }],
    },
    {
      id: "clock-hall",
      title: "Clock hall",
      text: [
        { text: "The clock has not passed its second mark.", when: [{ type: "resourceAtMost", resource: "turns", value: 2 }] },
        { text: "The clock's final mark is visible.", when: [{ type: "resourceAtMost", resource: "turns", value: 3 }] },
      ],
    },
    {
      id: "clock-end",
      title: "Clock end",
      text: [{ text: "The bounded sequence is complete." }],
    },
  ],
  choices: [
    {
      id: "advance-first",
      scene: "clock-start",
      label: "Advance twice",
      description: "Spend two marks.",
      effects: [
        { type: "advanceClock", clock: "deadline", delta: 2 },
        { type: "goTo", scene: "clock-hall" },
      ],
    },
    {
      id: "advance-second",
      scene: "clock-hall",
      label: "Advance past the limit",
      description: "Attempt two more marks; the clock must saturate.",
      when: [{ type: "resourceAtMost", resource: "turns", value: 2 }],
      effects: [
        { type: "advanceClock", clock: "deadline", delta: 2 },
        { type: "goTo", scene: "clock-hall" },
      ],
    },
    {
      id: "complete-clock",
      scene: "clock-hall",
      label: "Continue",
      description: "Continue to the end of the sequence.",
      when: [{ type: "resourceAtMost", resource: "turns", value: 3 }],
      effects: [{ type: "goTo", scene: "clock-end" }],
    },
    {
      id: "finish-clock",
      scene: "clock-end",
      label: "Close the sequence",
      description: "Record the completed sequence.",
      effects: [],
      outcome: { status: "completed", summary: "The bounded sequence is complete." },
    },
  ],
} as const;

const CLOCK_SCENARIO: Scenario = validateScenario(RAW_CLOCK_SCENARIO);

function withFirstChoiceEffects(effects: readonly Record<string, unknown>[]): unknown {
  return {
    ...RAW_CLOCK_SCENARIO,
    choices: RAW_CLOCK_SCENARIO.choices.map((choice, index) => index === 0 ? { ...choice, effects } : choice),
  };
}

test("clock declarations are bounded and reject duplicate ownership and direct writers", () => {
  assert.throws(
    () => validateScenario({ ...RAW_CLOCK_SCENARIO, clocks: [{ id: "deadline", resource: "missing", max: 3 }] }),
    /unknown resource/,
  );
  assert.throws(
    () => validateScenario({ ...RAW_CLOCK_SCENARIO, initialResources: { turns: 4, supplies: 1 } }),
    /at least the initial/,
  );
  assert.throws(
    () => validateScenario({ ...RAW_CLOCK_SCENARIO, initialFacts: ["constructor"] }),
    /missing player-facing label/,
  );
  assert.throws(
    () => validateScenario({
      ...RAW_CLOCK_SCENARIO,
      clocks: [
        { id: "deadline", resource: "turns", max: 3 },
        { id: "other-deadline", resource: "turns", max: 4 },
      ],
    }),
    /only one clock/,
  );
  assert.throws(
    () => validateScenario({
      ...RAW_CLOCK_SCENARIO,
      initialResources: { turns: 0, supplies: 1, other: 0 },
      clocks: [
        { id: "deadline", resource: "turns", max: 3 },
        { id: "deadline", resource: "other", max: 1 },
      ],
    }),
    /must be unique/,
  );
  for (const max of [-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => validateScenario({ ...RAW_CLOCK_SCENARIO, clocks: [{ id: "deadline", resource: "turns", max }] }),
      /safe integer|non-negative/,
      `invalid clock maximum ${String(max)} must be rejected`,
    );
  }
  assert.throws(
    () => validateScenario(withFirstChoiceEffects([
      { type: "setResource", resource: "turns", value: 1 },
      { type: "goTo", scene: "clock-hall" },
    ])),
    /cannot be targeted/,
  );
  assert.throws(
    () => validateScenario(withFirstChoiceEffects([
      { type: "adjustResource", resource: "turns", delta: 1 },
      { type: "goTo", scene: "clock-hall" },
    ])),
    /cannot be targeted/,
  );
  assert.throws(
    () => validateScenario(withFirstChoiceEffects([
      { type: "advanceClock", clock: "unknown-clock", delta: 1 },
      { type: "goTo", scene: "clock-hall" },
    ])),
    /unknown clock/,
  );
  assert.throws(
    () => validateScenario(withFirstChoiceEffects([
      { type: "advanceClock", clock: "deadline", delta: 0 },
      { type: "goTo", scene: "clock-hall" },
    ])),
    /positive safe integer/,
  );
  for (const delta of [-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => validateScenario(withFirstChoiceEffects([
        { type: "advanceClock", clock: "deadline", delta },
        { type: "goTo", scene: "clock-hall" },
      ])),
      /safe integer|positive safe integer/,
      `invalid clock delta ${String(delta)} must be rejected`,
    );
  }
  for (const effects of [
    [
      { type: "advanceClock", clock: "deadline", delta: 1 },
      { type: "setResource", resource: "turns", value: 1 },
      { type: "goTo", scene: "clock-hall" },
    ],
    [
      { type: "advanceClock", clock: "deadline", delta: 1 },
      { type: "goTo", scene: "clock-hall" },
      { type: "adjustResource", resource: "turns", delta: 1 },
    ],
  ] as const) {
    assert.throws(
      () => validateScenario(withFirstChoiceEffects(effects)),
      /cannot be targeted/,
      "clock writers must be rejected anywhere in an effect sequence",
    );
  }
  assert.throws(
    () => validateScenario({
      ...RAW_CLOCK_SCENARIO,
      choices: RAW_CLOCK_SCENARIO.choices.map((choice, index) => index === 0
        ? { ...choice, when: [{ type: "resourceAtMost", resource: "missing", value: 1 }] }
        : choice),
    }),
    /unknown resource/,
  );
  assert.throws(
    () => validateScenario({
      ...RAW_CLOCK_SCENARIO,
      scenes: RAW_CLOCK_SCENARIO.scenes.map((scene, index) => index === 1
        ? { ...scene, text: [{ text: "bad", when: [{ type: "resourceAtMost", resource: "missing", value: 1 }] }] }
        : scene),
    }),
    /unknown resource/,
  );
});

test("advanceClock saturates at max and the validated fixture retains a resourceAtMost gate", () => {
  assert.equal(advanceClockValue(0, 3, 2), 2);
  assert.equal(advanceClockValue(2, 3, 2), 3);
  assert.equal(advanceClockValue(3, 3, 1), 3);
  assert.equal(advanceClockValue(Number.MAX_SAFE_INTEGER - 2, Number.MAX_SAFE_INTEGER, 1), Number.MAX_SAFE_INTEGER - 1);
  assert.equal(advanceClockValue(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER, 2), Number.MAX_SAFE_INTEGER);
  assert.equal(advanceClockValue(Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  assert.throws(() => advanceClockValue(4, 3, 1), /exceeds its maximum/);
  assert.throws(() => advanceClockValue(0, 3, 0), /positive safe integer/);

  const gated = CLOCK_SCENARIO.choices.find((choice) => choice.id === "advance-second");
  assert.deepEqual(gated?.when, [{ type: "resourceAtMost", resource: "turns", value: 2 }]);
  const sceneLine = CLOCK_SCENARIO.scenes.find((scene) => scene.id === "clock-hall")?.text[0];
  assert.deepEqual(sceneLine?.when, [{ type: "resourceAtMost", resource: "turns", value: 2 }]);
});

test("legacy save and replay remain deterministic without adding state fields", () => {
  const state = replay(31, []);
  assert.deepEqual(state, replay(31, []));
  assert.equal(stateHash(state), stateHash(restore(save(state))));
  assert.deepEqual(restore(save(state)), state);
  assert.deepEqual(Object.keys(state).sort(), [
    "buildId", "flags", "history", "knownFacts", "resources", "revision", "scene", "seed", "status", "version",
  ]);
});

test("future-read audit accepts clock vocabulary and retains every resource key", () => {
  const analysis = analyzeFutureReads(CLOCK_SCENARIO);
  assert.deepEqual(analysis.reachableScenes, ["clock-end", "clock-hall", "clock-start"]);
  assert.deepEqual(analysis.retainedFlags, []);

  const base: AuditStateProjection = {
    scene: "clock-hall",
    resources: { turns: 1, supplies: 1 },
    flags: {},
    status: "playing",
  };
  assert.notEqual(
    futureStateKey(base, new Set()),
    futureStateKey({ ...base, resources: { turns: 3, supplies: 1 } }, new Set()),
  );
});
