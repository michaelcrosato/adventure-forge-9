import assert from "node:assert/strict";
import test from "node:test";
import { restore, save, observe, type GameState } from "../src/engine/index.js";
import {
  councilSealedCoercedResolved,
  evacuationPublicProtectedResolved,
  sharedLowResolved,
  step,
} from "./reedway-witnesses.js";

type ExpectedFixture = {
  name: string;
  state: GameState;
  terminalChoice: string;
  resources: Record<string, number>;
  flags: readonly string[];
  absentFlags: readonly string[];
};

function assertLegacyFixture(fixture: ExpectedFixture): void {
  const { state } = fixture;
  assert.equal(state.status, "playing", `${fixture.name} must remain live at resolved Blackglass Quay`);
  assert.equal(state.scene, "blackglass-quay");
  assert.equal(state.receipt, undefined, "the fixture must stop before returning or terminating");
  assert.deepEqual(state.resources, fixture.resources, `${fixture.name} inherited resources changed`);
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
  assert.deepEqual(returned.resources, fixture.resources, `${fixture.name} return changed inherited resources`);
  for (const flag of fixture.flags) assert.equal(returned.flags[flag], true, `${fixture.name} return lost old flag ${flag}`);

  const completed = step(returned, fixture.terminalChoice);
  assert.equal(completed.status, "completed");
  assert.equal(completed.scene, "lowsail-after-blackglass");
  assert.deepEqual(completed.resources, fixture.resources, `${fixture.name} completion changed inherited resources`);
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
