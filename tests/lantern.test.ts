import assert from "node:assert/strict";
import test from "node:test";
import { choose, observe, start } from "../src/engine/index.js";

function walk(ids: readonly string[]) {
  return ids.reduce((state, choiceId) => choose(state, choiceId, state.revision), start(1));
}

test("background choices are optional, mutually exclusive, and visible", () => {
  const initial = observe(start());
  assert.deepEqual(
    initial.choices.filter(choice => choice.id.startsWith("choose-")).map(choice => choice.id),
    ["choose-canalwright", "choose-field-medic", "choose-oathkeeper"],
  );

  const canalwright = walk(["choose-canalwright"]);
  const view = observe(canalwright);
  assert.ok(view.facts.some(fact => /canalwright/i.test(fact)));
  assert.equal(view.choices.some(choice => choice.id === "choose-field-medic"), false);
  assert.equal(view.choices.some(choice => choice.id === "choose-oathkeeper"), false);
  assert.ok(view.choices.some(choice => choice.id === "visit-clinic"));
});

test("the chamber distinguishes a borrowed depleted kit from a canalwright's own kit", () => {
  const ownKit = walk(["choose-canalwright", "find-nessa", "use-canalwright-kit", "pay-scouts", "read-stolen-order"]);
  const ownText = observe(ownKit).text.join(" ");
  assert.match(ownText, /own canalwright kit/i);
  assert.doesNotMatch(ownText, /scouts used your last supply/i);

  const borrowedKit = walk(["find-nessa", "borrow-repair-tools", "pay-scouts", "read-stolen-order"]);
  const borrowedText = observe(borrowedKit).text.join(" ");
  assert.match(borrowedText, /scouts used your last supply/i);
  assert.doesNotMatch(borrowedText, /own canalwright kit/i);
});

test("archive travel is opt in before each existing terminal witness", () => {
  const clinic = walk([
    "visit-clinic", "make-clinic-promise", "refuse-council-control", "borrow-repair-tools",
    "follow-canal", "read-stolen-order", "repair-and-share-water", "release-shared-water",
    "bring-shared-water-to-clinic",
  ]);
  assert.deepEqual(
    observe(clinic).choices.map(choice => choice.id),
    ["deliver-clinic-medicine", "close-clinic-and-open-archive", "leave-clinic-unfinished"],
  );

  const council = walk([
    "hear-council", "take-council-seal", "borrow-repair-tools", "follow-canal", "read-stolen-order",
    "give-red-sluice-to-council", "release-council-water", "report-council-rationing",
  ]);
  assert.ok(observe(council).choices.some(choice => choice.id === "sign-council-charter"));
  assert.ok(observe(council).choices.some(choice => choice.id === "sign-charter-and-open-archive"));

  const evacuation = walk([
    "find-nessa", "work-without-tools", "pay-scouts", "force-sluice-gate", "open-evacuation-route",
    "signal-evacuation", "organize-high-ground-evacuation",
  ]);
  assert.ok(observe(evacuation).choices.some(choice => choice.id === "lead-evacuation"));
  assert.ok(observe(evacuation).choices.some(choice => choice.id === "lead-evacuation-and-open-archive"));
});

test("canalwright shared repair carries technical proof into a completed Archive return", () => {
  const state = walk([
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
    "ask-nessa-to-vouch-for-mara",
    "call-lantern-hearing",
    "publish-technical-record",
    "close-archive-case",
  ]);

  assert.equal(state.status, "completed");
  assert.equal(state.flags["shared-water"], true);
  assert.equal(state.flags["archive-technical-proof"], true);
  assert.equal(state.flags["archive-verdict-exposed"], true);
  assert.equal(state.flags["archive-witness-protected"], true);
  assert.equal(state.resources.supplies, 0);
  assert.equal(state.resources.medicine, 0);
  assert.equal(state.resources.tools, 0);
  assert.match(observe(state).text.join(" "), /standing claim|notice certifies/i);
});

test("field medic protocol changes both the evacuation closure and the witness deposition", () => {
  const state = walk([
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
    "trace-seal-chain",
    "compare-seal-impressions",
    "speak-with-mara",
    "stabilize-mara-before-deposition",
    "call-lantern-hearing",
    "publish-vask-anonymously",
    "close-archive-case",
  ]);

  assert.equal(state.status, "completed");
  assert.equal(state.resources.evacuees, 8);
  assert.equal(state.resources.medicine, 0);
  assert.equal(state.flags["archive-field-medic-witness"], true);
  assert.equal(state.flags["archive-witness-protected"], true);
  assert.equal(state.flags["archive-verdict-exposed"], true);
  assert.ok(state.knownFacts.includes("field-medic-duty"));
});

test("oathkeeper debt and obligation alter council control and the hearing", () => {
  const state = walk([
    "choose-oathkeeper",
    "hear-council",
    "bind-council-writ",
    "work-without-tools",
    "follow-canal",
    "read-stolen-order",
    "honor-oathkeeper-writ",
    "release-council-water",
    "report-council-rationing",
    "sign-charter-and-open-archive",
    "enter-lantern-hall",
    "inspect-diversion-ledger",
    "secure-jalen-amnesty",
    "trace-seal-chain",
    "compare-seal-impressions",
    "speak-with-mara",
    "swear-mara-safe-conduct",
    "call-lantern-hearing",
    "compel-vask-under-oath",
    "close-archive-case",
  ]);

  assert.equal(state.status, "completed");
  assert.equal(state.flags["council-control"], true);
  assert.equal(state.flags["council-charter"], true);
  assert.equal(state.flags["oathkeeper-obligation"], false);
  assert.equal(state.flags["oathkeeper-vow-discharged"], true);
  assert.equal(state.resources.debt, 2, "the writ and final charter each remain as outstanding obligations");
  assert.ok(state.knownFacts.includes("oathkeeper-vow-discharged"));
});

test("the council outcome can redeem an actual carried seal for one ledger debt mark", () => {
  const state = walk([
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
  ]);

  assert.equal(state.scene, "archive-hall");
  assert.equal(state.flags["council-seal"], true, "the seal stays as the custody receipt");
  assert.equal(state.flags["archive-ledger-evidence"], true);
  assert.equal(state.resources.debt, 3, "the filing redeems one of the four accrued debt marks");
});

test("an adjourned hearing can return through the witness hub and still reach a negotiated verdict", () => {
  const state = walk([
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
    "inspect-diversion-ledger",
    "secure-jalen-amnesty",
    "trace-seal-chain",
    "compare-seal-impressions",
    "call-lantern-hearing",
    "adjourn-hearing-for-witness",
    "speak-with-mara",
    "keep-mara-hidden",
    "call-lantern-hearing",
    "negotiate-provisional-record",
    "close-archive-case",
  ]);

  assert.equal(state.status, "completed");
  assert.equal(state.flags["archive-hearing-adjourned"], true);
  assert.equal(state.flags["archive-verdict-negotiated"], true);
  assert.equal(state.flags["archive-witness-silent"], true);
  assert.equal(state.resources.risk, 2, "the one-time ledger search and canal route each add one risk");
});
