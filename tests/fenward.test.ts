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

function fenwardOrigin(): GameState {
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
  return step(state, "mark-saltreach-channel");
}

test("Fenward opens two approaches beyond Saltreach and changes the return", () => {
  const origin = fenwardOrigin();
  assert.equal(origin.scene, "saltreach-commons");
  assertChoice(origin, "take-fenward-causeway");
  assertChoice(origin, "take-fenward-night-ford");

  const causeway = step(origin, "take-fenward-causeway");
  assert.equal(causeway.scene, "fenward-landing");
  assert.match(observe(causeway).text.join("\n"), /Halden's channel marks brought a night convoy/i);
  const beacon = step(step(causeway, "visit-fenward-beacon"), "secure-fenward-beacon");
  assert.equal(beacon.resources.supplies, (origin.resources.supplies ?? 0) - 1);
  assert.equal(beacon.flags["fenward-resolved"], true);
  assert.equal(beacon.flags["fenward-beacon-lit"], true);
  assert.ok(beacon.knownFacts.includes("fenward-beacon-lit"));
  assert.match(observe(beacon).text.join("\n"), /beacon now marks the raised causeway/i);

  const returned = step(beacon, "return-to-saltreach-from-fenward");
  assert.match(observe(returned).text.join("\n"), /Fenward beacon now marks/i);
  assertChoice(returned, "revisit-fenward-from-saltreach");
  const revisit = step(returned, "revisit-fenward-from-saltreach");
  assert.equal(revisit.scene, "fenward-landing");
  assertReplay(revisit);

  const ford = step(step(origin, "take-fenward-night-ford"), "visit-fenward-ford");
  const charted = step(ford, "chart-fenward-ford");
  assert.equal(charted.resources.risk, (origin.resources.risk ?? 0) + 1);
  assert.equal(charted.flags["fenward-resolved"], true);
  assert.equal(charted.flags["fenward-ford-charted"], true);
  assert.ok(charted.knownFacts.includes("fenward-ford-charted"));
  assert.match(observe(charted).text.join("\n"), /Jori's ford chart carries the night convoy/i);
  assertReplay(charted);
});

test("Fenward entry remains gated until Saltreach is resolved", () => {
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
  assert.equal(observe(state).choices.some(choice => choice.id === "take-fenward-causeway"), false);
  assert.equal(observe(state).choices.some(choice => choice.id === "take-fenward-night-ford"), false);
});
