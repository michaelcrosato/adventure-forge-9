import assert from "node:assert/strict";
import test from "node:test";
import {
  choose,
  observe,
  replay,
  restore,
  save,
  start,
  stateHash,
  type GameState,
} from "../src/engine/index.js";
import { RAW_SCENARIO } from "../src/content/scenario.js";

function step(state: GameState, choiceId: string): GameState {
  const choice = observe(state).choices.find(candidate => candidate.id === choiceId);
  assert.ok(choice, `expected choice ${choiceId} at ${observe(state).title}`);
  return choose(state, choiceId, state.revision);
}

function advance(state: GameState, choiceIds: readonly string[]): GameState {
  return choiceIds.reduce(step, state);
}

function walk(choiceIds: readonly string[], seed = 1): GameState {
  return advance(start(seed), choiceIds);
}

function choiceIds(state: GameState): string[] {
  return observe(state).choices.map(choice => choice.id);
}

function assertChoice(state: GameState, id: string): void {
  assert.ok(choiceIds(state).includes(id), `expected ${id} to be available at ${observe(state).title}`);
}

function assertNoChoice(state: GameState, id: string): void {
  assert.equal(choiceIds(state).includes(id), false, `did not expect ${id} at ${observe(state).title}`);
}

function replayActions(state: GameState) {
  return state.history.map(action => ({ choiceId: action.choiceId, expectedRevision: action.fromRevision }));
}

const OATHKEEPER_STRANDED_PREFIX = [
  "choose-oathkeeper",
  "hear-council",
  "bind-council-writ",
  "borrow-repair-tools",
  "follow-canal",
  "read-stolen-order",
  "honor-oathkeeper-writ",
  "release-council-water",
  "report-council-rationing",
  "sign-charter-and-open-archive",
  "enter-lantern-hall",
  "inspect-diversion-ledger",
  "leave-ledger-room",
  "speak-with-mara",
  "keep-mara-hidden",
] as const;

test("the oathkeeper can recover a stranded witness route and close a provisional case", () => {
  let state = walk(OATHKEEPER_STRANDED_PREFIX, 9);
  assert.equal(state.scene, "archive-hall");
  assert.equal(state.status, "playing");
  assertChoice(state, "return-to-night-ledger");

  const strandedRisk = state.resources.risk;
  const strandedEvidence = state.resources["archive-evidence"];
  state = step(state, "return-to-night-ledger");
  assert.equal(state.scene, "diversion-ledger-room");
  assert.equal(state.resources.risk, strandedRisk);
  assert.equal(state.resources["archive-evidence"], strandedEvidence);

  state = step(state, "leave-ledger-room");
  assert.equal(state.scene, "archive-hall");
  assert.equal(state.resources.risk, strandedRisk);
  assert.equal(state.resources["archive-evidence"], strandedEvidence);
  state = step(state, "return-to-night-ledger");
  assert.equal(state.resources.risk, strandedRisk);
  assert.equal(state.resources["archive-evidence"], strandedEvidence);

  const checkpoint = state;
  assert.deepEqual(observe(restore(save(checkpoint))), observe(checkpoint));
  assert.equal(stateHash(restore(save(checkpoint))), stateHash(checkpoint));
  assert.deepEqual(replay(9, replayActions(checkpoint)), checkpoint);

  state = advance(state, ["secure-jalen-amnesty"]);
  assert.equal(state.resources.risk, strandedRisk, "amnesty does not add a search risk");
  assert.equal(state.resources["archive-evidence"], strandedEvidence! + 1);
  assert.equal(state.flags["archive-ledger-evidence"], true);
  assert.equal(state.flags["archive-porter-amnesty"], true);

  state = advance(state, [
    "trace-seal-chain",
    "compare-seal-impressions",
    "call-lantern-hearing",
    "negotiate-provisional-record",
    "close-archive-case",
  ]);
  assert.equal(state.status, "completed");
  assert.equal(state.scene, "lowsail-reckoning");
  assert.equal(state.flags["archive-seal-evidence"], true);
  assert.equal(state.flags["archive-verdict-negotiated"], true);
  assert.equal(state.flags["archive-returned"], true);
  assert.equal(state.receipt?.kind, "completed");
  assert.match(state.receipt?.summary ?? "", /Lantern Archive|record/i);
  assert.deepEqual(observe(state).choices, []);
  assert.ok(observe(state).facts.some(fact => /provisional record/i.test(fact)));

  const finalSave = restore(save(state));
  assert.deepEqual(observe(finalSave), observe(state));
  assert.equal(stateHash(finalSave), stateHash(state));
  assert.deepEqual(replay(9, replayActions(state)), state);
});

const OWN_KIT_PREFIX = [
  "choose-canalwright",
  "find-nessa",
  "ask-clinic-before-leaving",
  "make-clinic-promise",
  "refuse-council-control",
  "use-canalwright-kit",
  "pay-scouts",
  "read-stolen-order",
] as const;

test("an own kit plus marked scouts supports shared repair without inventing Nessa debt", () => {
  const state = walk(OWN_KIT_PREFIX);
  const view = observe(state);
  const repair = view.choices.find(choice => choice.id === "repair-and-share-water");
  if (repair === undefined) throw new Error("repair-and-share-water should be available");
  assert.equal(state.resources.debt, 0);
  assert.equal(state.resources.supplies, 1);
  assert.equal(state.resources.tools, 1);
  assert.match(view.text.join(" "), /own canalwright kit/i);
  assert.doesNotMatch(view.text.join(" "), /scouts used your last supply/i);
  assert.match(repair.description, /your repair kit/i);
  assert.doesNotMatch(repair.description, /Nessa|debt/i);

  const repaired = step(state, "repair-and-share-water");
  assert.equal(repaired.flags["shared-water"], true);
  assert.equal(repaired.resources.supplies, 0);
  assert.equal(repaired.resources.medicine, 1);
  assert.equal(repaired.resources.tools, 0);
  assert.equal(repaired.resources.debt, 0);
});

