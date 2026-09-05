import assert from "node:assert/strict";
import test from "node:test";
import { choose, observe, start, type GameState } from "../src/engine/index.js";

const SHARED_LOW_ORIGIN = [
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
  "continue-to-blackglass",
] as const;

const SHARED_RISK_TWO_BEFORE_HEARING = [
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
  "enter-lantern-hall",
  "read-nessa-maintenance-log",
  "trace-seal-chain",
  "reconstruct-seal-pressure",
] as const;

const COUNCIL_ORIGIN = [
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
  "use-council-debt-to-summon-mara",
  "call-lantern-hearing",
  "seal-mara-testimony",
  "continue-to-blackglass",
] as const;

const COUNCIL_ZERO_SUPPLY_ORIGIN = [
  "hear-council",
  "take-council-seal",
  "borrow-repair-tools",
  "pay-scouts",
  "read-stolen-order",
  "give-red-sluice-to-council",
  "release-council-water",
  "report-council-rationing",
  "sign-charter-and-open-archive",
  "enter-lantern-hall",
  "surrender-council-seal-for-ledger",
  "trace-seal-chain",
  "compare-seal-impressions",
  "use-council-debt-to-summon-mara",
  "call-lantern-hearing",
  "seal-mara-testimony",
  "continue-to-blackglass",
] as const;

const EVACUATION_ORIGIN = [
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
  "continue-to-blackglass",
] as const;

function step(state: GameState, choiceId: string): GameState {
  const view = observe(state);
  assert.ok(
    view.choices.some((choice) => choice.id === choiceId),
    `${choiceId} unavailable in ${view.sceneId}; legal choices: ${view.choices.map((choice) => choice.id).join(", ")}`,
  );
  return choose(state, choiceId, state.revision);
}

function walk(choiceIds: readonly string[], initial: GameState = start(1)): GameState {
  return choiceIds.reduce(step, initial);
}

function assertChoice(state: GameState, choiceId: string): void {
  assert.ok(observe(state).choices.some((choice) => choice.id === choiceId), `expected ${choiceId} at ${state.scene}`);
}

function assertNoChoice(state: GameState, choiceId: string): void {
  assert.equal(observe(state).choices.some((choice) => choice.id === choiceId), false, `did not expect ${choiceId} at ${state.scene}`);
}

function sharedOrigin(verdict: "public" | "provisional" | "sealed"): GameState {
  const verdictActions = verdict === "public"
    ? ["call-lantern-hearing", "publish-technical-record"]
    : verdict === "provisional"
      ? ["call-lantern-hearing", "negotiate-provisional-record"]
      : ["speak-with-mara", "record-mara-testimony", "call-lantern-hearing", "seal-mara-testimony"];
  return walk([...SHARED_RISK_TWO_BEFORE_HEARING, ...verdictActions, "continue-to-blackglass"]);
}

function finishBlackglass(state: GameState, choiceId: string): GameState {
  return walk(["return-to-lowsail-from-blackglass", choiceId], state);
}

test("shared low-risk maintenance reaches a clean completed return", () => {
  const origin = walk(SHARED_LOW_ORIGIN);
  assert.equal(origin.resources.risk, 1);
  assert.equal(origin.resources.tide, 0);

  const state = finishBlackglass(
    walk([
      "begin-blackglass-crossing",
      "take-shared-maintenance-line",
      "follow-shared-repair-marks",
      "set-pressure-before-next-surge",
    ], origin),
    "close-blackglass-chapter-clean",
  );

  assert.equal(state.status, "completed");
  assert.equal(state.resources.risk, 1);
  assert.equal(state.resources.tide, 3);
  assert.equal(state.flags["blackglass-pressure-scarred"], undefined);
  assert.ok(state.knownFacts.includes("blackglass-pressure-stabilized"));
  assert.match(state.receipt?.summary ?? "", /pressure line steady/i);
});

