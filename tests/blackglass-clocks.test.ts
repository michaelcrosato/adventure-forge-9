import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  InvalidStateError,
  SaveFormatError,
  choose,
  observe,
  replay,
  restore,
  save,
  start,
  stateHash,
  type GameState,
} from "../src/engine/index.js";

function walk(choiceIds: readonly string[], seed = 1): GameState {
  return choiceIds.reduce((state, choiceId) => choose(state, choiceId, state.revision), start(seed));
}

function step(state: GameState, choiceId: string): GameState {
  const choice = observe(state).choices.find(candidate => candidate.id === choiceId);
  assert.ok(choice, `expected choice ${choiceId} at ${observe(state).title}`);
  return choose(state, choiceId, state.revision);
}

function assertChoice(state: GameState, choiceId: string): void {
  assert.ok(observe(state).choices.some(choice => choice.id === choiceId), `expected ${choiceId} at ${observe(state).title}`);
}

function replayActions(state: GameState) {
  return state.history.map(action => ({ choiceId: action.choiceId, expectedRevision: action.fromRevision }));
}

const PROVISIONAL_ARCHIVE_PREFIX = [
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
  "return-to-night-ledger",
  "secure-jalen-amnesty",
  "trace-seal-chain",
  "compare-seal-impressions",
  "call-lantern-hearing",
  "negotiate-provisional-record",
] as const;

const SHARED_ARCHIVE_PREFIX = [
  "choose-canalwright",
  "find-nessa",
  "ask-clinic-before-leaving",
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
  "compare-seal-impressions",
  "call-lantern-hearing",
  "negotiate-provisional-record",
] as const;

function blackglassStart(seed = 1): GameState {
  return walk([...PROVISIONAL_ARCHIVE_PREFIX, "continue-to-blackglass"], seed);
}

function sharedBlackglassStart(seed = 1): GameState {
  return walk([...SHARED_ARCHIVE_PREFIX, "continue-to-blackglass"], seed);
}

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  throw new Error("unsupported test hash value");
}

function rehashState(state: GameState): string {
  const hashable = {
    version: state.version,
    buildId: state.buildId,
    seed: state.seed,
    revision: state.revision,
    scene: state.scene,
    resources: { ...state.resources },
    flags: { ...state.flags },
    knownFacts: [...state.knownFacts],
    history: state.history.map(action => ({
      choiceId: action.choiceId,
      fromRevision: action.fromRevision,
      toRevision: action.toRevision,
    })),
    status: state.status,
    ...(state.receipt === undefined ? {} : {
      receipt: {
        kind: state.receipt.kind,
        summary: state.receipt.summary,
        revision: state.receipt.revision,
      },
    }),
  };
  return createHash("sha256").update(stableStringify(hashable)).digest("hex");
}

test("the continuation performs the old Archive closure while preserving the old terminal choice", () => {
  const beforeContinuation = walk(PROVISIONAL_ARCHIVE_PREFIX, 5);
  assert.equal(beforeContinuation.scene, "lowsail-reckoning");
  assertChoice(beforeContinuation, "close-archive-case");
  assertChoice(beforeContinuation, "continue-to-blackglass");

  const oldClosure = step(beforeContinuation, "close-archive-case");
  assert.equal(oldClosure.status, "completed");
  assert.equal(oldClosure.scene, "lowsail-reckoning");
  assert.equal(oldClosure.flags["archive-returned"], true);
  assert.ok(oldClosure.knownFacts.includes("archive-case-closed"));

  const continuation = step(beforeContinuation, "continue-to-blackglass");
  assert.equal(continuation.status, "playing");
  assert.equal(continuation.scene, "blackglass-quay");
  assert.equal(continuation.flags["archive-returned"], true);
  assert.ok(continuation.knownFacts.includes("archive-case-closed"));
});

test("tide gates are inclusive at each authored <= boundary", () => {
  let state = sharedBlackglassStart(7);
  assert.equal(state.resources.tide, 0);
  state = step(state, "begin-blackglass-crossing");
  assertChoice(state, "take-shared-maintenance-line");

  state = step(state, "take-shared-maintenance-line");
  assert.equal(state.resources.tide, 1);
  assertChoice(state, "follow-shared-repair-marks");

  state = step(state, "follow-shared-repair-marks");
  assert.equal(state.resources.tide, 2);
  assertChoice(state, "set-pressure-before-next-surge");
});

test("repeated permitted navigation saturates tide and still reaches the scarred return", () => {
  let watchline = blackglassStart(11);
  watchline = step(watchline, "begin-blackglass-crossing");
  watchline = step(watchline, "cross-the-flooded-road");
  assert.equal(watchline.resources.tide, 1);
  watchline = step(watchline, "run-the-watchline");
  assert.equal(watchline.resources.tide, 2, "the delivered watchline advances tide by one");
  assert.equal(watchline.resources.risk, 4, "the delivered watchline also adds one risk");

  let state = blackglassStart(11);
  state = step(state, "begin-blackglass-crossing");
  state = step(state, "cross-the-flooded-road");
  assert.equal(state.resources.tide, 1);
  state = step(state, "wait-for-watch-to-turn");
  assert.equal(state.resources.tide, 3, "waiting advances tide by two and reaches the clock maximum");

  state = step(state, "open-emergency-bypass");
  assert.equal(state.resources.tide, 3, "the final advance saturates at the declared maximum");
  assert.equal(state.flags["blackglass-pressure-scarred"], true);
  state = step(state, "return-to-lowsail-from-blackglass");
  state = step(state, "close-blackglass-chapter-scarred");
  assert.equal(state.status, "completed");
  assert.ok(state.knownFacts.includes("blackglass-chapter-closed"));
});

test("a post-advance Blackglass checkpoint preserves save, restore, replay, and hash parity", () => {
  let checkpoint = blackglassStart(13);
  checkpoint = step(checkpoint, "begin-blackglass-crossing");
  checkpoint = step(checkpoint, "cross-the-flooded-road");
  assert.equal(checkpoint.scene, "council-watchpost");
  assert.equal(checkpoint.resources.tide, 1);

  const restored = restore(save(checkpoint));
  assert.deepEqual(restored, checkpoint);
  assert.equal(stateHash(restored), stateHash(checkpoint));
  assert.deepEqual(replay(13, replayActions(checkpoint)), checkpoint);
});

test("a rehashed external checkpoint cannot raise tide above its clock maximum", () => {
  let checkpoint = blackglassStart(17);
  checkpoint = step(checkpoint, "begin-blackglass-crossing");
  checkpoint = step(checkpoint, "cross-the-flooded-road");

  const external = JSON.parse(JSON.stringify(checkpoint)) as GameState;
  (external.resources as Record<string, number>).tide = 4;
  assert.throws(() => observe(external), InvalidStateError);

  const envelope = JSON.parse(save(checkpoint)) as {
    payload: GameState;
    hash: string;
  };
  (envelope.payload.resources as Record<string, number>).tide = 4;
  envelope.hash = rehashState(envelope.payload);
  assert.throws(() => restore(JSON.stringify(envelope)), SaveFormatError);
});
