import assert from "node:assert/strict";
import test from "node:test";
import { choose, observe, start, type GameState } from "../src/engine/index.js";

function step(state: GameState, choiceId: string): GameState {
  const choice = observe(state).choices.find(candidate => candidate.id === choiceId);
  assert.ok(choice, `expected ${choiceId} at ${observe(state).title}`);
  return choose(state, choiceId, state.revision);
}

function walk(choiceIds: readonly string[], seed = 1): GameState {
  return choiceIds.reduce(step, start(seed));
}

function resourceSnapshot(state: GameState): Readonly<Record<string, number>> {
  return { ...state.resources };
}

const LEDGER_AND_PROTECTED_TESTIMONY = [
  "choose-field-medic",
  "find-nessa",
  "work-without-tools",
  "follow-canal",
  "read-stolen-order",
  "open-evacuation-route",
  "signal-evacuation",
  "organize-high-ground-evacuation",
  "treat-unmarked-stragglers-by-protocol-and-open-archive",
  "enter-lantern-hall",
  "file-bram-family-manifest",
  "speak-with-mara",
  "stabilize-mara-before-deposition",
] as const;

test("a hearing can be adjourned for missing seal evidence and still reach an anonymous verdict", () => {
  let state = walk(LEDGER_AND_PROTECTED_TESTIMONY, 41);
  assert.equal(state.scene, "archive-hall");
  assert.equal(state.resources["archive-evidence"], 2);
  assert.equal(state.flags["archive-ledger-evidence"], true);
  assert.equal(state.flags["archive-witness-testimony"], true);
  assert.equal(state.flags["archive-witness-protected"], true);
  assert.equal(state.flags["archive-seal-evidence"], undefined);

  const hall = observe(state);
  assert.match(hall.text.join(" "), /Removing Vask requires the night ledger, his counterseal, and either Mara's account or a canalwright's valve reconstruction/i);
  assert.ok(hall.choices.some(choice => choice.id === "call-lantern-hearing"));
  state = step(state, "call-lantern-hearing");

  const hearing = observe(state);
  assert.ok(hearing.choices.some(choice => choice.id === "adjourn-hearing-for-witness"));
  assert.ok(hearing.choices.some(choice => choice.id === "seal-mara-testimony"));

  const firstEvidence = state.resources["archive-evidence"];
  const firstResources = resourceSnapshot(state);
  state = step(state, "adjourn-hearing-for-witness");
  assert.equal(state.scene, "archive-hall");
  assert.equal(state.flags["archive-hearing-adjourned"], true);
  assert.equal(state.resources["archive-evidence"], firstEvidence);
  assert.deepEqual(state.resources, firstResources);

  state = step(state, "trace-seal-chain");
  assert.equal(state.scene, "seal-workroom");
  state = step(state, "compare-seal-impressions");
  assert.equal(state.scene, "archive-hall");
  assert.equal(state.flags["archive-seal-evidence"], true);
  assert.equal(state.resources["archive-evidence"], firstEvidence! + 1);

  state = step(state, "call-lantern-hearing");
  assert.equal(state.scene, "lantern-hearing");
  assert.match(
    observe(state).choices.find(choice => choice.id === "adjourn-hearing-for-witness")?.description ?? "",
    /Existing testimony and protection remain; adjourning costs no resources/i,
  );

  const repeatEvidence = state.resources["archive-evidence"];
  const repeatResources = resourceSnapshot(state);
  state = step(state, "adjourn-hearing-for-witness");
  assert.equal(state.scene, "archive-hall");
  assert.equal(state.resources["archive-evidence"], repeatEvidence);
  assert.deepEqual(state.resources, repeatResources);

  state = step(state, "call-lantern-hearing");
  assert.ok(observe(state).choices.some(choice => choice.id === "publish-vask-anonymously"));
  state = step(state, "publish-vask-anonymously");
  assert.equal(state.scene, "lowsail-reckoning");
  assert.equal(state.flags["archive-verdict-exposed"], true);
  assert.equal(state.flags["archive-witness-protected"], true);
  assert.equal(state.flags["archive-witness-exposed"], undefined);

  state = step(state, "close-archive-case");
  assert.equal(state.status, "completed");
  assert.equal(state.receipt?.kind, "completed");
  assert.deepEqual(observe(state).choices, []);
});