test("public, provisional, and sealed Archive covers share Risk 2 but change the crossing result", () => {
  const publicOrigin = sharedOrigin("public");
  const provisionalOrigin = sharedOrigin("provisional");
  const sealedOrigin = sharedOrigin("sealed");
  for (const origin of [publicOrigin, provisionalOrigin, sealedOrigin]) {
    assert.equal(origin.resources.risk, 2);
    assert.equal(origin.resources.tide, 0);
    assert.equal(origin.flags["shared-water"], true);
  }

  const publicPressure = walk([
    "begin-blackglass-crossing",
    "take-shared-maintenance-line",
    "move-before-lantern-patrol",
  ], publicOrigin);
  assert.equal(publicPressure.resources.risk, 3, "the public route should add one attention mark");
  assert.equal(publicPressure.resources.tide, 2);
  assertChoice(publicPressure, "hold-valve-under-watch");
  assertNoChoice(publicPressure, "set-pressure-before-next-surge");
  const publicResult = finishBlackglass(step(publicPressure, "hold-valve-under-watch"), "close-blackglass-chapter-scarred");
  assert.equal(publicResult.flags["blackglass-pressure-scarred"], true);

  const provisionalPressure = walk([
    "begin-blackglass-crossing",
    "take-shared-maintenance-line",
    "use-provisional-archive-cover",
  ], provisionalOrigin);
  assert.equal(provisionalPressure.resources.risk, 2);
  assert.equal(provisionalPressure.resources.tide, 2);
  assertChoice(provisionalPressure, "set-pressure-before-next-surge");
  const provisionalResult = finishBlackglass(step(provisionalPressure, "set-pressure-before-next-surge"), "close-blackglass-chapter-clean");
  assert.equal(provisionalResult.flags["blackglass-pressure-scarred"], undefined);

  const sealedPressure = walk([
    "begin-blackglass-crossing",
    "take-shared-maintenance-line",
    "use-sealed-archive-cover",
  ], sealedOrigin);
  assert.equal(sealedPressure.resources.risk, 2);
  assert.equal(sealedPressure.resources.tide, 2);
  assertChoice(sealedPressure, "set-pressure-before-next-surge");
  const sealedResult = finishBlackglass(step(sealedPressure, "set-pressure-before-next-surge"), "close-blackglass-chapter-clean");
  assert.equal(sealedResult.flags["blackglass-pressure-scarred"], undefined);
});

