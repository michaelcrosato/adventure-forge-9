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
import {
  COUNCIL_ORIGIN,
  EVACUATION_ORIGIN,
  SHARED_LOW_ORIGIN,
  sharedLowResolved,
  step,
  walk,
} from "./reedway-witnesses.js";

function fromStart(choiceIds: readonly string[], seed = 1): GameState {
  return walk(choiceIds, start(seed));
}

function choiceIds(state: GameState): string[] {
  return observe(state).choices.map(choice => choice.id);
}

function assertChoice(state: GameState, choiceId: string): void {
  assert.ok(choiceIds(state).includes(choiceId), `expected ${choiceId} at ${state.scene}`);
}

function assertNoChoice(state: GameState, choiceId: string): void {
  assert.equal(choiceIds(state).includes(choiceId), false, `did not expect ${choiceId} at ${state.scene}`);
}

function replayActions(state: GameState) {
  return state.history.map(action => ({ choiceId: action.choiceId, expectedRevision: action.fromRevision }));
}

/** The fields that a free regional navigation action is allowed to leave alone. */
function worldProjection(state: GameState): Record<string, unknown> {
  return {
    resources: { ...state.resources },
    flags: { ...state.flags },
    knownFacts: [...state.knownFacts],
  };
}

function assertSaveReplayParity(state: GameState): void {
  const restored = restore(save(state));
  assert.deepEqual(restored, state);
  assert.equal(stateHash(restored), stateHash(state));
  assert.deepEqual(replay(state.seed, replayActions(state)), state);
}

const SHARED_LANDING_PREFIX = [
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
] as const;

const COUNCIL_LANDING_PREFIX = [
  "hear-council",
  "take-council-seal",
  "borrow-repair-tools",
  "follow-canal",
  "read-stolen-order",
  "give-red-sluice-to-council",
  "release-council-water",
  "report-council-rationing",
  "sign-charter-and-open-archive",
] as const;

const EVACUATION_LANDING_PREFIX = [
  "choose-field-medic",
  "find-nessa",
  "work-without-tools",
  "follow-canal",
  "read-stolen-order",
  "open-evacuation-route",
  "signal-evacuation",
  "organize-high-ground-evacuation",
  "treat-unmarked-stragglers-by-protocol-and-open-archive",
] as const;

const OATHKEEPER_LANDING_PREFIX = [
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
] as const;

const COUNCIL_CLINIC_LANDING_PREFIX = [
  "hear-council",
  "take-council-seal",
  "ask-clinic-before-leaving",
  "make-clinic-promise",
  "continue-with-council-seal",
  "borrow-repair-tools",
  "follow-canal",
  "read-stolen-order",
  "give-red-sluice-to-council",
  "release-council-water",
  "report-council-rationing",
  "sign-charter-and-open-archive",
] as const;

const SHARED_FERRY_LANDING_PREFIX = [
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
] as const;

const SHARED_ARCHIVE_AFTER_LANDING = [
  "enter-lantern-hall",
  "read-nessa-maintenance-log",
  "trace-seal-chain",
  "reconstruct-seal-pressure",
  "call-lantern-hearing",
  "publish-technical-record",
] as const;

const COUNCIL_ARCHIVE_AFTER_LANDING = [
  "enter-lantern-hall",
  "surrender-council-seal-for-ledger",
  "trace-seal-chain",
  "compare-seal-impressions",
  "use-council-debt-to-summon-mara",
  "call-lantern-hearing",
  "seal-mara-testimony",
] as const;

const EVACUATION_ARCHIVE_AFTER_LANDING = [
  "enter-lantern-hall",
  "file-bram-family-manifest",
  "trace-seal-chain",
  "compare-seal-impressions",
  "speak-with-mara",
  "stabilize-mara-before-deposition",
  "call-lantern-hearing",
  "publish-vask-anonymously",
] as const;

