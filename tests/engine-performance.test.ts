import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  InvalidStateError,
  SaveFormatError,
  observe,
  restore,
  save,
  stateHash,
  type GameState,
} from "../src/engine/index.js";
import { walk } from "./witnesses.js";

// This is a longest authored route found by exhaustive path enumeration on the
// current scenario. It is used as a real state witness, not as a world-size claim.
const LONGEST_WITNESS = [
  "hear-council",
  "take-council-seal",
  "ask-clinic-before-leaving",
  "make-clinic-promise",
  "continue-with-council-seal",
  "borrow-repair-tools",
  "follow-canal",
  "read-stolen-order",
  "repair-and-share-water",
  "release-shared-water",
  "bring-shared-water-to-clinic",
  "deliver-clinic-medicine",
] as const;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function mutableCopy(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

test("external copies are revalidated after mutation, including frozen and rehashed forgeries", () => {
  const source = walk(LONGEST_WITNESS.slice(0, -1), 29);
  assert.equal(source.status, "playing");

  const external = mutableCopy(source);
  assert.doesNotThrow(() => observe(external));
  (external.resources as Record<string, number>).supplies = external.resources.supplies! + 1;
  assert.throws(() => observe(external), InvalidStateError);

  const frozen = mutableCopy(source);
  (frozen.resources as Record<string, number>).supplies = frozen.resources.supplies! + 1;
  deepFreeze(frozen);
  assert.throws(() => observe(frozen), InvalidStateError);

  const envelope = JSON.parse(save(source)) as {
    format: string;
    version: number;
    buildId: string;
    payload: GameState;
    hash: string;
  };
  (envelope.payload.resources as Record<string, number>).supplies = envelope.payload.resources.supplies! + 1;
  // A caller can rehash the visible envelope, but cannot manufacture a valid
  // checkpoint without also producing a history-consistent state.
  envelope.hash = stateHash(envelope.payload);
  assert.throws(() => restore(JSON.stringify(envelope)), SaveFormatError);
});

test("indexed legal choices preserve the full authored witness", () => {
  const state = walk(LONGEST_WITNESS, 31);
  assert.equal(state.status, "completed");
  assert.equal(state.revision, LONGEST_WITNESS.length);
  assert.deepEqual(state.history.map((action) => action.choiceId), [...LONGEST_WITNESS]);
  assert.deepEqual(observe(state).choices, []);
});

test("bounded repeated observes on the genuine longest witness", () => {
  const state = walk(LONGEST_WITNESS, 37);
  assert.equal(state.revision, 12);
  assert.equal(state.status, "completed");
  const expected = observe(state);

  for (const repeats of [100, 1000] as const) {
    const started = performance.now();
    let checksum = 0;
    for (let iteration = 0; iteration < repeats; iteration += 1) {
      const view = observe(state);
      checksum += view.revision + view.text.length + view.facts.length;
    }
    const elapsedMs = performance.now() - started;
    assert.equal(checksum, repeats * (expected.revision + expected.text.length + expected.facts.length));
    console.log(JSON.stringify({ benchmark: "observe-longest-witness", repeats, elapsedMs: Number(elapsedMs.toFixed(3)), checksum }));
  }
});