test("council watch favors have an explicit debt cost, while running preserves unused favor", () => {
  const origin = walk(COUNCIL_ORIGIN);
  assert.equal(origin.resources.debt, 4);
  const watch = walk(["begin-blackglass-crossing", "take-council-catwalk"], origin);
  assert.equal(watch.resources.tide, 1);
  assert.equal(watch.resources.risk, 1);

  const shown = step(watch, "show-council-seal-at-watch");
  assert.equal(shown.resources.debt, 5);
  assert.equal(shown.flags["blackglass-council-favor"], true);
  assert.equal(shown.resources.tide, 2);
  const shownReturn = finishBlackglass(step(shown, "set-pressure-before-next-surge"), "close-blackglass-chapter-clean");
  assert.match(observe(shownReturn).text.join(" "), /records the council favor you called in/i);

  const run = step(watch, "run-the-watchline");
  assert.equal(run.resources.debt, 4);
  assert.equal(run.flags["blackglass-council-favor"], undefined);
  assert.equal(run.resources.tide, 2);
  assert.equal(run.resources.risk, 2);
  assertChoice(run, "set-pressure-before-next-surge");
  const runReturn = finishBlackglass(step(run, "set-pressure-before-next-surge"), "close-blackglass-chapter-clean");
  const runText = observe(runReturn).text.join(" ");
  assert.match(runText, /left Varo's favor unused/i);
  assert.doesNotMatch(runText, /records the council favor you called in/i);
});

test("waiting at the council watch reaches the emergency window while running remains cleanly resolvable", () => {
  const origin = walk(COUNCIL_ORIGIN);
  const watch = walk(["begin-blackglass-crossing", "take-council-catwalk"], origin);
  const waiting = step(watch, "wait-for-watch-to-turn");
  assert.equal(waiting.resources.tide, 3);
  assert.equal(waiting.resources.risk, 1);
  assertNoChoice(waiting, "set-pressure-before-next-surge");
  assertNoChoice(waiting, "hold-valve-under-watch");
  assertChoice(waiting, "open-emergency-bypass");

  const running = step(watch, "run-the-watchline");
  assert.equal(running.resources.tide, 2);
  assert.equal(running.resources.risk, 2);
  assertChoice(running, "set-pressure-before-next-surge");
  assertNoChoice(running, "open-emergency-bypass");
});

test("coerced council barracks refuse free aid, while paid trust repair costs one supply", () => {
  const barracks = walk(["begin-blackglass-crossing", "take-coerced-worker-line"], walk(COUNCIL_ORIGIN));
  assertNoChoice(barracks, "ask-nessa-to-hold-rope");
  assertChoice(barracks, "repair-nessa-trust");

  const repaired = step(barracks, "repair-nessa-trust");
  assert.equal(repaired.resources.supplies, 0);
  assert.equal(repaired.resources.tide, 2);
  assert.equal(repaired.flags["blackglass-nessa-aid"], true);
  assert.equal(repaired.flags["archive-witness-coerced"], true);
  const result = finishBlackglass(step(repaired, "set-pressure-before-next-surge"), "close-blackglass-chapter-clean");
  assert.equal(result.status, "completed");
  assert.ok(result.knownFacts.includes("blackglass-aid-restored"));
});

test("zero supplies blocks coerced trust repair but still permits an emergency completion", () => {
  const barracks = walk(
    ["begin-blackglass-crossing", "take-coerced-worker-line"],
    walk(COUNCIL_ZERO_SUPPLY_ORIGIN),
  );
  assert.equal(barracks.resources.supplies, 0);
  assertNoChoice(barracks, "repair-nessa-trust");
  assertChoice(barracks, "take-workers-through-flood");

  const pressure = step(barracks, "take-workers-through-flood");
  assert.equal(pressure.resources.tide, 3);
  assert.equal(pressure.resources.supplies, 0);
  assertChoice(pressure, "open-emergency-bypass");
  const result = finishBlackglass(step(pressure, "open-emergency-bypass"), "close-blackglass-chapter-scarred");
  assert.equal(result.status, "completed");
  assert.equal(result.resources.supplies, 0);
  assert.equal(result.flags["blackglass-pressure-scarred"], true);
});

test("Nessa's aid stabilizes a Risk 5 evacuation route; unaided and late repairs remain scarred", () => {
  const origin = walk(EVACUATION_ORIGIN);
  assert.equal(origin.resources.risk, 5);

  const aided = walk(["begin-blackglass-crossing", "take-family-rope-line", "ask-nessa-to-hold-rope"], origin);
  assert.equal(aided.resources.risk, 5);
  assert.equal(aided.resources.tide, 2);
  const aidedResult = finishBlackglass(step(aided, "let-nessa-balance-the-valve"), "close-blackglass-chapter-watched");
  assert.equal(aidedResult.flags["blackglass-pressure-scarred"], undefined);
  assert.equal(aidedResult.resources.risk, 5);
  assert.match(observe(aidedResult).text.join(" "), /watch will remember the attention/i);

  const unaided = walk(["begin-blackglass-crossing", "take-family-rope-line", "lead-workers-before-surge"], origin);
  assert.equal(unaided.resources.tide, 2);
  const unaidedResult = finishBlackglass(step(unaided, "hold-valve-under-watch"), "close-blackglass-chapter-scarred");
  assert.equal(unaidedResult.resources.risk, 5);
  assert.equal(unaidedResult.flags["blackglass-pressure-scarred"], true);

  const lateBeforeAid = walk([
    "begin-blackglass-crossing",
    "take-family-rope-line",
    "return-to-reedway-from-barracks",
    "take-family-rope-line",
  ], origin);
  assert.equal(lateBeforeAid.resources.tide, 2);
  const latePressure = step(lateBeforeAid, "ask-nessa-to-hold-rope");
  assert.equal(latePressure.resources.tide, 3);
  assert.equal(latePressure.resources.risk, 5);
  const riskBeforeEmergency = latePressure.resources.risk;
  const lateResult = finishBlackglass(step(latePressure, "let-nessa-hold-emergency-valve"), "close-blackglass-chapter-scarred");
  assert.equal(lateResult.resources.risk, riskBeforeEmergency);
  assert.equal(lateResult.flags["blackglass-nessa-aid"], true);
  assert.equal(lateResult.flags["blackglass-pressure-scarred"], true);
});