const LOCAL_ORDER_CASES = [
  {
    name: "canalwright shared water",
    landingPrefix: SHARED_LANDING_PREFIX,
    archiveAfterLanding: SHARED_ARCHIVE_AFTER_LANDING,
    archiveFirstPrefix: SHARED_LOW_ORIGIN.slice(0, -1),
    regionalActions: [
      "visit-reedway-barge",
      "fit-reedway-regulator-as-canalwright",
      "visit-reedway-clinic",
      "install-reedway-regulator-at-clinic",
      "leave-reedway-clinic",
    ],
    facilityFlag: "reedway-clinic-powered",
  },
  {
    name: "council rationing",
    landingPrefix: COUNCIL_LANDING_PREFIX,
    archiveAfterLanding: COUNCIL_ARCHIVE_AFTER_LANDING,
    archiveFirstPrefix: COUNCIL_ORIGIN.slice(0, -1),
    regionalActions: [
      "visit-reedway-barge",
      "buy-reedway-regulator",
      "visit-reedway-workers",
      "install-reedway-regulator-at-workers",
      "leave-reedway-workers",
    ],
    facilityFlag: "reedway-ferry-powered",
  },
  {
    name: "field-medic evacuation",
    landingPrefix: EVACUATION_LANDING_PREFIX,
    archiveAfterLanding: EVACUATION_ARCHIVE_AFTER_LANDING,
    archiveFirstPrefix: EVACUATION_ORIGIN.slice(0, -1),
    regionalActions: [
      "visit-reedway-barge",
      "buy-reedway-regulator",
      "visit-reedway-workers",
      "install-reedway-regulator-at-workers",
      "leave-reedway-workers",
    ],
    facilityFlag: "reedway-ferry-powered",
  },
] as const;

function assertNoUnresolvedHubReturns(state: GameState): void {
  assertNoChoice(state, "return-to-blackglass-from-reedway");
  assertNoChoice(state, "return-to-lowsail-from-reedway");
}

test("all three local origins support both Archive/Reedway quest orders", () => {
  for (const [index, route] of LOCAL_ORDER_CASES.entries()) {
    let reedwayFirst = fromStart(route.landingPrefix, 100 + index);
    assert.equal(reedwayFirst.scene, "lantern-landing", `${route.name} should open at the Archive landing`);

    reedwayFirst = walk([
      "explore-reedway-before-archive",
      "visit-reedway-barge",
      "leave-reedway-barge",
    ], reedwayFirst);
    assert.equal(reedwayFirst.scene, "reedway-commons");
    assertNoUnresolvedHubReturns(reedwayFirst);
    assertNoChoice(reedwayFirst, "begin-blackglass-crossing");
    reedwayFirst = walk(route.regionalActions, reedwayFirst);
    assert.equal(reedwayFirst.scene, "reedway-commons");
    assert.equal(reedwayFirst.flags[route.facilityFlag], true, `${route.name} should complete one regional allocation`);
    assert.equal(reedwayFirst.resources["reedway-regulator"], 0);
    assertNoUnresolvedHubReturns(reedwayFirst);
    assertChoice(reedwayFirst, "return-to-open-archive-from-reedway");
    reedwayFirst = step(reedwayFirst, "return-to-open-archive-from-reedway");
    assert.equal(reedwayFirst.scene, "lantern-landing");
    assertNoChoice(reedwayFirst, "begin-blackglass-crossing");

    reedwayFirst = walk(route.archiveAfterLanding, reedwayFirst);
    assert.equal(reedwayFirst.scene, "lowsail-reckoning", `${route.name} should reach the Archive reckoning`);
    assert.equal(reedwayFirst.flags["archive-verdict-recorded"], true);
    assert.equal(reedwayFirst.status, "playing");
    reedwayFirst = step(reedwayFirst, "continue-to-blackglass");
    assert.equal(reedwayFirst.scene, "blackglass-quay");
    assert.notEqual(reedwayFirst.flags["blackglass-resolved"], true);

    let archiveFirst = fromStart(route.archiveFirstPrefix, 200 + index);
    assert.equal(archiveFirst.scene, "lowsail-reckoning", `${route.name} should reach reckoning before Reedway`);
    assert.equal(archiveFirst.flags["archive-verdict-recorded"], true);
    archiveFirst = step(archiveFirst, "explore-reedway-before-blackglass");
    assert.equal(archiveFirst.scene, "reedway-commons");
    assertNoChoice(archiveFirst, "begin-blackglass-crossing");
    assertNoUnresolvedHubReturns(archiveFirst);
    archiveFirst = walk([
      "visit-reedway-barge",
      "leave-reedway-barge",
    ], archiveFirst);
    archiveFirst = walk(route.regionalActions, archiveFirst);
    assert.equal(archiveFirst.scene, "reedway-commons");
    assert.equal(archiveFirst.flags[route.facilityFlag], true, `${route.name} should allocate after the Archive`);
    assert.equal(archiveFirst.resources["reedway-regulator"], 0);
    assertNoUnresolvedHubReturns(archiveFirst);
    archiveFirst = step(archiveFirst, "return-to-archive-record-from-reedway");
    assert.equal(archiveFirst.scene, "lowsail-reckoning");
    assert.equal(archiveFirst.flags["archive-verdict-recorded"], true);
    assert.notEqual(archiveFirst.flags["archive-returned"], true);
    assert.notEqual(archiveFirst.flags["blackglass-resolved"], true);
    assertChoice(archiveFirst, "continue-to-blackglass");
    archiveFirst = step(archiveFirst, "continue-to-blackglass");
    assert.equal(archiveFirst.scene, "blackglass-quay");
    assert.notEqual(archiveFirst.flags["blackglass-resolved"], true);
  }
});

