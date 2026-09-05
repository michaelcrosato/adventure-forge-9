import { createHash } from "node:crypto";
import { FACT_LABELS } from "../content/scenario.js";
import { BUILD_ID } from "./build-id.js";
import { SCENARIO, type Choice, type Condition, type Effect } from "./content.js";
import type {
  ActionRecord,
  ChoiceOption,
  GameState,
  GameStatus,
  JournalEntry,
  Observation,
  Receipt,
  ReplayAction,
} from "./types.js";

export type {
  ActionRecord,
  ChoiceOption,
  GameState,
  GameStatus,
  JournalEntry,
  Observation,
  Receipt,
  ReplayAction,
} from "./types.js";
export { BUILD_ID };

const END_ACTION_ID = "__end__";
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const FACT_LABELS_BY_ID: Readonly<Record<string, string>> = FACT_LABELS;
const KNOWN_RESOURCES = new Set(Object.keys(SCENARIO.initialResources));
const KNOWN_FLAGS = new Set<string>();
const KNOWN_FACTS = new Set(SCENARIO.initialFacts);
const SCENES = new Map(SCENARIO.scenes.map((scene) => [scene.id, scene]));
const CHOICES = new Map(SCENARIO.choices.map((choice) => [choice.id, choice]));
const CLOCKS = new Map((SCENARIO.clocks ?? []).map((clock) => [clock.id, clock] as const));
const CLOCK_RESOURCES = new Set((SCENARIO.clocks ?? []).map((clock) => clock.resource));
const ENGINE_PRODUCED_STATES = new WeakSet<object>();
const choicesByScene = new Map<string, Choice[]>();
for (const choice of SCENARIO.choices) {
  const sceneChoices = choicesByScene.get(choice.scene);
  if (sceneChoices === undefined) choicesByScene.set(choice.scene, [choice]);
  else sceneChoices.push(choice);
  for (const effect of choice.effects) {
    if (effect.type === "setFlag") KNOWN_FLAGS.add(effect.flag);
    if (effect.type === "addFact") KNOWN_FACTS.add(effect.fact);
  }
}
const CHOICES_BY_SCENE = new Map<string, readonly Choice[]>(
  [...choicesByScene.entries()].map(([scene, choices]) => [scene, Object.freeze(choices)] as const),
);

type RecordLike = Record<string, unknown>;

export class EngineError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }
}

export class StaleRevisionError extends EngineError {
  public constructor(expectedRevision: number, actualRevision: number) {
    super("STALE_REVISION", `expected revision ${expectedRevision}, current revision is ${actualRevision}`);
    this.name = "StaleRevisionError";
  }
}

export class IllegalChoiceError extends EngineError {
  public constructor(choiceId: string, message = "choice is not legal in the current state") {
    super("ILLEGAL_CHOICE", `${JSON.stringify(choiceId)}: ${message}`);
    this.name = "IllegalChoiceError";
  }
}

export class InvalidStateError extends EngineError {
  public constructor(message: string) {
    super("INVALID_STATE", message);
    this.name = "InvalidStateError";
  }
}

export class SaveFormatError extends EngineError {
  public constructor(message: string) {
    super("INVALID_SAVE", message);
    this.name = "SaveFormatError";
  }
}

export class ReplayError extends EngineError {
  public constructor(message: string) {
    super("INVALID_REPLAY", message);
    this.name = "ReplayError";
  }
}

function isRecord(value: unknown): value is RecordLike {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: RecordLike, allowed: readonly string[], path: string): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) throw new InvalidStateError(`${path}: unknown property ${JSON.stringify(key)}`);
  }
}

