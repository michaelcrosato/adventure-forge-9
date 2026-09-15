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

function gloamfenOrigin(): GameState {
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
  state = step(state, "take-cinderwake-smoke-road");
  state = step(state, "visit-cinderwake-smoke-road");
  state = step(state, "mark-cinderwake-smoke-road");
  return state;
}

test("Gloamfen opens two industrial approaches beyond Cinderwake and changes the return", () => {
  const cinderwake = gloamfenOrigin();
  assert.equal(cinderwake.scene, "cinderwake-landing");
  assertChoice(cinderwake, "take-gloamfen-sluice-road");
  assertChoice(cinderwake, "take-gloamfen-marsh-road");
  const origin = step(cinderwake, "take-gloamfen-sluice-road");

  const lock = step(step(origin, "visit-gloamfen-sluicehouse"), "secure-gloamfen-lock");
  assert.equal(lock.resources.supplies, (origin.resources.supplies ?? 0) - 1);
  assert.equal(lock.flags["gloamfen-resolved"], true);
  assert.equal(lock.flags["gloamfen-lock-secured"], true);
  assert.ok(lock.knownFacts.includes("gloamfen-lock-secured"));
  assert.match(observe(lock).text.join("\n"), /lock gates now hold the Gloamfen flow/i);

  const returned = step(lock, "return-to-cinderwake-from-gloamfen");
  assert.match(observe(returned).text.join("\n"), /Gloamfen sluice now holds/i);
  assertChoice(returned, "revisit-gloamfen-from-cinderwake");
  assertReplay(step(returned, "revisit-gloamfen-from-cinderwake"));

  const smoke = step(step(origin, "visit-gloamfen-marsh-road"), "mark-gloamfen-marsh-road");
  assert.equal(smoke.resources.risk, (origin.resources.risk ?? 0) + 1);
  assert.equal(smoke.flags["gloamfen-resolved"], true);
  assert.equal(smoke.flags["gloamfen-marsh-road-marked"], true);
  assert.ok(smoke.knownFacts.includes("gloamfen-marsh-road-marked"));
  assert.match(observe(smoke).text.join("\n"), /marsh-road marks lead the night haul/i);
  assertReplay(smoke);
});

test("Gloamfen stays closed until Cinderwake has a resolved route", () => {
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
  state = step(state, "take-cinderwake-smoke-road");
  assert.equal(observe(state).choices.some(choice => choice.id === "take-gloamfen-sluice-road"), false);
  assert.equal(observe(state).choices.some(choice => choice.id === "take-gloamfen-marsh-road"), false);
});
