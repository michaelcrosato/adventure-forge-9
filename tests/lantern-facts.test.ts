import assert from "node:assert/strict";
import test from "node:test";
import { RAW_SCENARIO } from "../src/content/scenario.js";
import {
  choose,
  observe,
  start,
  type GameState,
} from "../src/engine/index.js";

function step(state: GameState, choiceId: string): GameState {
  const choice = observe(state).choices.find(candidate => candidate.id === choiceId);
  assert.ok(choice, `expected ${choiceId} at ${observe(state).title}`);
  return choose(state, choiceId, state.revision);
}

function walk(choiceIds: readonly string[], seed = 1): GameState {
  return choiceIds.reduce(step, start(seed));
}

const NON_COUNCIL_OATHKEEPER_TO_CELLAR = [
  "choose-oathkeeper",
  "find-nessa",
  "work-without-tools",
  "follow-canal",
  "read-stolen-order",
  "open-evacuation-route",
  "signal-evacuation",
  "organize-high-ground-evacuation",
  "lead-unmarked-and-open-archive",
  "enter-lantern-hall",
  "trace-seal-chain",
  "compare-seal-impressions",
  "speak-with-mara",
] as const;

const TECHNICAL_NO_WITNESS = [
  "choose-canalwright",
  "visit-clinic",
  "make-clinic-promise",
  "refuse-council-control",
  "use-canalwright-kit",
  "pay-scouts",
  "read-stolen-order",
  "repair-and-share-water",
  "release-shared-water",
  "bring-shared-water-to-clinic",
  "close-clinic-and-open-archive",
  "enter-lantern-hall",
  "read-nessa-maintenance-log",
  "trace-seal-chain",
  "reconstruct-seal-pressure",
  "call-lantern-hearing",
  "publish-technical-record",
] as const;

const PROVISIONAL_NO_WITNESS = [
  "find-nessa",
  "work-without-tools",
  "follow-canal",
  "read-stolen-order",
  "open-evacuation-route",
  "signal-evacuation",
  "organize-high-ground-evacuation",
  "lead-unmarked-and-open-archive",
  "enter-lantern-hall",
  "inspect-diversion-ledger",
  "secure-jalen-amnesty",
  "trace-seal-chain",
  "compare-seal-impressions",
  "call-lantern-hearing",
  "negotiate-provisional-record",
] as const;

const PROTECTED_TECHNICAL = [
  ...TECHNICAL_NO_WITNESS.slice(0, -2),
  "ask-nessa-to-vouch-for-mara",
  "call-lantern-hearing",
  "publish-technical-record",
] as const;

test("safe conduct has its own fact when an oathkeeper never takes council control", () => {
  const state = walk(NON_COUNCIL_OATHKEEPER_TO_CELLAR, 17);
  assert.equal(state.flags["council-control"], undefined);
  assert.equal(state.flags["oathkeeper-writ-bound"], undefined);

  const afterSafeConduct = step(state, "swear-mara-safe-conduct");
  assert.equal(afterSafeConduct.flags["archive-oath-witness"], true);
  assert.equal(afterSafeConduct.flags["oathkeeper-obligation"], true);
  assert.equal(afterSafeConduct.flags["archive-witness-protected"], true);

  const facts = observe(afterSafeConduct).facts;
  assert.ok(facts.includes("Your safe-conduct binds the Archive to protect Mara and her brother."));
  assert.equal(facts.includes("Your oath requires you to answer for the council's water order."), false);
  assert.equal(afterSafeConduct.knownFacts.includes("archive-safe-conduct-bound"), true);
  assert.equal(afterSafeConduct.knownFacts.includes("oathkeeper-vow-bound"), false);
});

test("leaving the Archive landing describes an opened case", () => {
  const departure = RAW_SCENARIO.choices.find(choice => choice.id === "leave-lantern-landing");
  assert.ok(departure);
  assert.match(departure.description, /leave the opened case/i);
  assert.match(departure.description, /investigation or hearing/i);
  assert.doesNotMatch(departure.description, /before the case is opened/i);
});

test("document-only technical and provisional records omit Mara without claiming personal protection", () => {
  for (const choiceIds of [TECHNICAL_NO_WITNESS, PROVISIONAL_NO_WITNESS]) {
    const state = walk(choiceIds, 23);
    assert.equal(state.status, "playing");
    assert.equal(state.scene, "lowsail-reckoning");
    assert.equal(state.flags["archive-witness-contacted"], undefined);
    assert.equal(state.flags["archive-witness-omitted"], true);
    assert.equal(state.flags["archive-witness-protected"], undefined);

    const facts = observe(state).facts;
    assert.ok(facts.includes("Mara's name is excluded from the Archive record; the documents carry the case."));
    assert.equal(facts.includes("The Archive sealed Mara Venn's identity behind protection."), false);
    assert.match(observe(state).text.join(" "), /Mara's name is excluded from the Archive record/);
    assert.doesNotMatch(observe(state).text.join(" "), /Sera seals the copyist's identity/);
  }
});

test("publishing a technical record preserves protection already granted to a witness", () => {
  const state = walk(PROTECTED_TECHNICAL, 29);
  assert.equal(state.status, "playing");
  assert.equal(state.scene, "lowsail-reckoning");
  assert.equal(state.flags["archive-witness-contacted"], true);
  assert.equal(state.flags["archive-witness-testimony"], true);
  assert.equal(state.flags["archive-witness-protected"], true);
  assert.equal(state.flags["archive-witness-omitted"], true);

  const facts = observe(state).facts;
  assert.ok(facts.includes("The Archive sealed Mara Venn's identity behind protection."));
  assert.ok(facts.includes("Mara's name is excluded from the Archive record; the documents carry the case."));
});
