import assert from "node:assert/strict";
import test from "node:test";
import { replay, restore, save, stateHash, observe, type GameState } from "../src/engine/index.js";
import {
  councilSealedCoercedResolved,
  evacuationPublicProtectedResolved,
  sharedLowResolved,
  step,
  walk,
} from "./reedway-witnesses.js";

type ExpectedFixture = {
  name: string;
  state: GameState;
  terminalChoice: string;
  resources: Record<string, number>;
  flags: readonly string[];
  absentFlags: readonly string[];
};

const LEGACY_RESOURCES = [
  "supplies",
  "medicine",
  "debt",
  "risk",
  "tools",
  "water",
  "evacuees",
  "archive-evidence",
  "tide",
] as const;

function legacyResources(state: GameState): Record<string, number> {
  return Object.fromEntries(LEGACY_RESOURCES.map((resource) => [resource, state.resources[resource]!])) as Record<string, number>;
}

function assertLegacyFixture(fixture: ExpectedFixture): void {
  const { state } = fixture;
  assert.equal(state.status, "playing", `${fixture.name} must remain live at resolved Blackglass Quay`);
  assert.equal(state.scene, "blackglass-quay");
  assert.equal(state.receipt, undefined, "the fixture must stop before returning or terminating");
  assert.deepEqual(legacyResources(state), fixture.resources, `${fixture.name} inherited resources changed`);
  for (const flag of fixture.flags) assert.equal(state.flags[flag], true, `${fixture.name} lost old flag ${flag}`);
  for (const flag of fixture.absentFlags) assert.equal(state.flags[flag], undefined, `${fixture.name} gained alternate flag ${flag}`);
  assert.ok(observe(state).choices.some((choice) => choice.id === "return-to-lowsail-from-blackglass"));

  // Save/restore is part of the fixture contract, so future Reedway tests can
  // begin from a real checkpoint without depending on mutable in-process state.
  const restored = restore(save(state));
  assert.deepEqual(restored, state, `${fixture.name} save/restore changed the inherited state`);

  const returned = step(restored, "return-to-lowsail-from-blackglass");
  assert.equal(returned.status, "playing");
  assert.equal(returned.scene, "lowsail-after-blackglass");
  assert.deepEqual(legacyResources(returned), fixture.resources, `${fixture.name} return changed inherited resources`);
  for (const flag of fixture.flags) assert.equal(returned.flags[flag], true, `${fixture.name} return lost old flag ${flag}`);

  const completed = step(returned, fixture.terminalChoice);
  assert.equal(completed.status, "completed");
  assert.equal(completed.scene, "lowsail-after-blackglass");
  assert.deepEqual(legacyResources(completed), fixture.resources, `${fixture.name} completion changed inherited resources`);
  for (const flag of fixture.flags) assert.equal(completed.flags[flag], true, `${fixture.name} completion lost old flag ${flag}`);
  assert.ok(completed.knownFacts.includes("blackglass-chapter-closed"));
  assert.match(completed.receipt?.summary ?? "", /pressure line steady/i);
}

test("shared-water canalwright public technical low-risk prefix remains a live resolved fixture", () => {
  assertLegacyFixture({
    name: "shared low",
    state: sharedLowResolved(),
    terminalChoice: "close-blackglass-chapter-clean",
    resources: {
      supplies: 0,
      medicine: 0,
      debt: 0,
      risk: 1,
      tools: 0,
      water: 2,
      evacuees: 0,
      "archive-evidence": 2,
      tide: 3,
    },
    flags: [
      "background-chosen", "background-canalwright", "expedition-started", "clinic-visit-made", "clinic-promise",
      "repair-tools", "own-repair-kit", "scouts-marked", "gate-read", "shared-water", "water-released", "clinic-aided",
      "archive-started", "archive-origin-clinic", "archive-ledger-evidence", "archive-seal-evidence", "archive-technical-proof",
      "archive-verdict-exposed", "archive-witness-omitted", "archive-returned", "blackglass-resolved",
    ],
    absentFlags: ["background-field-medic", "background-oathkeeper", "council-control", "archive-verdict-sealed", "archive-witness-protected"],
  });
});

