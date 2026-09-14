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

function ferryDispatchOrigin(): GameState {
  let state = step(sharedLowResolved(), "return-to-lowsail-from-blackglass");
  state = step(state, "explore-reedway-from-lowsail");
  state = step(state, "visit-reedway-barge");
  state = step(state, "fit-reedway-regulator-as-canalwright");
  state = step(state, "visit-reedway-workers");
  state = step(state, "install-reedway-regulator-at-workers");
  state = step(state, "leave-reedway-workers");
  state = step(state, "visit-reedway-upper-watch");
  state = step(state, "post-reedway-warning-by-ferry");
  state = step(state, "return-to-blackglass-from-reedway");
  return step(state, "return-to-lowsail-from-blackglass");
}

test("the Reedway warning opens a two-route Blackglass dispatch from one inherited state", () => {
  const base = ferryDispatchOrigin();
  assert.equal(base.scene, "lowsail-after-blackglass");
  assert.equal(base.flags["reedway-warning-ferry"], true);
  assert.equal(base.flags["blackglass-dispatch-available"], true);
  assert.equal(base.resources.supplies, 1);
  assertChoice(base, "visit-blackglass-dispatch");

  const board = step(base, "visit-blackglass-dispatch");
  assert.equal(board.scene, "blackglass-dispatch");
  assert.match(observe(board).text.join("\n"), /ferry horn gave the upper-bank crews/i);
  assertChoice(board, "publish-blackglass-dispatch");
  assertChoice(board, "keep-blackglass-dispatch-quiet");

  const published = step(board, "publish-blackglass-dispatch");
  assert.equal(published.resources.supplies, 0);
  assert.equal(published.resources.risk, base.resources.risk);
  assert.equal(published.flags["blackglass-dispatch-resolved"], true);
  assert.equal(published.flags["blackglass-dispatch-published"], true);
  assert.ok(published.knownFacts.includes("blackglass-dispatch-published"));
  assert.match(observe(published).text.join("\n"), /public dispatch ledger carries/i);
  assertChoice(published, "revisit-blackglass-dispatch");
  const publishedRevisit = step(published, "revisit-blackglass-dispatch");
  assert.equal(publishedRevisit.scene, "blackglass-dispatch");
  assert.match(observe(publishedRevisit).text.join("\n"), /public dispatch ledger now carries/i);
  assertReplay(publishedRevisit);

  const quiet = step(board, "keep-blackglass-dispatch-quiet");
  const baseRisk = base.resources.risk;
  assert.ok(baseRisk !== undefined);
  assert.equal(quiet.resources.supplies, base.resources.supplies);
  assert.equal(quiet.resources.risk, baseRisk + 1);
  assert.equal(quiet.flags["blackglass-dispatch-resolved"], true);
  assert.equal(quiet.flags["blackglass-dispatch-kept-quiet"], true);
  assert.ok(quiet.knownFacts.includes("blackglass-dispatch-kept-quiet"));
  assert.match(observe(quiet).text.join("\n"), /night crew kept Reedway's warning/i);
  assertChoice(quiet, "revisit-blackglass-dispatch");
  const quietRevisit = step(quiet, "revisit-blackglass-dispatch");
  assert.equal(quietRevisit.scene, "blackglass-dispatch");
  assert.match(observe(quietRevisit).text.join("\n"), /warning stays with the night crew/i);
  assertReplay(quietRevisit);
});
