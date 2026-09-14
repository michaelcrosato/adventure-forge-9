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

function saltreachUpperWatch(warning: "ferry" | "towpath"): GameState {
  let state = sharedLowResolved();
  state = step(state, "return-to-lowsail-from-blackglass");
  state = step(state, "explore-reedway-from-lowsail");
  state = step(state, "visit-reedway-barge");
  state = step(state, "fit-reedway-regulator-as-canalwright");
  state = step(state, "visit-reedway-workers");
  state = step(state, "install-reedway-regulator-at-workers");
  state = step(state, "leave-reedway-workers");
  state = step(state, "visit-reedway-upper-watch");
  state = step(state, warning === "ferry" ? "post-reedway-warning-by-ferry" : "carry-reedway-warning-by-towpath");
  return step(state, warning === "ferry" ? "revisit-reedway-upper-watch-by-ferry" : "revisit-reedway-upper-watch-by-towpath");
}

function saltreachOrigin(warning: "ferry" | "towpath"): GameState {
  const watch = saltreachUpperWatch(warning);
  return step(watch, warning === "ferry" ? "follow-ferry-warning-to-saltreach" : "follow-towpath-warning-to-saltreach");
}

test("Saltreach opens beyond either Reedway warning and exposes two approaches from one state", () => {
  const ferry = saltreachOrigin("ferry");
  assert.equal(ferry.scene, "saltreach-commons");
  assert.equal(ferry.flags["reedway-warning-ferry"], true);
  assert.equal(ferry.flags["saltreach-resolved"], undefined);
  assertChoice(ferry, "visit-saltreach-tidehouse");
  assertChoice(ferry, "visit-saltreach-channel-works");

  const tidehouse = step(step(ferry, "visit-saltreach-tidehouse"), "secure-saltreach-tidehouse");
  assert.equal(tidehouse.resources.supplies, (ferry.resources.supplies ?? 0) - 1);
  assert.equal(tidehouse.resources.risk, ferry.resources.risk);
  assert.equal(tidehouse.flags["saltreach-resolved"], true);
  assert.equal(tidehouse.flags["saltreach-tidehouse-secured"], true);
  assert.ok(tidehouse.knownFacts.includes("saltreach-tidehouse-secured"));
  assert.match(observe(tidehouse).text.join("\n"), /tidehouse now keeps the convoy stores above/i);
  assertChoice(tidehouse, "return-to-reedway-from-saltreach");
  const returned = step(tidehouse, "return-to-reedway-from-saltreach");
  assert.equal(returned.scene, "reedway-commons");
  assertChoice(returned, "revisit-saltreach-from-reedway");
  const tidehouseRevisit = step(returned, "revisit-saltreach-from-reedway");
  assert.equal(tidehouseRevisit.scene, "saltreach-commons");
  assert.match(observe(tidehouseRevisit).text.join("\n"), /tidehouse now keeps the convoy stores above/i);
  assert.match(observe(returned).text.join("\n"), /Saltreach tidehouse keeps the convoy stores dry/i);
  assertReplay(tidehouseRevisit);

  const channel = step(step(ferry, "visit-saltreach-channel-works"), "mark-saltreach-channel");
  const ferryRisk = ferry.resources.risk;
  assert.ok(ferryRisk !== undefined);
  assert.equal(channel.resources.supplies, ferry.resources.supplies);
  assert.equal(channel.resources.risk, ferryRisk + 1);
  assert.equal(channel.flags["saltreach-resolved"], true);
  assert.equal(channel.flags["saltreach-channel-marked"], true);
  assert.ok(channel.knownFacts.includes("saltreach-channel-marked"));
  assert.match(observe(channel).text.join("\n"), /marked channel now guides the night convoy/i);
  assertReplay(channel);
});

test("the quiet warning reaches Saltreach without borrowing the ferry route", () => {
  const watch = saltreachUpperWatch("towpath");
  assertChoice(watch, "follow-towpath-warning-to-saltreach");
  assert.equal(observe(watch).choices.some(choice => choice.id === "follow-ferry-warning-to-saltreach"), false);
  const state = saltreachOrigin("towpath");
  assert.equal(state.flags["reedway-warning-towpath"], true);
  assert.match(observe(state).text.join("\n"), /quiet towpath brought you to Saltreach/i);
});
