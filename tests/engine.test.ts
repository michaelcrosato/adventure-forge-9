import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILD_ID,
  IllegalChoiceError,
  SaveFormatError,
  StaleRevisionError,
  choose,
  end,
  observe,
  replay,
  restore,
  save,
  start,
  stateHash,
} from "../src/engine/index.js";
import type { GameState } from "../src/engine/index.js";
import { RAW_SCENARIO } from "../src/content/scenario.js";
import { validateScenario } from "../src/engine/content.js";

test("same seed and actions produce the same state and hash", () => {
  const actions = [
    { choiceId: "secure-cargo", expectedRevision: 0 },
    { choiceId: "finish-cargo", expectedRevision: 1 },
  ] as const;
  const first = replay(19, actions);
  const second = replay(19, actions);

  assert.deepEqual(first, second);
  assert.equal(stateHash(first), stateHash(second));
  assert.notEqual(stateHash(first), stateHash(replay(20, actions)));
  assert.match(BUILD_ID, /^af9-[0-9a-f]{24}$/);
});

test("the public projection excludes hidden state and uses readable facts", () => {
  const observation = observe(start(4));
  assert.deepEqual(Object.keys(observation).sort(), [
    "choices",
    "facts",
    "resources",
    "revision",
    "sceneId",
    "status",
    "text",
    "title",
  ]);
  const serialized = JSON.stringify(observation);
  for (const hiddenField of ["seed", "flags", "history", "buildId", "knownFacts"]) {
    assert.equal(serialized.includes(hiddenField), false, hiddenField);
  }
  assert.equal(observation.facts[0], "A storm has broken the ferry loose.");
  assert.equal(observation.choices.length, 3);
});

test("rescue route preserves people, loses cargo, and completes on return", () => {
  const initial = start();
  const returned = choose(initial, "rescue-people", 0);
  assert.equal(initial.revision, 0);
  assert.equal(returned.revision, 1);
  assert.deepEqual(returned.resources, { cargo: 0, debt: 0, risk: 0, survivors: 6 });
  assert.equal(observe(returned).choices.some((choice) => choice.id === "finish-rescue"), true);
  const completed = choose(returned, "finish-rescue", 1);
  assert.equal(completed.status, "completed");
  assert.equal(completed.receipt?.kind, "completed");
  assert.equal(completed.receipt?.revision, 2);
  assert.equal(completed.receipt?.stateHash, stateHash(completed));
});

test("cargo route exposes debt and supports completion, departure, or death", () => {
  const returned = choose(start(), "secure-cargo", 0);
  assert.deepEqual(returned.resources, { cargo: 3, debt: 2, risk: 1, survivors: 0 });
  assert.match(observe(returned).text.join(" "), /Three crates sit dry/);

  const completed = choose(returned, "finish-cargo", 1);
  assert.equal(completed.status, "completed");

  const departed = choose(returned, "depart-harbor", 1);
  assert.equal(departed.status, "departed");

  const dead = choose(returned, "risk-the-rapids", 1);
  assert.equal(dead.status, "dead");
  assert.equal(dead.receipt?.kind, "dead");
});

test("stale and illegal actions throw without changing the input", () => {
  const state = start();
  const before = stateHash(state);
  assert.throws(() => choose(state, "rescue-people", 1), StaleRevisionError);
  assert.equal(stateHash(state), before);
  assert.throws(() => choose(state, "unknown-choice", 0), IllegalChoiceError);
  assert.equal(stateHash(state), before);

  const returned = choose(state, "rescue-people", 0);
  const returnedBefore = stateHash(returned);
  assert.throws(() => choose(returned, "finish-cargo", 1), IllegalChoiceError);
  assert.equal(stateHash(returned), returnedBefore);
  assert.throws(() => choose(returned, "finish-rescue", 0), StaleRevisionError);
});

test("save, restore, replay, end, and tamper detection preserve witnesses", () => {
  const state = choose(start(8), "rescue-people", 0);
  const serialized = save(state);
  const restored = restore(serialized);
  assert.deepEqual(restored, state);
  assert.equal(stateHash(restored), stateHash(state));
  assert.deepEqual(replay(8, [{ choiceId: "rescue-people", expectedRevision: 0 }]), state);

  const departed = end(state, 1);
  assert.equal(departed.status, "departed");
  assert.equal(departed.history.at(-1)?.choiceId, "__end__");
  assert.deepEqual(replay(8, [
    { choiceId: "rescue-people", expectedRevision: 0 },
    { choiceId: "__end__", expectedRevision: 1 },
  ]), departed);

  const tampered = serialized.replace('"cargo":0', '"cargo":1');
  assert.notEqual(tampered, serialized);
  assert.throws(() => restore(tampered), SaveFormatError);

  const rehashed = JSON.parse(serialized) as {
    payload: Record<string, unknown>;
    hash: string;
  };
  const rehashedResources = rehashed.payload.resources as Record<string, number>;
  rehashedResources.cargo = 1;
  // A plain payload hash does not grant permission to invent a checkpoint;
  // restore must still replay its hidden action history.
  rehashed.hash = stateHash(rehashed.payload as unknown as GameState);
  assert.throws(() => restore(JSON.stringify(rehashed)), SaveFormatError);
  assert.throws(() => restore("not-json"), SaveFormatError);
});

test("content validation rejects unknown schema behavior", () => {
  const originalChoice = RAW_SCENARIO.choices[0];
  const malformed = {
    ...RAW_SCENARIO,
    choices: RAW_SCENARIO.choices.map((choice, index) =>
      index === 0
        ? {
            ...choice,
            effects: [{ ...choice.effects[0], type: "runArbitraryCode" }, ...choice.effects.slice(1)],
          }
        : choice,
    ),
  } as unknown;
  assert.equal(originalChoice.id, "rescue-people");
  assert.throws(() => validateScenario(malformed), /unknown effect type/);

  const cumulativeUnderflow = {
    ...RAW_SCENARIO,
    choices: RAW_SCENARIO.choices.map((choice, index) =>
      index === 0
        ? {
            ...choice,
            effects: [
              { type: "setFlag", flag: "rescued-people", value: true },
              { type: "adjustResource", resource: "cargo", delta: -3 },
              { type: "adjustResource", resource: "cargo", delta: -3 },
              { type: "goTo", scene: "ferry-return" },
            ],
          }
        : choice,
    ),
  } as unknown;
  assert.throws(() => validateScenario(cumulativeUnderflow), /could become negative/);
  assert.throws(() => restore(JSON.stringify({ format: "adventure-forge-save", version: 1 })), SaveFormatError);
});