test("council sealed/coerced prefix preserves its debt, control and protected-witness outcome", () => {
  assertLegacyFixture({
    name: "council sealed coerced",
    state: councilSealedCoercedResolved(),
    terminalChoice: "close-blackglass-chapter-clean",
    resources: {
      supplies: 0,
      medicine: 0,
      debt: 4,
      risk: 1,
      tools: 1,
      water: 1,
      evacuees: 0,
      "archive-evidence": 3,
      tide: 3,
    },
    flags: [
      "expedition-started", "council-seal", "repair-tools", "borrowed-repair-kit", "gate-read", "council-control",
      "water-released", "council-charter", "archive-started", "archive-origin-council", "archive-ledger-evidence",
      "archive-seal-evidence", "archive-witness-contacted", "archive-witness-testimony", "archive-witness-coerced",
      "archive-verdict-sealed", "archive-witness-protected", "archive-returned", "blackglass-nessa-aid", "blackglass-resolved",
    ],
    absentFlags: ["background-canalwright", "background-field-medic", "archive-verdict-exposed", "archive-witness-omitted"],
  });
});

test("field-medic public protected prefix preserves evacuation and aid outcomes", () => {
  assertLegacyFixture({
    name: "evacuation public protected",
    state: evacuationPublicProtectedResolved(),
    terminalChoice: "close-blackglass-chapter-watched",
    resources: {
      supplies: 1,
      medicine: 0,
      debt: 0,
      risk: 5,
      tools: 0,
      water: 0,
      evacuees: 8,
      "archive-evidence": 3,
      tide: 3,
    },
    flags: [
      "background-chosen", "background-field-medic", "expedition-started", "gate-read", "evacuation-plan", "water-released",
      "evacuation-finished", "field-medic-duty", "archive-started", "archive-origin-evacuation", "archive-ledger-evidence",
      "archive-evacuation-docket", "archive-seal-evidence", "archive-witness-contacted", "archive-witness-testimony",
      "archive-witness-protected", "archive-field-medic-witness", "archive-verdict-exposed", "archive-returned",
      "blackglass-nessa-aid", "blackglass-resolved",
    ],
    absentFlags: ["background-canalwright", "background-oathkeeper", "archive-verdict-sealed", "archive-witness-omitted", "council-control"],
  });
});

/** Compare the inherited campaign projection without enumerating new activity flags. */
function oldWorldProjection(state: GameState): Record<string, unknown> {
  return {
    resources: Object.fromEntries(LEGACY_RESOURCES.map((resource) => [resource, state.resources[resource]!])),
    flags: Object.fromEntries(Object.entries(state.flags).filter(([flag]) => !flag.startsWith("reedway-"))),
    facts: state.knownFacts.filter((fact) => !fact.startsWith("reedway-")),
  };
}

function oldStableOutcome(state: GameState): Record<string, unknown> {
  return {
    risk: state.resources.risk,
    tide: state.resources.tide,
    water: state.resources.water,
    evacuees: state.resources.evacuees,
    archiveEvidence: state.resources["archive-evidence"],
    flags: Object.fromEntries(Object.entries(state.flags).filter(([flag]) => !flag.startsWith("reedway-"))),
    facts: state.knownFacts.filter((fact) => !fact.startsWith("reedway-")),
  };
}

function assertChoice(state: GameState, choiceId: string): void {
  assert.ok(observe(state).choices.some((choice) => choice.id === choiceId), `expected ${choiceId} at ${state.scene}`);
}

function assertNoChoice(state: GameState, choiceId: string): void {
  assert.equal(observe(state).choices.some((choice) => choice.id === choiceId), false, `did not expect ${choiceId} at ${state.scene}`);
}