test("an open Archive can pause after evidence, visit Reedway, and resume exactly", () => {
  let state = fromStart(SHARED_LANDING_PREFIX, 311);
  state = step(state, "enter-lantern-hall");
  state = step(state, "read-nessa-maintenance-log");
  assert.equal(state.scene, "archive-hall");
  assert.equal(state.resources["archive-evidence"], 1);
  assert.equal(state.flags["archive-ledger-evidence"], true);
  const partial = worldProjection(state);
  const partialEvidence = state.resources["archive-evidence"];
  const partialFacts = [...state.knownFacts];

  state = step(state, "pause-archive-investigation");
  assert.equal(state.scene, "lantern-landing");
  state = step(state, "explore-reedway-before-archive");
  assert.equal(state.scene, "reedway-commons");
  assertNoChoice(state, "begin-blackglass-crossing");
  assert.deepEqual(worldProjection(state), partial, "free regional travel changed the open Archive case");
  state = step(state, "visit-reedway-barge");
  state = step(state, "fit-reedway-regulator-as-canalwright");
  assert.equal(state.scene, "reedway-commons");
  state = step(state, "visit-reedway-clinic");
  state = step(state, "install-reedway-regulator-at-clinic");
  assert.equal(state.scene, "reedway-clinic-annex");
  state = step(state, "leave-reedway-clinic");
  assert.equal(state.scene, "reedway-commons");
  assert.equal(state.flags["reedway-clinic-powered"], true);
  assert.equal(state.resources["reedway-regulator"], 0);
  assert.equal(state.resources.medicine, 2);
  state = step(state, "visit-reedway-barge");
  assertNoChoice(state, "fit-reedway-regulator-as-canalwright");
  assertNoChoice(state, "buy-reedway-regulator");
  assertNoChoice(state, "force-reedway-regulator");
  state = step(state, "leave-reedway-barge");
  state = step(state, "return-to-open-archive-from-reedway");
  state = step(state, "enter-lantern-hall");
  assert.equal(state.scene, "archive-hall");
  assert.equal(state.resources["archive-evidence"], partialEvidence);
  assert.equal(state.flags["archive-ledger-evidence"], true);
  for (const fact of partialFacts) assert.ok(state.knownFacts.includes(fact), `resume lost prior fact ${fact}`);
  assert.equal(state.flags["reedway-clinic-powered"], true);
  assert.equal(state.resources["reedway-regulator"], 0);
  assertNoChoice(state, "read-nessa-maintenance-log");
  assertSaveReplayParity(state);

  state = walk([
    "trace-seal-chain",
    "reconstruct-seal-pressure",
    "call-lantern-hearing",
    "publish-technical-record",
  ], state);
  assert.equal(state.flags["archive-verdict-recorded"], true);
  assert.equal(state.scene, "lowsail-reckoning");
});

