import { choose, observe, start, type GameState } from "../src/engine/index.js";

/**
 * Existing chapter prefixes that end at the resolved Blackglass Quay before
 * the player returns to Lowsail. Keep these choices stable while Reedway is
 * added so its tests can compare against inherited outcomes.
 */
export const SHARED_LOW_ORIGIN = [
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

export const COUNCIL_ORIGIN = [
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

export const EVACUATION_ORIGIN = [
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

export function step(state: GameState, choiceId: string): GameState {
  const view = observe(state);
  if (!view.choices.some((choice) => choice.id === choiceId)) {
    throw new Error(`${choiceId} unavailable in ${view.sceneId}; legal choices: ${view.choices.map((choice) => choice.id).join(", ")}`);
  }
  return choose(state, choiceId, state.revision);
}

export function walk(choiceIds: readonly string[], initial: GameState = start(1)): GameState {
  return choiceIds.reduce(step, initial);
}

export function sharedLowResolved(): GameState {
  return walk([
    ...SHARED_LOW_ORIGIN,
    "begin-blackglass-crossing",
    "take-shared-maintenance-line",
    "follow-shared-repair-marks",
    "set-pressure-before-next-surge",
  ]);
}

export function councilSealedCoercedResolved(): GameState {
  return walk([
    ...COUNCIL_ORIGIN,
    "begin-blackglass-crossing",
    "take-coerced-worker-line",
    "repair-nessa-trust",
    "set-pressure-before-next-surge",
  ]);
}

export function evacuationPublicProtectedResolved(): GameState {
  return walk([
    ...EVACUATION_ORIGIN,
    "begin-blackglass-crossing",
    "take-family-rope-line",
    "ask-nessa-to-hold-rope",
    "let-nessa-balance-the-valve",
  ]);
}