function enterReedway(state: GameState): GameState {
  if (state.scene === "reedway-commons") return state;
  if (state.scene === "blackglass-quay") return step(state, "explore-reedway-from-blackglass");
  if (state.scene === "lowsail-after-blackglass") return step(state, "explore-reedway-from-lowsail");
  throw new Error(`cannot enter Reedway from ${state.scene}`);
}

function toCommons(state: GameState): GameState {
  if (state.scene === "reedway-commons") return state;
  if (state.scene === "blackglass-quay" || state.scene === "lowsail-after-blackglass") return enterReedway(state);
  const leaveByScene: Record<string, string> = {
    "reedway-salvage-barge": "leave-reedway-barge",
    "reedway-clinic-annex": "leave-reedway-clinic",
    "reedway-worker-landing": "leave-reedway-workers",
  };
  const choiceId = leaveByScene[state.scene];
  if (choiceId === undefined) throw new Error(`cannot return ${state.scene} to Reedway commons`);
  return step(state, choiceId);
}

function visit(state: GameState, choiceId: "visit-reedway-barge" | "visit-reedway-clinic" | "visit-reedway-workers"): GameState {
  return step(toCommons(state), choiceId);
}

function install(state: GameState, visitChoice: "visit-reedway-clinic" | "visit-reedway-workers", installChoice: string): GameState {
  const site = visit(state, visitChoice);
  assertChoice(site, installChoice);
  return step(site, installChoice);
}

function travelAllSites(state: GameState): GameState {
  let current = enterReedway(state);
  const sites = [
    ["visit-reedway-barge", "leave-reedway-barge"],
    ["visit-reedway-clinic", "leave-reedway-clinic"],
    ["visit-reedway-workers", "leave-reedway-workers"],
  ] as const;
  for (let round = 0; round < 3; round += 1) {
    for (const [visitChoice, leaveChoice] of sites) {
      current = step(toCommons(current), visitChoice);
      current = step(current, leaveChoice);
    }
    if (round < 2) {
      current = step(current, "return-to-blackglass-from-reedway");
      current = step(current, "explore-reedway-from-blackglass");
    }
  }
  return current;
}

const COUNCIL_VOLUNTARY_ORIGIN = [
  "choose-field-medic",
  "hear-council",
  "take-council-seal",
  "borrow-repair-tools",
  "follow-canal",
  "read-stolen-order",
  "give-red-sluice-to-council",
  "release-council-water",
  "report-council-rationing",
  "sign-charter-and-open-archive",
  "enter-lantern-hall",
  "surrender-council-seal-for-ledger",
  "trace-seal-chain",
  "compare-seal-impressions",
  "speak-with-mara",
  "stabilize-mara-before-deposition",
  "call-lantern-hearing",
  "seal-mara-testimony",
  "continue-to-blackglass",
  "begin-blackglass-crossing",
  "take-council-catwalk",
  "run-the-watchline",
  "hold-valve-under-watch",
] as const;

test("free regional travel repeats from every inherited outcome and preserves a mid-activity checkpoint", () => {
  for (const [name, originFactory] of [
    ["shared", sharedLowResolved],
    ["council", councilSealedCoercedResolved],
    ["evacuation", evacuationPublicProtectedResolved],
  ] as const) {
    const origin = originFactory();
    const inherited = oldWorldProjection(origin);
    const travelled = travelAllSites(origin);
    assert.deepEqual(oldWorldProjection(travelled), inherited, `${name} regional travel changed the inherited outcome`);
    assert.equal(travelled.resources["reedway-regulator"], 0, `${name} travel created a regulator`);

    const mid = visit(travelled, "visit-reedway-barge");
    const restored = restore(save(mid));
    assert.deepEqual(observe(restored), observe(mid), `${name} save/restore changed the regional choices`);
    assert.equal(stateHash(restored), stateHash(mid));
    const replayed = replay(mid.seed, mid.history.map((record) => ({ choiceId: record.choiceId, expectedRevision: record.fromRevision })));
    assert.equal(stateHash(replayed), stateHash(mid), `${name} replay changed the regional checkpoint`);
  }
});

