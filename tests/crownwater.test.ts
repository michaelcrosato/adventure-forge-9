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

function crownwaterOrigin(): GameState {
  let state = sharedLowResolved();
  for (const choice of [
    "return-to-lowsail-from-blackglass",
    "explore-reedway-from-lowsail",
    "visit-reedway-barge",
    "fit-reedway-regulator-as-canalwright",
    "visit-reedway-workers",
    "install-reedway-regulator-at-workers",
    "leave-reedway-workers",
    "visit-reedway-upper-watch",
    "post-reedway-warning-by-ferry",
    "revisit-reedway-upper-watch-by-ferry",
    "follow-ferry-warning-to-saltreach",
    "visit-saltreach-channel-works",
    "mark-saltreach-channel",
    "take-fenward-causeway",
    "visit-fenward-ford",
    "chart-fenward-ford",
    "take-cinderwake-smoke-road",
    "visit-cinderwake-smoke-road",
    "mark-cinderwake-smoke-road",
    "take-gloamfen-sluice-road",
    "visit-gloamfen-sluicehouse",
    "secure-gloamfen-lock",
    "take-stormvault-signal-road",
    "visit-stormvault-signal-tower",
    "raise-stormvault-signal",
  ]) state = step(state, choice);
  return state;
}

test("Crownwater offers bell and weir approaches beyond Stormvault", () => {
  const origin = crownwaterOrigin();
  assert.equal(origin.scene, "stormvault-landing");
  assertChoice(origin, "take-crownwater-bell-road");
  assertChoice(origin, "take-crownwater-weir-road");

  const bell = step(step(step(origin, "take-crownwater-bell-road"), "visit-crownwater-bellhouse"), "ring-crownwater-bell");
  assert.equal(bell.resources["archive-evidence"], (origin.resources["archive-evidence"] ?? 0) - 1);
  assert.equal(bell.flags["crownwater-resolved"], true);
  assert.equal(bell.flags["crownwater-bell-rung"], true);
  assert.ok(bell.knownFacts.includes("crownwater-bell-rung"));
  assert.match(observe(bell).text.join("\n"), /warning bell now carries/i);
  const returned = step(bell, "return-to-stormvault-from-crownwater");
  assertChoice(returned, "revisit-crownwater-from-stormvault");
  assertReplay(step(returned, "revisit-crownwater-from-stormvault"));

  const weir = step(step(step(origin, "take-crownwater-weir-road"), "visit-crownwater-weir"), "set-crownwater-weir");
  assert.equal(weir.resources.risk, (origin.resources.risk ?? 0) + 1);
  assert.equal(weir.flags["crownwater-resolved"], true);
  assert.equal(weir.flags["crownwater-weir-set"], true);
  assert.ok(weir.knownFacts.includes("crownwater-weir-set"));
  assert.match(observe(weir).text.join("\n"), /weir now releases/i);
  assertReplay(weir);
});

test("Crownwater remains gated until Stormvault is resolved", () => {
  let state = sharedLowResolved();
  for (const choice of [
    "return-to-lowsail-from-blackglass",
    "explore-reedway-from-lowsail",
    "visit-reedway-barge",
    "fit-reedway-regulator-as-canalwright",
    "visit-reedway-workers",
    "install-reedway-regulator-at-workers",
    "leave-reedway-workers",
    "visit-reedway-upper-watch",
    "post-reedway-warning-by-ferry",
    "revisit-reedway-upper-watch-by-ferry",
    "follow-ferry-warning-to-saltreach",
    "visit-saltreach-channel-works",
    "mark-saltreach-channel",
    "take-fenward-causeway",
    "visit-fenward-ford",
    "chart-fenward-ford",
    "take-cinderwake-smoke-road",
    "visit-cinderwake-smoke-road",
    "mark-cinderwake-smoke-road",
    "take-gloamfen-sluice-road",
    "visit-gloamfen-sluicehouse",
    "secure-gloamfen-lock",
    "take-stormvault-signal-road",
  ]) state = step(state, choice);
  assert.equal(observe(state).choices.some(choice => choice.id === "take-crownwater-bell-road"), false);
  assert.equal(observe(state).choices.some(choice => choice.id === "take-crownwater-weir-road"), false);
});