const VERDICT_WITNESSES = [
  {
    name: "publish and name Mara",
    prefix: [
      ...SHARED_LANDING_PREFIX,
      "enter-lantern-hall",
      "speak-with-mara",
      "record-mara-testimony",
      "read-nessa-maintenance-log",
      "trace-seal-chain",
      "compare-seal-impressions",
      "call-lantern-hearing",
    ],
    choice: "publish-vask-and-name-mara",
  },
  {
    name: "publish anonymously",
    prefix: [...EVACUATION_LANDING_PREFIX, ...EVACUATION_ARCHIVE_AFTER_LANDING.slice(0, -1)],
    choice: "publish-vask-anonymously",
  },
  {
    name: "publish technical record",
    prefix: [...SHARED_LANDING_PREFIX, ...SHARED_ARCHIVE_AFTER_LANDING.slice(0, -1)],
    choice: "publish-technical-record",
  },
  {
    name: "compel Vask under oath",
    prefix: [
      ...OATHKEEPER_LANDING_PREFIX,
      "enter-lantern-hall",
      "inspect-diversion-ledger",
      "secure-jalen-amnesty",
      "trace-seal-chain",
      "compare-seal-impressions",
      "speak-with-mara",
      "swear-mara-safe-conduct",
      "call-lantern-hearing",
    ],
    choice: "compel-vask-under-oath",
  },
  {
    name: "seal Mara testimony",
    prefix: [...COUNCIL_LANDING_PREFIX, ...COUNCIL_ARCHIVE_AFTER_LANDING.slice(0, -1)],
    choice: "seal-mara-testimony",
  },
  {
    name: "negotiate provisional record",
    prefix: [
      ...OATHKEEPER_LANDING_PREFIX,
      "enter-lantern-hall",
      "inspect-diversion-ledger",
      "leave-ledger-room",
      "speak-with-mara",
      "keep-mara-hidden",
      "return-to-night-ledger",
      "secure-jalen-amnesty",
      "trace-seal-chain",
      "compare-seal-impressions",
      "call-lantern-hearing",
    ],
    choice: "negotiate-provisional-record",
  },
] as const;

test("each of the six verdicts records an irreversible Archive decision phase", () => {
  for (const [index, verdict] of VERDICT_WITNESSES.entries()) {
    let state = fromStart(verdict.prefix, 400 + index);
    assert.equal(state.scene, "lantern-hearing", `${verdict.name} witness should reach the hearing`);
    assert.notEqual(state.flags["archive-verdict-recorded"], true);
    state = step(state, verdict.choice);
    assert.equal(state.scene, "lowsail-reckoning", `${verdict.name} should return to the reckoning`);
    assert.equal(state.flags["archive-verdict-recorded"], true, `${verdict.name} did not latch the phase`);
    assert.equal(state.status, "playing");
    assertSaveReplayParity(state);

    const afterVerdict = worldProjection(state);
    state = step(state, "explore-reedway-before-blackglass");
    state = step(state, "return-to-archive-record-from-reedway");
    assert.equal(state.scene, "lowsail-reckoning");
    assert.deepEqual(worldProjection(state), afterVerdict, `${verdict.name} revisit changed the verdict`);
    assert.equal(state.flags["archive-verdict-recorded"], true);
    assertNoChoice(state, "return-to-lowsail-from-archive-record");
  }
});

test("a decided and carried record can be revisited without repeating closure or resetting Blackglass", () => {
  let state = sharedLowResolved();
  assert.equal(state.scene, "blackglass-quay");
  assert.equal(state.flags["archive-verdict-recorded"], true);
  assert.equal(state.flags["archive-returned"], true);
  assert.equal(state.flags["blackglass-resolved"], true);

  state = step(state, "explore-reedway-from-blackglass");
  assert.equal(state.scene, "reedway-commons");
  state = step(state, "return-to-archive-record-from-reedway");
  assert.equal(state.scene, "lowsail-reckoning");
  assertNoChoice(state, "close-archive-case");
  assertNoChoice(state, "continue-to-blackglass");
  assertNoChoice(state, "leave-lowsail-reckoning");
  assertChoice(state, "return-to-lowsail-from-archive-record");
  const recordProjection = worldProjection(state);
  state = step(state, "return-to-lowsail-from-archive-record");
  assert.equal(state.scene, "lowsail-after-blackglass");
  assert.deepEqual(worldProjection(state), recordProjection);
  assert.equal(state.resources.tide, 3);
  assert.equal(state.knownFacts.filter(fact => fact === "archive-case-closed").length, 1);
  assert.equal(state.status, "playing");

  const stableChoices = choiceIds(state);
  const stableProjection = worldProjection(state);
  for (let round = 0; round < 3; round += 1) {
    state = step(state, "explore-reedway-from-lowsail");
    assert.equal(state.scene, "reedway-commons");
    state = step(state, "return-to-lowsail-from-reedway");
    assert.equal(state.scene, "lowsail-after-blackglass");
    assert.deepEqual(worldProjection(state), stableProjection, `regional loop ${round + 1} changed carried history`);
    assert.deepEqual(choiceIds(state), stableChoices, `regional loop ${round + 1} changed legal returns`);
    assert.equal(state.resources.tide, 3);
  }
  assertSaveReplayParity(state);
});