test("the same shared-water origin supports a lien or free hostile seizure, then only one facility", () => {
  const origin = sharedLowResolved();
  const barge = visit(origin, "visit-reedway-barge");
  const inherited = oldWorldProjection(origin);

  const lien = step(barge, "accept-reedway-work-lien");
  assert.equal(lien.resources.debt, origin.resources.debt! + 1);
  assert.equal(lien.resources["reedway-regulator"], 1);
  assert.notEqual(lien.flags["reedway-salvager-hostile"], true);
  assert.deepEqual(oldWorldProjection(lien), {
    ...inherited,
    resources: { ...(inherited.resources as Record<string, number>), debt: origin.resources.debt! + 1 },
  });

  const lienCheckpoint = restore(save(visit(lien, "visit-reedway-clinic")));
  const clinic = step(lienCheckpoint, "install-reedway-regulator-at-clinic");
  assert.equal(clinic.resources["reedway-regulator"], 0);
  assert.equal(clinic.resources.medicine, 2);
  assert.equal(clinic.flags["reedway-clinic-powered"], true);
  assertNoChoice(clinic, "install-reedway-regulator-at-clinic");
  assertNoChoice(visit(clinic, "visit-reedway-workers"), "install-reedway-regulator-at-workers");

  const ferry = install(restore(save(lien)), "visit-reedway-workers", "install-reedway-regulator-at-workers");
  assert.equal(ferry.resources["reedway-regulator"], 0);
  assert.equal(ferry.resources.supplies, 2);
  assert.equal(ferry.flags["reedway-ferry-powered"], true);
  assertNoChoice(ferry, "install-reedway-regulator-at-workers");
  assertNoChoice(visit(ferry, "visit-reedway-clinic"), "install-reedway-regulator-at-clinic");

  const relief = step(visit(ferry, "visit-reedway-workers"), "send-reedway-relief-with-sera");
  assert.equal(relief.resources.supplies, 1);
  assert.equal(relief.flags["reedway-relief-sent"], true);
  assertNoChoice(relief, "send-reedway-relief-with-sera");
  assert.deepEqual(oldStableOutcome(relief), oldStableOutcome(origin), "the cooperative activity changed the inherited outcome");

  const forced = step(barge, "force-reedway-regulator");
  assert.equal(forced.resources["reedway-regulator"], 1);
  assert.equal(forced.resources.debt, origin.resources.debt);
  assert.equal(forced.resources.risk, origin.resources.risk);
  assert.equal(forced.resources.tide, origin.resources.tide);
  assert.equal(forced.flags["reedway-salvager-hostile"], true);
  assert.deepEqual(oldWorldProjection(forced), inherited);
  const forcedFerry = install(forced, "visit-reedway-workers", "install-reedway-regulator-at-workers");
  const hostileWorkers = visit(forcedFerry, "visit-reedway-workers");
  assertNoChoice(hostileWorkers, "send-reedway-relief-with-sera");
  assertChoice(hostileWorkers, "commission-reedway-relief-with-porters");
});

