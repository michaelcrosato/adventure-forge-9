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

function stormvaultOrigin(): GameState {
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
  ]) state = step(state, choice);
  return state;
}

test("Stormvault opens signal and cistern approaches beyond Gloamfen", () => {
  const origin = stormvaultOrigin();
  assert.equal(origin.scene, "gloamfen-landing");
  assertChoice(origin, "take-stormvault-signal-road");
  assertChoice(origin, "take-stormvault-cistern-road");

  const signal = step(step(step(origin, "take-stormvault-signal-road"), "visit-stormvault-signal-tower"), "raise-stormvault-signal");
  assert.equal(signal.resources["archive-evidence"], (origin.resources["archive-evidence"] ?? 0) - 1);
  assert.equal(signal.flags["stormvault-resolved"], true);
  assert.equal(signal.flags["stormvault-signal-raised"], true);
  assert.ok(signal.knownFacts.includes("stormvault-signal-raised"));
  assert.match(observe(signal).text.join("\n"), /signal now turns above the basin/i);
  const returned = step(signal, "return-to-gloamfen-from-stormvault");
  assert.match(observe(returned).text.join("\n"), /Stormvault signal now turns above the marsh/i);
  assertChoice(returned, "revisit-stormvault-from-gloamfen");
  assertReplay(step(returned, "revisit-stormvault-from-gloamfen"));

  const cistern = step(step(step(origin, "take-stormvault-cistern-road"), "visit-stormvault-cistern"), "open-stormvault-cistern");
  assert.equal(cistern.resources.risk, (origin.resources.risk ?? 0) + 1);
  assert.equal(cistern.flags["stormvault-resolved"], true);
  assert.equal(cistern.flags["stormvault-cistern-opened"], true);
  assert.ok(cistern.knownFacts.includes("stormvault-cistern-opened"));
  assert.match(observe(cistern).text.join("\n"), /cistern now feeds the rise/i);
  assertReplay(cistern);
});

test("Stormvault stays closed until Gloamfen has a resolved route", () => {
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
  ]) state = step(state, choice);
  assert.equal(observe(state).choices.some(choice => choice.id === "take-stormvault-signal-road"), false);
  assert.equal(observe(state).choices.some(choice => choice.id === "take-stormvault-cistern-road"), false);
});