test("an own kit evacuation carries generic repair facts and all eight families across", () => {
  const chamber = walk(OWN_KIT_PREFIX);
  const brace = observe(chamber).choices.find(choice => choice.id === "brace-evacuation-landing");
  if (brace === undefined) throw new Error("brace-evacuation-landing should be available");
  assert.match(brace.description, /repair kit/i);
  assert.doesNotMatch(brace.description, /Nessa|debt to/i);

  let state = advance(chamber, ["brace-evacuation-landing"]);
  assert.equal(state.resources.tools, 0);
  assert.equal(state.resources.debt, 0);
  assert.equal(state.flags["evacuation-plan"], true);
  assert.ok(observe(state).facts.some(fact => /repair kit became a brace/i.test(fact)));
  const kitFact = observe(state).facts.find(fact => /repair kit became a brace/i.test(fact));
  assert.ok(kitFact);
  assert.doesNotMatch(kitFact, /Nessa/i);

  state = advance(state, ["signal-evacuation", "organize-high-ground-evacuation", "lead-evacuation"]);
  assert.equal(state.status, "completed");
  assert.equal(state.resources.evacuees, 8);
  assert.equal(state.flags["evacuation-finished"], true);
});

function councilArchive(background?: "field-medic" | "oathkeeper"): GameState {
  const prefix = background === "field-medic"
    ? ["choose-field-medic"]
    : background === "oathkeeper"
      ? ["choose-oathkeeper"]
      : [];
  return walk([
    ...prefix,
    "hear-council",
    ...(background === "oathkeeper" ? ["bind-council-writ"] : []),
    ...(background === "oathkeeper" ? [] : ["take-council-seal"]),
    "borrow-repair-tools",
    "follow-canal",
    "read-stolen-order",
    ...(background === "oathkeeper" ? ["honor-oathkeeper-writ"] : ["give-red-sluice-to-council"]),
    "release-council-water",
    "report-council-rationing",
    "sign-charter-and-open-archive",
    "enter-lantern-hall",
  ]);
}

test("voluntary testimony, coerced summons, and background protection remain separate contracts", () => {
  const summonsDefinition = RAW_SCENARIO.choices.find(choice => choice.id === "use-council-debt-to-summon-mara");
  if (summonsDefinition === undefined) throw new Error("the council summons definition should exist");
  assert.deepEqual(summonsDefinition.when, [
    { type: "flag", flag: "council-control", value: true },
    { type: "flag", flag: "archive-witness-contacted", value: false },
  ]);
  const testimonyDefinition = RAW_SCENARIO.choices.find(choice => choice.id === "record-mara-testimony");
  if (testimonyDefinition === undefined) throw new Error("the voluntary testimony definition should exist");
  assert.deepEqual(testimonyDefinition.when, [
    { type: "flag", flag: "archive-witness-contacted", value: false },
    { type: "flag", flag: "council-control", value: false },
  ]);

  let voluntary = walk([
    "visit-clinic",
    "make-clinic-promise",
    "refuse-council-control",
    "borrow-repair-tools",
    "follow-canal",
    "read-stolen-order",
    "repair-and-share-water",
    "release-shared-water",
    "bring-shared-water-to-clinic",
    "close-clinic-and-open-archive",
    "enter-lantern-hall",
    "speak-with-mara",
  ]);
  assertChoice(voluntary, "record-mara-testimony");
  assertNoChoice(voluntary, "use-council-debt-to-summon-mara");
  const voluntaryDebt = voluntary.resources.debt;
  voluntary = step(voluntary, "record-mara-testimony");
  assert.equal(voluntary.resources.debt, voluntaryDebt);
  assert.equal(voluntary.resources["archive-evidence"], 1);
  assert.equal(voluntary.flags["archive-witness-testimony"], true);
  assert.equal(voluntary.flags["archive-witness-coerced"], undefined);
  assert.equal(voluntary.flags["archive-witness-protected"], undefined);

  const council = councilArchive();
  const councilHall = observe(council);
  assertChoice(council, "use-council-debt-to-summon-mara");
  assert.match(councilHall.text.join(" "), /another debt|unprotected/i);
  const councilDebt = council.resources.debt!;
  const coerced = step(council, "use-council-debt-to-summon-mara");
  assert.equal(coerced.resources.debt, councilDebt + 1);
  assert.equal(coerced.resources["archive-evidence"], 1);
  assert.equal(coerced.flags["archive-witness-contacted"], true);
  assert.equal(coerced.flags["archive-witness-testimony"], true);
  assert.equal(coerced.flags["archive-witness-coerced"], true);
  assert.equal(coerced.flags["archive-witness-protected"], undefined);
  assertNoChoice(coerced, "use-council-debt-to-summon-mara");
  assert.ok(observe(coerced).facts.some(fact => /summons forced Mara/i.test(fact)));

  for (const [background, protectedChoice] of [
    ["field-medic", "stabilize-mara-before-deposition"],
    ["oathkeeper", "swear-mara-safe-conduct"],
  ] as const) {
    const archive = councilArchive(background);
    const cellar = step(archive, "speak-with-mara");
    assertChoice(cellar, protectedChoice);
    assertNoChoice(cellar, "record-mara-testimony");
  }
});