test("each recovery route is single-use, charges only its declared resource, and retains old pressure outcomes", () => {
  const cases = [
    ["buy", evacuationPublicProtectedResolved(), "buy-reedway-regulator", "supplies", -1],
    ["lien", sharedLowResolved(), "accept-reedway-work-lien", "debt", 1],
    ["canalwright", sharedLowResolved(), "fit-reedway-regulator-as-canalwright", "water", -1],
    ["force", sharedLowResolved(), "force-reedway-regulator", undefined, 0],
    ["kit", councilSealedCoercedResolved(), "trade-reedway-repair-kit", "tools", -1],
  ] as const;
  for (const [name, origin, recoveryChoice, resource, delta] of cases) {
    const before = oldWorldProjection(origin);
    const beforeResource = resource === undefined ? undefined : origin.resources[resource];
    const recovered = step(visit(origin, "visit-reedway-barge"), recoveryChoice);
    assert.equal(recovered.resources["reedway-regulator"], 1, `${name} did not recover one regulator`);
    assert.equal(recovered.flags["reedway-regulator-recovered"], true);
    if (resource !== undefined) assert.equal(recovered.resources[resource], beforeResource! + delta, `${name} charged the wrong amount`);
    assert.equal(recovered.resources.risk, origin.resources.risk);
    assert.equal(recovered.resources.tide, origin.resources.tide);
    assert.deepEqual(oldWorldProjection(recovered), {
      ...before,
      resources: {
        ...(before.resources as Record<string, number>),
        ...(resource === undefined ? {} : { [resource]: beforeResource! + delta }),
      },
    }, `${name} changed an inherited outcome`);
    const bargeAgain = visit(recovered, "visit-reedway-barge");
    for (const repeat of [
      "buy-reedway-regulator",
      "accept-reedway-work-lien",
      "fit-reedway-regulator-as-canalwright",
      "force-reedway-regulator",
      "trade-reedway-repair-kit",
    ]) assertNoChoice(bargeAgain, repeat);
  }
});

test("the kit recovery works at inherited debt four, while credit boundaries remain visible at debts two, three and four", () => {
  const debtFourOrigin = councilSealedCoercedResolved();
  assert.equal(debtFourOrigin.resources.debt, 4);
  assert.equal(debtFourOrigin.resources.supplies, 0);
  assert.equal(debtFourOrigin.resources.tools, 1);
  const debtFourBarge = visit(debtFourOrigin, "visit-reedway-barge");
  assertNoChoice(debtFourBarge, "accept-reedway-work-lien");
  const kit = step(debtFourBarge, "trade-reedway-repair-kit");
  assert.equal(kit.resources.tools, 0);
  assert.equal(kit.resources.debt, 4, "kit recovery must not erase existing debt");
  assert.equal(kit.resources.risk, debtFourOrigin.resources.risk);
  assert.equal(kit.resources.tide, debtFourOrigin.resources.tide);
  assertNoChoice(visit(kit, "visit-reedway-barge"), "trade-reedway-repair-kit");
  const debtFourClinic = install(kit, "visit-reedway-clinic", "install-reedway-regulator-at-clinic");
  assertNoChoice(debtFourClinic, "order-reedway-clinic-treatment");
  assertNoChoice(visit(debtFourClinic, "visit-reedway-workers"), "commission-reedway-relief-with-sera");

  const debtThreeOrigin = walk(COUNCIL_VOLUNTARY_ORIGIN);
  assert.equal(debtThreeOrigin.resources.debt, 3);
  const debtThreeBarge = visit(debtThreeOrigin, "visit-reedway-barge");
  assertChoice(debtThreeBarge, "accept-reedway-work-lien");
  const debtFour = step(debtThreeBarge, "accept-reedway-work-lien");
  assert.equal(debtFour.resources.debt, 4);
  assertNoChoice(visit(debtFour, "visit-reedway-barge"), "accept-reedway-work-lien");

  const debtThreeCommission = install(
    step(visit(sharedLowResolved(), "visit-reedway-barge"), "accept-reedway-work-lien"),
    "visit-reedway-clinic",
    "install-reedway-regulator-at-clinic",
  );
  const debtThreeAfterTreatment = step(debtThreeCommission, "order-reedway-clinic-treatment");
  assert.equal(debtThreeAfterTreatment.resources.debt, 3);
  const debtThreeWorkers = visit(debtThreeAfterTreatment, "visit-reedway-workers");
  assertChoice(debtThreeWorkers, "commission-reedway-relief-with-sera");
  const debtFourAfterCommission = step(debtThreeWorkers, "commission-reedway-relief-with-sera");
  assert.equal(debtFourAfterCommission.resources.debt, 4);
  assertNoChoice(debtFourAfterCommission, "commission-reedway-relief-with-sera");

  const hostileDebtThree = install(
    step(visit(debtThreeOrigin, "visit-reedway-barge"), "force-reedway-regulator"),
    "visit-reedway-workers",
    "install-reedway-regulator-at-workers",
  );
  const hostileDebtThreeWorkers = visit(hostileDebtThree, "visit-reedway-workers");
  assert.equal(hostileDebtThree.resources.debt, 3);
  assertNoChoice(hostileDebtThreeWorkers, "commission-reedway-relief-with-porters");
  assertNoChoice(visit(hostileDebtThree, "visit-reedway-clinic"), "order-reedway-clinic-treatment");

  const hostileDebtTwo = install(
    step(visit(sharedLowResolved(), "visit-reedway-barge"), "force-reedway-regulator"),
    "visit-reedway-workers",
    "install-reedway-regulator-at-workers",
  );
  const portersAtZero = visit(hostileDebtTwo, "visit-reedway-workers");
  const debtTwoAfterPorters = step(portersAtZero, "commission-reedway-relief-with-porters");
  assert.equal(debtTwoAfterPorters.resources.debt, 2);
  const debtTwoClinic = visit(debtTwoAfterPorters, "visit-reedway-clinic");
  assertChoice(debtTwoClinic, "order-reedway-clinic-treatment");
  const debtFourAfterOrder = step(debtTwoClinic, "order-reedway-clinic-treatment");
  assert.equal(debtFourAfterOrder.resources.debt, 4);
  assertNoChoice(debtFourAfterOrder, "order-reedway-clinic-treatment");
});