test("the same council prefix sees cooperative credit and seized-regulator refusal", () => {
  const base = fromStart(COUNCIL_CLINIC_LANDING_PREFIX, 517);
  assert.equal(base.scene, "lantern-landing");
  assert.equal(base.resources.medicine, 2);

  const cooperative = walk([
    "explore-reedway-before-archive",
    "visit-reedway-barge",
    "trade-reedway-repair-kit",
    "return-to-open-archive-from-reedway",
    "enter-lantern-hall",
  ], base);
  assert.equal(cooperative.scene, "archive-hall");
  assertChoice(cooperative, "surrender-council-seal-for-ledger");
  const offeredDebt = cooperative.resources.debt!;
  const used = step(cooperative, "surrender-council-seal-for-ledger");
  assert.equal(used.resources.debt, offeredDebt - 1);
  assert.equal(used.flags["archive-ledger-evidence"], true);
  assertNoChoice(used, "surrender-council-seal-for-ledger");

  const seized = walk([
    "explore-reedway-before-archive",
    "visit-reedway-barge",
    "force-reedway-regulator",
    "return-to-open-archive-from-reedway",
    "enter-lantern-hall",
  ], base);
  assert.equal(seized.scene, "archive-hall");
  assert.equal(seized.flags["reedway-salvager-hostile"], true);
  assert.equal(seized.resources.debt, offeredDebt);
  assertNoChoice(seized, "surrender-council-seal-for-ledger");
  assertChoice(seized, "inspect-diversion-ledger");

  const publicCompletion = walk([
    "inspect-diversion-ledger",
    "secure-jalen-amnesty",
    "trace-seal-chain",
    "compare-seal-impressions",
    "call-lantern-hearing",
    "negotiate-provisional-record",
    "close-archive-case",
  ], seized);
  assert.equal(publicCompletion.status, "completed");
  assert.equal(publicCompletion.flags["archive-verdict-recorded"], true);
  assert.equal(publicCompletion.flags["archive-verdict-negotiated"], true);
});

test("Milo care after a seizure restores unused Archive credit, while used credit stays spent", () => {
  const base = fromStart(COUNCIL_CLINIC_LANDING_PREFIX, 619);
  let state = walk([
    "explore-reedway-before-archive",
    "visit-reedway-barge",
    "force-reedway-regulator",
    "visit-reedway-barge",
  ], base);
  assert.equal(state.scene, "reedway-salvage-barge");
  assert.equal(state.flags["reedway-salvager-hostile"], true);
  assertChoice(state, "treat-reedway-deckhand");
  const medicineBefore = state.resources.medicine!;
  state = step(state, "treat-reedway-deckhand");
  assert.equal(state.resources.medicine, medicineBefore - 1);
  assert.equal(state.flags["reedway-crew-treated"], true);
  assert.equal(state.flags["reedway-salvager-hostile"], false);
  state = step(state, "leave-reedway-barge");
  state = step(state, "return-to-open-archive-from-reedway");
  state = step(state, "enter-lantern-hall");
  assertChoice(state, "surrender-council-seal-for-ledger");
  const debtBeforeCredit = state.resources.debt!;
  state = step(state, "surrender-council-seal-for-ledger");
  assert.equal(state.resources.debt, debtBeforeCredit - 1);
  assert.equal(state.flags["archive-ledger-evidence"], true);

  state = step(state, "pause-archive-investigation");
  state = step(state, "explore-reedway-before-archive");
  state = step(state, "return-to-open-archive-from-reedway");
  state = step(state, "enter-lantern-hall");
  assertNoChoice(state, "surrender-council-seal-for-ledger");
  assert.equal(state.resources.debt, debtBeforeCredit - 1, "a used credit favor was revoked or charged twice");
  assert.equal(state.flags["reedway-salvager-hostile"], false);
});