function required(value: RecordLike, key: string, path: string): unknown {
  if (!Object.hasOwn(value, key)) throw new InvalidStateError(`${path}: missing property ${JSON.stringify(key)}`);
  return value[key];
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function requireSafeInteger(value: unknown, path: string, minimum?: number): number {
  if (!isSafeInteger(value) || (minimum !== undefined && value < minimum)) {
    throw new InvalidStateError(`${path}: expected a safe integer${minimum === undefined ? "" : ` >= ${minimum}`}`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) throw new InvalidStateError(`${path}: expected a non-empty string`);
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new InvalidStateError(`${path}: expected a boolean`);
  return value;
}

function requireStatus(value: unknown, path: string): GameStatus {
  if (value !== "playing" && value !== "completed" && value !== "departed" && value !== "dead") {
    throw new InvalidStateError(`${path}: unknown game status`);
  }
  return value;
}

function requireHash(value: unknown, path: string): string {
  const result = requireString(value, path);
  if (!HASH_PATTERN.test(result)) throw new InvalidStateError(`${path}: expected a lowercase SHA-256 hash`);
  return result;
}

function cloneReceipt(receipt: Receipt | undefined): Receipt | undefined {
  return receipt === undefined ? undefined : { ...receipt };
}

function freezeState(state: GameState): GameState {
  const frozenReceipt = state.receipt === undefined ? undefined : Object.freeze({ ...state.receipt });
  const frozen: GameState = {
    version: 1,
    buildId: state.buildId,
    seed: state.seed,
    revision: state.revision,
    scene: state.scene,
    resources: Object.freeze({ ...state.resources }),
    flags: Object.freeze({ ...state.flags }),
    knownFacts: Object.freeze([...state.knownFacts]),
    history: Object.freeze(state.history.map((record) => Object.freeze({ ...record }))),
    status: state.status,
    ...(frozenReceipt === undefined ? {} : { receipt: frozenReceipt }),
  };
  const result = Object.freeze(frozen);
  // This identity cache is private and only receives freezeState's copied,
  // deeply frozen output. Parsed, copied, or caller-owned objects never enter it.
  ENGINE_PRODUCED_STATES.add(result);
  return result;
}

function cloneState(state: GameState): GameState {
  return freezeState({
    version: 1,
    buildId: state.buildId,
    seed: state.seed,
    revision: state.revision,
    scene: state.scene,
    resources: { ...state.resources },
    flags: { ...state.flags },
    knownFacts: [...state.knownFacts],
    history: state.history.map((record) => ({ ...record })),
    status: state.status,
    ...(state.receipt === undefined ? {} : { receipt: cloneReceipt(state.receipt) }),
  });
}

function stateForHash(state: GameState): RecordLike {
  return {
    version: state.version,
    buildId: state.buildId,
    seed: state.seed,
    revision: state.revision,
    scene: state.scene,
    resources: { ...state.resources },
    flags: { ...state.flags },
    knownFacts: [...state.knownFacts],
    history: state.history.map((record) => ({
      choiceId: record.choiceId,
      fromRevision: record.fromRevision,
      toRevision: record.toRevision,
    })),
    status: state.status,
    ...(state.receipt === undefined
      ? {}
      : {
          // The receipt's hash is derived from this object. Including it would
          // make the witness self-referential, so it is deliberately omitted.
          receipt: {
            kind: state.receipt.kind,
            summary: state.receipt.summary,
            revision: state.receipt.revision,
          },
        }),
  };
}

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new InvalidStateError("cannot hash a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  throw new InvalidStateError("cannot hash an unsupported value");
}

function calculateStateHash(state: GameState): string {
  return createHash("sha256").update(stableStringify(stateForHash(state))).digest("hex");
}

function requireResourceMap(value: unknown, path: string): Readonly<Record<string, number>> {
  if (!isRecord(value)) throw new InvalidStateError(`${path}: expected an object`);
  for (const key of KNOWN_RESOURCES) {
    if (!Object.hasOwn(value, key)) throw new InvalidStateError(`${path}: missing resource ${JSON.stringify(key)}`);
  }
  exactKeys(value, [...KNOWN_RESOURCES], path);
  const result: Record<string, number> = {};
  for (const [key, resourceValue] of Object.entries(value)) {
    result[key] = requireSafeInteger(resourceValue, `${path}.${key}`, 0);
  }
  for (const clock of CLOCKS.values()) {
    if (result[clock.resource]! > clock.max) {
      throw new InvalidStateError(
        `${path}.${clock.resource}: exceeds clock ${JSON.stringify(clock.id)} maximum ${clock.max}`,
      );
    }
  }
  return result;
}

function requireFlags(value: unknown, path: string): Readonly<Record<string, boolean>> {
  if (!isRecord(value)) throw new InvalidStateError(`${path}: expected an object`);
  const result: Record<string, boolean> = {};
  for (const [key, flagValue] of Object.entries(value)) {
    if (!KNOWN_FLAGS.has(key)) throw new InvalidStateError(`${path}: unknown flag ${JSON.stringify(key)}`);
    result[key] = requireBoolean(flagValue, `${path}.${key}`);
  }
  return result;
}

function requireFacts(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) throw new InvalidStateError(`${path}: expected an array`);
  const seen = new Set<string>();
  return value.map((fact, index) => {
    const result = requireString(fact, `${path}[${index}]`);
    if (!KNOWN_FACTS.has(result)) throw new InvalidStateError(`${path}[${index}]: unknown fact ${JSON.stringify(result)}`);
    if (seen.has(result)) throw new InvalidStateError(`${path}[${index}]: duplicate fact`);
    seen.add(result);
    return result;
  });
}

function requireHistory(value: unknown, path: string, revision: number): readonly ActionRecord[] {
  if (!Array.isArray(value)) throw new InvalidStateError(`${path}: expected an array`);
  if (value.length !== revision) throw new InvalidStateError(`${path}: length must equal revision`);
  return value.map((entry, index) => {
    if (!isRecord(entry)) throw new InvalidStateError(`${path}[${index}]: expected an object`);
    exactKeys(entry, ["choiceId", "fromRevision", "toRevision"], `${path}[${index}]`);
    const choiceId = requireString(required(entry, "choiceId", `${path}[${index}]`), `${path}[${index}].choiceId`);
    if (choiceId !== END_ACTION_ID && !CHOICES.has(choiceId)) {
      throw new InvalidStateError(`${path}[${index}]: unknown action ${JSON.stringify(choiceId)}`);
    }
    const fromRevision = requireSafeInteger(required(entry, "fromRevision", `${path}[${index}]`), `${path}[${index}].fromRevision`, 0);
    const toRevision = requireSafeInteger(required(entry, "toRevision", `${path}[${index}]`), `${path}[${index}].toRevision`, 1);
    if (fromRevision !== index || toRevision !== index + 1) {
      throw new InvalidStateError(`${path}[${index}]: revisions are not sequential`);
    }
    if (choiceId === END_ACTION_ID && index !== value.length - 1) {
      throw new InvalidStateError(`${path}[${index}]: end action must be last`);
    }
    return { choiceId, fromRevision, toRevision };
  });
}

function requireReceipt(value: unknown, path: string): Receipt {
  if (!isRecord(value)) throw new InvalidStateError(`${path}: expected an object`);
  exactKeys(value, ["kind", "summary", "revision", "stateHash"], path);
  const kind = requireStatus(required(value, "kind", path), `${path}.kind`);
  if (kind === "playing") throw new InvalidStateError(`${path}.kind: playing is not terminal`);
  return {
    kind,
    summary: requireString(required(value, "summary", path), `${path}.summary`),
    revision: requireSafeInteger(required(value, "revision", path), `${path}.revision`, 1),
    stateHash: requireHash(required(value, "stateHash", path), `${path}.stateHash`),
  };
}

function isEngineProducedState(value: unknown): value is GameState {
  return typeof value === "object" && value !== null && ENGINE_PRODUCED_STATES.has(value);
}

function assertState(value: unknown, checkReceipt = true, checkHistory = true): asserts value is GameState {
  if (!isRecord(value)) throw new InvalidStateError("state: expected a plain object");
  if (isEngineProducedState(value)) return;
  exactKeys(
    value,
    ["version", "buildId", "seed", "revision", "scene", "resources", "flags", "knownFacts", "history", "status", "receipt"],
    "state",
  );
  if (required(value, "version", "state") !== 1) throw new InvalidStateError("state.version: unsupported version");
  if (required(value, "buildId", "state") !== BUILD_ID) throw new InvalidStateError("state.buildId: does not match this build");
  requireSafeInteger(required(value, "seed", "state"), "state.seed");
  const revision = requireSafeInteger(required(value, "revision", "state"), "state.revision", 0);
  const scene = requireString(required(value, "scene", "state"), "state.scene");
  if (!SCENES.has(scene)) throw new InvalidStateError(`state.scene: unknown scene ${JSON.stringify(scene)}`);
  requireResourceMap(required(value, "resources", "state"), "state.resources");
  requireFlags(required(value, "flags", "state"), "state.flags");
  requireFacts(required(value, "knownFacts", "state"), "state.knownFacts");
  requireHistory(required(value, "history", "state"), "state.history", revision);
  const status = requireStatus(required(value, "status", "state"), "state.status");
  const hasReceipt = Object.hasOwn(value, "receipt");
  if (status === "playing" && hasReceipt) throw new InvalidStateError("state.receipt: playing states cannot have a receipt");
  if (status !== "playing" && !hasReceipt) throw new InvalidStateError("state.receipt: terminal states require a receipt");
  if (hasReceipt) {
    const receipt = requireReceipt(value.receipt, "state.receipt");
    if (receipt.kind !== status) throw new InvalidStateError("state.receipt.kind: does not match state.status");
    if (receipt.revision !== revision) throw new InvalidStateError("state.receipt.revision: does not match state.revision");
    if (checkReceipt && receipt.stateHash !== calculateStateHash(value as unknown as GameState)) {
      throw new InvalidStateError("state.receipt.stateHash: does not match state");
    }
  }
  if (checkHistory) {
    const derived = deriveStateFromHistory(
      requireSafeInteger(value.seed, "state.seed"),
      value.history as readonly ActionRecord[],
    );
    if (calculateStateHash(derived) !== calculateStateHash(value as unknown as GameState)) {
      throw new InvalidStateError("state: checkpoint does not match its action history");
    }
  }
}

function validateExpectedRevision(expectedRevision: unknown): number {
  return requireSafeInteger(expectedRevision, "expectedRevision", 0);
}

function conditionMatches(condition: Condition, state: Pick<GameState, "flags" | "resources">): boolean {
  if (condition.type === "flag") {
    return (Object.hasOwn(state.flags, condition.flag) ? state.flags[condition.flag] : false) === condition.value;
  }
  if (condition.type === "resourceAtLeast") return (state.resources[condition.resource] ?? 0) >= condition.value;
  return (state.resources[condition.resource] ?? 0) <= condition.value;
}

function allConditionsMatch(conditions: readonly Condition[] | undefined, state: Pick<GameState, "flags" | "resources">): boolean {
  return (conditions ?? []).every((condition) => conditionMatches(condition, state));
}

function legalChoices(state: GameState): readonly Choice[] {
  return (CHOICES_BY_SCENE.get(state.scene) ?? []).filter((choice) => allConditionsMatch(choice.when, state));
}

/** Saturate a validated clock advance at its declared maximum. */
export function advanceClockValue(current: number, max: number, delta: number): number {
  if (!Number.isSafeInteger(current) || current < 0) throw new InvalidStateError("clock current value must be a non-negative safe integer");
  if (!Number.isSafeInteger(max) || max < 0) throw new InvalidStateError("clock maximum must be a non-negative safe integer");
  if (current > max) throw new InvalidStateError("clock current value exceeds its maximum");
  if (!Number.isSafeInteger(delta) || delta < 1) throw new InvalidStateError("clock delta must be a positive safe integer");
  return delta >= max - current ? max : current + delta;
}

function applyEffects(state: GameState, effects: readonly Effect[]): Pick<GameState, "scene" | "resources" | "flags" | "knownFacts"> {
  const resources = { ...state.resources };
  const flags = { ...state.flags };
  const knownFacts = [...state.knownFacts];
  let scene = state.scene;
  for (const effect of effects) {
    if (effect.type === "setFlag") {
      flags[effect.flag] = effect.value;
    } else if (effect.type === "setResource") {
      if (CLOCK_RESOURCES.has(effect.resource)) {
        throw new InvalidStateError(`effect cannot write declared clock resource ${JSON.stringify(effect.resource)}`);
      }
      resources[effect.resource] = effect.value;
    } else if (effect.type === "adjustResource") {
      if (CLOCK_RESOURCES.has(effect.resource)) {
        throw new InvalidStateError(`effect cannot write declared clock resource ${JSON.stringify(effect.resource)}`);
      }
      const result = (resources[effect.resource] ?? 0) + effect.delta;
      if (!Number.isSafeInteger(result) || result < 0) {
        throw new InvalidStateError(`effect would make resource ${JSON.stringify(effect.resource)} invalid`);
      }
      resources[effect.resource] = result;
    } else if (effect.type === "advanceClock") {
      const clock = CLOCKS.get(effect.clock);
      if (clock === undefined) throw new InvalidStateError(`effect references unknown clock ${JSON.stringify(effect.clock)}`);
      const current = resources[clock.resource];
      if (current === undefined) throw new InvalidStateError(`clock resource ${JSON.stringify(clock.resource)} is missing`);
      resources[clock.resource] = advanceClockValue(current, clock.max, effect.delta);
    } else if (effect.type === "addFact") {
      if (!knownFacts.includes(effect.fact)) knownFacts.push(effect.fact);
    } else if (effect.type === "goTo") {
      scene = effect.scene;
    }
  }
  return { scene, resources, flags, knownFacts };
}

function terminalState(
  state: Omit<GameState, "receipt" | "status"> & { status: Exclude<GameStatus, "playing"> },
  summary: string,
): GameState {
  const unsigned: GameState = {
    ...state,
    status: state.status,
    receipt: {
      kind: state.status,
      summary,
      revision: state.revision,
      stateHash: "0".repeat(64),
    },
  };
  const hash = calculateStateHash(unsigned);
  return freezeState({
    ...unsigned,
    receipt: {
      kind: state.status,
      summary,
      revision: state.revision,
      stateHash: hash,
    },
  });
}

function departureSummary(scene: string): string {
  return `Your journey ends at ${SCENES.get(scene)!.title}. Your choices and their consequences remain.`;
}

/** Apply an already validated, legal choice without revalidating its input. */
function transitionChoiceUnchecked(state: GameState, choice: Choice): GameState {
  const nextData = applyEffects(state, choice.effects);
  const revision = state.revision + 1;
  const history: ActionRecord[] = [
    ...state.history,
    { choiceId: choice.id, fromRevision: state.revision, toRevision: revision },
  ];
  const common = {
    version: 1 as const,
    buildId: BUILD_ID,
    seed: state.seed,
    revision,
    scene: nextData.scene,
    resources: nextData.resources,
    flags: nextData.flags,
    knownFacts: nextData.knownFacts,
    history,
  };
  if (choice.outcome !== undefined) {
    return terminalState({ ...common, status: choice.outcome.status }, choice.outcome.summary);
  }
  return freezeState({ ...common, status: "playing" });
}

/** Apply the reserved end action without revalidating its input. */
function endUnchecked(state: GameState): GameState {
  const revision = state.revision + 1;
  const common = {
    version: 1 as const,
    buildId: BUILD_ID,
    seed: state.seed,
    revision,
    scene: state.scene,
    resources: { ...state.resources },
    flags: { ...state.flags },
    knownFacts: [...state.knownFacts],
    history: [
      ...state.history,
      { choiceId: END_ACTION_ID, fromRevision: state.revision, toRevision: revision },
    ],
  };
  return terminalState({ ...common, status: "departed" }, departureSummary(state.scene));
}

/** Replay only the hidden action history, used to reject rehashed checkpoints. */
function deriveStateFromHistory(seed: number, history: readonly ActionRecord[]): GameState {
  let state = start(seed);
  for (const record of history) {
    if (state.revision !== record.fromRevision) {
      throw new InvalidStateError("state.history: action starts at the wrong revision");
    }
    if (state.status !== "playing") {
      throw new InvalidStateError("state.history: action appears after a terminal outcome");
    }
    if (record.choiceId === END_ACTION_ID) {
      state = endUnchecked(state);
    } else {
      const choice = legalChoices(state).find((candidate) => candidate.id === record.choiceId);
      if (choice === undefined) {
        throw new InvalidStateError(`state.history: action ${JSON.stringify(record.choiceId)} was not legal`);
      }
      state = transitionChoiceUnchecked(state, choice);
    }
    if (state.revision !== record.toRevision) {
      throw new InvalidStateError("state.history: action ends at the wrong revision");
    }
  }
  return state;
}

function checkRevisionAndPlaying(state: GameState, expectedRevision: unknown): void {
  const expected = validateExpectedRevision(expectedRevision);
  if (expected !== state.revision) throw new StaleRevisionError(expected, state.revision);
  if (state.status !== "playing") throw new IllegalChoiceError("<terminal>", "the run has already ended");
}

export function start(seed = 1): GameState {
  if (!isSafeInteger(seed)) throw new InvalidStateError("seed: expected a safe integer");
  return freezeState({
    version: 1,
    buildId: BUILD_ID,
    seed,
    revision: 0,
    scene: SCENARIO.initialScene,
    resources: { ...SCENARIO.initialResources },
    flags: {},
    knownFacts: [...SCENARIO.initialFacts],
    history: [],
    status: "playing",
  });
}

export function observe(state: GameState): Observation {
  assertState(state);
  const scene = SCENES.get(state.scene);
  if (scene === undefined) throw new InvalidStateError(`state.scene: unknown scene ${JSON.stringify(state.scene)}`);
  const text = scene.text
    .filter((line) => allConditionsMatch(line.when, state))
    .map((line) => line.text);
  const choices: ChoiceOption[] = state.status === "playing"
    ? legalChoices(state).map((choice) => ({ id: choice.id, label: choice.label, description: choice.description }))
    : [];
  const receipt = state.receipt === undefined ? undefined : { ...state.receipt };
  let journalScene = SCENARIO.initialScene;
  const journal: JournalEntry[] = state.history.map(action => {
    const authored = CHOICES.get(action.choiceId);
    const from = SCENES.get(journalScene)!.title;
    const destination = authored?.effects.find(effect => effect.type === 'goTo');
    if (destination?.type === 'goTo') journalScene = destination.scene;
    return { choice: authored?.label ?? 'End journey', from, to: SCENES.get(journalScene)!.title };
  });
  return {
    revision: state.revision,
    sceneId: scene.id,
    title: scene.title,
    text: [...text],
    facts: state.knownFacts.map((fact) => Object.hasOwn(FACT_LABELS_BY_ID, fact) ? FACT_LABELS_BY_ID[fact]! : fact),
    journal,
    resources: { ...state.resources },
    choices: choices.map((choice) => ({ ...choice })),
    status: state.status,
    ...(receipt === undefined ? {} : { receipt }),
  };
}

export function choose(state: GameState, choiceId: string, expectedRevision: number): GameState {
  assertState(state);
  checkRevisionAndPlaying(state, expectedRevision);
  if (typeof choiceId !== "string" || choiceId.length === 0) throw new IllegalChoiceError(String(choiceId), "choice id must be a non-empty string");
  const choice = legalChoices(state).find((candidate) => candidate.id === choiceId);
  if (choice === undefined) {
    const authored = CHOICES.get(choiceId);
    throw new IllegalChoiceError(choiceId, authored === undefined ? "unknown choice" : "choice is unavailable here");
  }
  return transitionChoiceUnchecked(state, choice);
}

export function end(state: GameState, expectedRevision: number): GameState {
  assertState(state);
  checkRevisionAndPlaying(state, expectedRevision);
  return endUnchecked(state);
}

export function stateHash(state: GameState): string {
  // Hashing is also useful to construct a candidate save for verification;
  // restore performs the stronger history equivalence check.
  assertState(state, true, false);
  return calculateStateHash(state);
}

interface SaveEnvelope {
  readonly format: "adventure-forge-save";
  readonly version: 1;
  readonly buildId: string;
  readonly payload: GameState;
  readonly hash: string;
}

export function save(state: GameState): string {
  assertState(state);
  const envelope: SaveEnvelope = {
    format: "adventure-forge-save",
    version: 1,
    buildId: BUILD_ID,
    payload: state,
    hash: calculateStateHash(state),
  };
  return stableStringify(envelope);
}

export function restore(serialized: string): GameState {
  if (typeof serialized !== "string" || serialized.length === 0) throw new SaveFormatError("serialized save must be a non-empty string");
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    throw new SaveFormatError("serialized save is not valid JSON");
  }
  if (!isRecord(parsed)) throw new SaveFormatError("save envelope must be an object");
  try {
    exactKeys(parsed, ["format", "version", "buildId", "payload", "hash"], "save");
    if (required(parsed, "format", "save") !== "adventure-forge-save") throw new SaveFormatError("unsupported save format");
    if (required(parsed, "version", "save") !== 1) throw new SaveFormatError("unsupported save version");
    if (required(parsed, "buildId", "save") !== BUILD_ID) throw new SaveFormatError("save was created by a different build");
    const payload = parsed.payload;
    assertState(payload);
    const hash = requireHash(required(parsed, "hash", "save"), "save.hash");
    const expectedHash = calculateStateHash(payload);
    if (hash !== expectedHash) throw new SaveFormatError("save hash does not match its state");
    return cloneState(payload);
  } catch (error) {
    if (error instanceof SaveFormatError) throw error;
    if (error instanceof EngineError) throw new SaveFormatError(error.message);
    throw error;
  }
}

export function replay(seed: number, actions: readonly ReplayAction[]): GameState {
  if (!Array.isArray(actions)) throw new ReplayError("actions must be an array");
  let state = start(seed);
  for (const [index, action] of actions.entries()) {
    if (!isRecord(action)) throw new ReplayError(`actions[${index}] must be an object`);
    exactKeys(action, ["choiceId", "expectedRevision"], `actions[${index}]`);
    const choiceId = requireString(required(action, "choiceId", `actions[${index}]`), `actions[${index}].choiceId`);
    const expectedRevision = requireSafeInteger(required(action, "expectedRevision", `actions[${index}]`), `actions[${index}].expectedRevision`, 0);
    if (choiceId === END_ACTION_ID) state = end(state, expectedRevision);
    else state = choose(state, choiceId, expectedRevision);
  }
  return state;
}