test("clinic and worker rewards fund distinct one-time services, including a non-medic supply route", () => {
  const clinic = install(
    step(visit(sharedLowResolved(), "visit-reedway-barge"), "fit-reedway-regulator-as-canalwright"),
    "visit-reedway-clinic",
    "install-reedway-regulator-at-clinic",
  );
  const patients = step(visit(clinic, "visit-reedway-clinic"), "treat-reedway-patients-with-medicine");
  assert.equal(patients.resources.medicine, 1);
  assert.equal(patients.flags["reedway-patients-treated"], true);
  assertNoChoice(patients, "treat-reedway-patients-with-medicine");
  assertNoChoice(patients, "treat-reedway-patients-with-supplies");
  assertNoChoice(patients, "triage-reedway-patients-as-medic");
  assertNoChoice(patients, "order-reedway-clinic-treatment");

  const fieldMedicFerry = install(
    step(visit(evacuationPublicProtectedResolved(), "visit-reedway-barge"), "force-reedway-regulator"),
    "visit-reedway-workers",
    "install-reedway-regulator-at-workers",
  );
  assert.equal(fieldMedicFerry.resources.supplies, 3);
  const ferryCompleted = step(toCommons(fieldMedicFerry), "close-reedway-ferry-account");
  assert.equal(ferryCompleted.status, "completed");
  assert.match(ferryCompleted.receipt?.summary ?? "", /worker ferry hauling/i);

  const hauled = step(visit(fieldMedicFerry, "visit-reedway-workers"), "haul-reedway-relief-with-porters");
  assert.equal(hauled.resources.supplies, 1);
  assert.equal(hauled.flags["reedway-relief-sent"], true);
  assertNoChoice(hauled, "haul-reedway-relief-with-porters");

  const genericCare = visit(fieldMedicFerry, "visit-reedway-clinic");
  assertChoice(genericCare, "treat-reedway-patients-with-supplies");
  const caredBySupplies = step(genericCare, "treat-reedway-patients-with-supplies");
  assert.equal(caredBySupplies.resources.supplies, 1);
  assert.equal(caredBySupplies.flags["reedway-patients-treated"], true);
  assertNoChoice(caredBySupplies, "treat-reedway-patients-with-supplies");

  const medicClinic = install(
    step(visit(evacuationPublicProtectedResolved(), "visit-reedway-barge"), "force-reedway-regulator"),
    "visit-reedway-clinic",
    "install-reedway-regulator-at-clinic",
  );
  const triage = step(visit(medicClinic, "visit-reedway-clinic"), "triage-reedway-patients-as-medic");
  assert.equal(triage.resources.supplies, 0);
  assert.equal(triage.flags["reedway-patients-treated"], true);
});

