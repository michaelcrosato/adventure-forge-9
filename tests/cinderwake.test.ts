import assert from "node:assert/strict";
import test from "node:test";
import { observe, replay, restore, save, stateHash, type GameState } from "../src/engine/index.js";
import { sharedLowResolved, step } from "./reedway-witnesses.js";

function assertChoice(state: GameState, id: string): void {
  assert.ok(observe(state).choices.some(choice => choice.id === id), `${id} unavailable in ${state.scene}`);
}

function assertReplay(state: GameState): void {
  const restored = restore(save(state));
  assert.deepEqual(restored, state);
  assert.equal(stateHash(restored), stateHash(state));
  assert.deepEqual(replay(state.seed, state.history.map(action => ({
    choiceId: action.choiceId,
    expectedRevision: action.fromRevision,
  }))), state);
}

function cinderwakeOrigin(): GameState {
  let state = sharedLowResolved();
  state = step(state, "return-to-lowsail-from-blackglass");
  state = step(state, "explore-reedway-from-lowsail");
  state = step(state, "visit-reedway-barge");
  state = step(state, "fit-reedway-regulator-as-canalwright");
  state = step(state, "visit-reedway-workers");
  state = step(state, "install-reedway-regulator-at-workers");
  state = step(state, "leave-reedway-workers");
  state = step(state, "visit-reedway-upper-watch");
  state = step(state, "post-reedway-warning-by-ferry");
  state = step(state, "revisit-reedway-upper-watch-by-ferry");
  state = step(state, "follow-ferry-warning-to-saltreach");
  state = step(state, "visit-saltreach-channel-works");
  state = step(state, "mark-saltreach-channel");
  state = step(state, "take-fenward-causeway");
  state = step(state, "visit-fenward-ford");
  state = step(state, "chart-fenward-ford");
  return state;
}

test("Cinderwake opens two industrial approaches beyond Fenward and changes the return", () => {
  const fenward = cinderwakeOrigin();
  assert.equal(fenward.scene, "fenward-landing");
  assertChoice(fenward, "take-cinderwake-lock-road");
  assertChoice(fenward, "take-cinderwake-smoke-road");
  const origin = step(fenward, "take-cinderwake-lock-road");

  const lock = step(step(origin, "visit-cinderwake-lockhouse"), "secure-cinderwake-lock");
  assert.equal(lock.resources.supplies, (origin.resources.supplies ?? 0) - 1);
  assert.equal(lock.flags["cinderwake-resolved"], true);
  assert.equal(lock.flags["cinderwake-lock-secured"], true);
  assert.ok(lock.knownFacts.includes("cinderwake-lock-secured"));
  assert.match(observe(lock).text.join("\n"), /lock gates now hold the Cinderwake flow/i);

  const returned = step(lock, "return-to-fenward-from-cinderwake");
  assert.match(observe(returned).text.join("\n"), /Cinderwake lock now holds/i);
  assertChoice(returned, "revisit-cinderwake-from-fenward");
  assertReplay(step(returned, "revisit-cinderwake-from-fenward"));

  const smoke = step(step(origin, "visit-cinderwake-smoke-road"), "mark-cinderwake-smoke-road");
  assert.equal(smoke.resources.risk, (origin.resources.risk ?? 0) + 1);
  assert.equal(smoke.flags["cinderwake-resolved"], true);
  assert.equal(smoke.flags["cinderwake-smoke-road-marked"], true);
  assert.ok(smoke.knownFacts.includes("cinderwake-smoke-road-marked"));
  assert.match(observe(smoke).text.join("\n"), /smoke-road marks lead the night haul/i);
  assertReplay(smoke);
});

test("Cinderwake stays closed until Fenward has a resolved route", () => {
  let state = sharedLowResolved();
  state = step(state, "return-to-lowsail-from-blackglass");
  state = step(state, "explore-reedway-from-lowsail");
  state = step(state, "visit-reedway-barge");
  state = step(state, "fit-reedway-regulator-as-canalwright");
  state = step(state, "visit-reedway-workers");
  state = step(state, "install-reedway-regulator-at-workers");
  state = step(state, "leave-reedway-workers");
  state = step(state, "visit-reedway-upper-watch");
  state = step(state, "post-reedway-warning-by-ferry");
  state = step(state, "revisit-reedway-upper-watch-by-ferry");
  state = step(state, "follow-ferry-warning-to-saltreach");
  state = step(state, "visit-saltreach-channel-works");
  state = step(state, "mark-saltreach-channel");
  state = step(state, "take-fenward-causeway");
  assert.equal(observe(state).choices.some(choice => choice.id === "take-cinderwake-lock-road"), false);
  assert.equal(observe(state).choices.some(choice => choice.id === "take-cinderwake-smoke-road"), false);
});