test("a credit favor used before a later seizure remains closed after Milo care", () => {
  const base = fromStart(COUNCIL_CLINIC_LANDING_PREFIX, 661);
  let state = walk([
    "explore-reedway-before-archive",
    "return-to-open-archive-from-reedway",
    "enter-lantern-hall",
    "surrender-council-seal-for-ledger",
  ], base);
  const debtAfterCredit = state.resources.debt!;
  assert.equal(state.flags["archive-ledger-evidence"], true);
  assert.notEqual(state.flags["archive-returned"], true);

  state = step(state, "pause-archive-investigation");
  state = step(state, "explore-reedway-before-archive");
  state = step(state, "visit-reedway-barge");
  state = step(state, "force-reedway-regulator");
  assert.equal(state.flags["reedway-salvager-hostile"], true);
  state = step(state, "visit-reedway-barge");
  state = step(state, "treat-reedway-deckhand");
  assert.equal(state.flags["reedway-crew-treated"], true);
  assert.equal(state.flags["reedway-salvager-hostile"], false);
  state = step(state, "leave-reedway-barge");
  state = step(state, "return-to-open-archive-from-reedway");
  state = step(state, "enter-lantern-hall");

  assertNoChoice(state, "surrender-council-seal-for-ledger");
  assert.equal(state.resources.debt, debtAfterCredit, "later seizure or care changed the completed credit reduction");
  assert.equal(state.flags["archive-ledger-evidence"], true);
});

test("an early ferry allocation supplies a real later Blackglass brace", () => {
  const landing = fromStart(SHARED_FERRY_LANDING_PREFIX, 733);
  assert.equal(landing.scene, "lantern-landing");
  assert.equal(landing.resources.supplies, 1);
  const recovered = walk([
    "explore-reedway-before-archive",
    "visit-reedway-barge",
    "buy-reedway-regulator",
  ], landing);
  assert.equal(recovered.scene, "reedway-commons");
  assert.equal(recovered.resources.supplies, 0, "the common prefix must exhaust the supply before allocation");
  assert.equal(recovered.resources["reedway-regulator"], 1);

  const clinic = walk([
    "visit-reedway-clinic",
    "install-reedway-regulator-at-clinic",
    "leave-reedway-clinic",
  ], recovered);
  assert.equal(clinic.scene, "reedway-commons");
  assert.equal(clinic.resources.supplies, 0);
  assert.equal(clinic.flags["reedway-clinic-powered"], true);

  let clinicGallery = walk([
    "return-to-open-archive-from-reedway",
    "enter-lantern-hall",
    "read-nessa-maintenance-log",
    "trace-seal-chain",
    "reconstruct-seal-pressure",
    "call-lantern-hearing",
    "publish-technical-record",
    "continue-to-blackglass",
    "begin-blackglass-crossing",
    "take-shared-maintenance-line",
  ], clinic);
  assert.equal(clinicGallery.scene, "conduit-gallery");
  assert.equal(clinicGallery.resources.tide, 1);
  assert.equal(clinicGallery.resources.risk, 2);
  assert.equal(clinicGallery.resources.supplies, 0);
  assertNoChoice(clinicGallery, "brace-the-conduit-ledge");

  const ferry = walk([
    "visit-reedway-workers",
    "install-reedway-regulator-at-workers",
    "leave-reedway-workers",
  ], recovered);
  assert.equal(ferry.scene, "reedway-commons");
  assert.equal(ferry.flags["reedway-ferry-powered"], true);
  assert.equal(ferry.resources["reedway-regulator"], 0);
  assert.equal(ferry.resources.supplies, 2, "the ferry should return two usable supplies after the shared purchase");

  let ferryGallery = walk([
    "return-to-open-archive-from-reedway",
    "enter-lantern-hall",
    "read-nessa-maintenance-log",
    "trace-seal-chain",
    "reconstruct-seal-pressure",
    "call-lantern-hearing",
    "publish-technical-record",
    "continue-to-blackglass",
    "begin-blackglass-crossing",
    "take-shared-maintenance-line",
  ], ferry);
  assert.equal(ferryGallery.scene, "conduit-gallery");
  assert.equal(ferryGallery.resources.tide, 1);
  assert.equal(ferryGallery.resources.risk, 2);
  assert.equal(ferryGallery.resources.supplies, 2);
  assertChoice(ferryGallery, "brace-the-conduit-ledge");
  ferryGallery = step(ferryGallery, "brace-the-conduit-ledge");
  assert.equal(ferryGallery.resources.supplies, 1, "the later brace must spend the ferry's supplies");
  assert.equal(ferryGallery.resources.tide, 2);
  ferryGallery = step(ferryGallery, "set-pressure-before-next-surge");
  assert.equal(ferryGallery.flags["blackglass-resolved"], true);
  assert.equal(ferryGallery.resources.tide, 3);
  assert.equal(ferryGallery.resources.supplies, 1);
});