test("deckhand medicine and medic treatment cost one unit, restore cooperation, and preserve seizure order", () => {
  const clinic = install(
    step(visit(sharedLowResolved(), "visit-reedway-barge"), "fit-reedway-regulator-as-canalwright"),
    "visit-reedway-clinic",
    "install-reedway-regulator-at-clinic",
  );
  const medicineBarge = visit(clinic, "visit-reedway-barge");
  const medicTreated = step(medicineBarge, "treat-reedway-deckhand");
  assert.equal(medicTreated.resources.medicine, 1);
  assert.equal(medicTreated.flags["reedway-crew-treated"], true);
  assertNoChoice(medicTreated, "treat-reedway-deckhand");
  assertNoChoice(medicTreated, "splint-reedway-deckhand-as-medic");

  const fieldOrigin = evacuationPublicProtectedResolved();
  const forceThenMedic = step(visit(fieldOrigin, "visit-reedway-barge"), "force-reedway-regulator");
  const restored = step(visit(forceThenMedic, "visit-reedway-barge"), "splint-reedway-deckhand-as-medic");
  assert.equal(restored.resources.supplies, 0);
  assert.equal(restored.flags["reedway-crew-treated"], true);
  assert.equal(restored.flags["reedway-salvager-hostile"], false);
  assert.ok(restored.knownFacts.includes("reedway-regulator-forced"));
  assertChoice(visit(restored, "visit-reedway-workers"), "commission-reedway-relief-with-sera");

  const treatedThenSeized = step(
    step(visit(fieldOrigin, "visit-reedway-barge"), "splint-reedway-deckhand-as-medic"),
    "force-reedway-regulator",
  );
  assert.equal(treatedThenSeized.resources.supplies, 0);
  assert.equal(treatedThenSeized.flags["reedway-crew-treated"], true);
  assert.equal(treatedThenSeized.flags["reedway-salvager-hostile"], true);
  assert.ok(treatedThenSeized.knownFacts.includes("reedway-regulator-forced"));
  const reopened = visit(treatedThenSeized, "visit-reedway-barge");
  assert.match(observe(reopened).text.join(" "), /treated before|later seizure|refusal/i);
  const reopenedWorkers = visit(treatedThenSeized, "visit-reedway-workers");
  assertNoChoice(reopenedWorkers, "send-reedway-relief-with-sera");
  assertNoChoice(reopenedWorkers, "commission-reedway-relief-with-sera");
  assertChoice(reopenedWorkers, "commission-reedway-relief-with-porters");
});

test("zero supplies and zero water can still recover by lien and close an installed clinic account", () => {
  const origin = evacuationPublicProtectedResolved();
  const beforeRisk = origin.resources.risk;
  const beforeTide = origin.resources.tide;
  let state = visit(origin, "visit-reedway-barge");
  state = step(state, "splint-reedway-deckhand-as-medic");
  assert.equal(state.resources.supplies, 0);
  assert.equal(state.resources.water, 0);
  state = step(state, "accept-reedway-work-lien");
  assert.equal(state.resources.debt, origin.resources.debt! + 1);
  assert.equal(state.resources.risk, beforeRisk);
  assert.equal(state.resources.tide, beforeTide);
  state = install(state, "visit-reedway-clinic", "install-reedway-regulator-at-clinic");
  assert.equal(state.resources["reedway-regulator"], 0);
  assert.equal(state.resources.medicine, 2);
  state = toCommons(state);
  const completed = step(state, "close-reedway-clinic-account");
  assert.equal(completed.status, "completed");
  assert.equal(completed.resources.supplies, 0);
  assert.equal(completed.resources.water, 0);
  assert.equal(completed.resources.debt, origin.resources.debt! + 1);
  assert.equal(completed.resources.risk, beforeRisk);
  assert.equal(completed.resources.tide, beforeTide);
  assert.match(completed.receipt?.summary ?? "", /clinic annex sterilizer/i);
});
