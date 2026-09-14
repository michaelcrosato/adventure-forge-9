import assert from "node:assert/strict";
import test from "node:test";
import { observe, replay, restore, save, start, stateHash, type GameState } from "../src/engine/index.js";
import { step, walk } from "./reedway-witnesses.js";

const FERRY_PREFIX = [
  "choose-canalwright",
  "visit-clinic",
  "make-clinic-promise",
  "refuse-council-control",
  "use-canalwright-kit",
  "follow-canal",
  "read-stolen-order",
  "repair-and-share-water",
  "release-shared-water",
  "bring-shared-water-to-clinic",
  "close-clinic-and-open-archive",
  "explore-reedway-before-archive",
  "visit-reedway-barge",
  "buy-reedway-regulator",
  "visit-reedway-workers",
  "install-reedway-regulator-at-workers",
  "leave-reedway-workers",
] as const;

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

test("the upper-bank warning offers two viable routes from one inherited state", () => {
  const base = walk(FERRY_PREFIX, start(811));
  assert.equal(base.scene, "reedway-commons");
  assert.equal(base.flags["reedway-ferry-powered"], true);
  assert.equal(base.flags["reedway-salvager-hostile"], false);
  assert.equal(base.resources.supplies, 2);
  assertChoice(base, "visit-reedway-upper-watch");

  const watch = step(base, "visit-reedway-upper-watch");
  assert.equal(watch.scene, "reedway-upper-watch");
  assertChoice(watch, "post-reedway-warning-by-ferry");
  assertChoice(watch, "carry-reedway-warning-by-towpath");

  const ferry = step(watch, "post-reedway-warning-by-ferry");
  assert.equal(ferry.resources.supplies, 1);
  assert.equal(ferry.flags["reedway-warning-ferry"], true);
  assert.equal(ferry.resources.risk, base.resources.risk);
  assert.match(observe(ferry).text.join("\n"), /ferry horn carried the warning/i);
  assertChoice(ferry, "revisit-reedway-upper-watch-by-ferry");
  const ferryRevisit = step(ferry, "revisit-reedway-upper-watch-by-ferry");
  assert.equal(ferryRevisit.scene, "reedway-upper-watch");
  assert.match(observe(ferryRevisit).text.join("\n"), /ferry horn has already warned/i);
  assertReplay(ferryRevisit);

  const towpath = step(watch, "carry-reedway-warning-by-towpath");
  assert.equal(towpath.resources.supplies, base.resources.supplies);
  assert.ok(typeof base.resources.risk === "number");
  assert.equal(towpath.resources.risk, base.resources.risk + 1);
  assert.equal(towpath.flags["reedway-warning-towpath"], true);
  assert.match(observe(towpath).text.join("\n"), /carried the warning along Sera's quiet towpath/i);
  assertChoice(towpath, "revisit-reedway-upper-watch-by-towpath");
  const towpathRevisit = step(towpath, "revisit-reedway-upper-watch-by-towpath");
  assert.equal(towpathRevisit.scene, "reedway-upper-watch");
  assert.match(observe(towpathRevisit).text.join("\n"), /towpath warning reached/i);
  assertReplay(towpathRevisit);
});

test("the upper-bank watch can be left and revisited without mutating the inherited world", () => {
  const base = walk(FERRY_PREFIX, start(812));
  const watch = step(base, "visit-reedway-upper-watch");
  const left = step(watch, "leave-reedway-upper-watch");
  assert.equal(left.scene, "reedway-commons");
  assert.equal(left.resources.supplies, base.resources.supplies);
  assert.equal(left.resources.risk, base.resources.risk);
  assert.equal(left.flags["reedway-warning-ferry"], undefined);
  assert.equal(left.flags["reedway-warning-towpath"], undefined);
  assertChoice(left, "visit-reedway-upper-watch");
  assertReplay(left);
});
