import { SCENARIO, type Choice } from "../engine/content.js";
import {
  choose,
  observe,
  restore,
  save,
  start,
  stateHash,
  type GameState,
  type Observation,
} from "../engine/index.js";
import type { SymbolicChoice, SymbolicModel, SymbolicReachability } from "./symbolic-model.js";

/** Counts the concrete checks performed by one symbolic witness replay. */
export interface SymbolicReplayStats {
  readonly actions: number;
  readonly choiceChecks: number;
  readonly relationChecks: number;
  readonly saveRestoreChecks: number;
  readonly stateChecks: number;
}

/** Summary returned after validating all witnesses in a reachability result. */
export interface SymbolicWitnessSummary extends SymbolicReplayStats {
  readonly sceneWitnesses: number;
  readonly choiceWitnesses: number;
  readonly endingWitnesses: number;
  readonly unreachableScenes: readonly string[];
  readonly unreachableChoices: readonly string[];
}

type ReplayAccumulator = SymbolicReplayStats;

interface ReplayResult {
  readonly state: GameState;
  readonly stats: ReplayAccumulator;
}

type JsonRecord = Record<string, unknown>;

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/**
 * Canonicalize JSON-shaped values without relying on authored property order.
 * Scenario identity is checked with this representation before any witness is
 * replayed. It also gives the adapter a small dependency-free deep comparison
 * for engine checkpoints and observations.
 */
function canonical(value: unknown, ancestors = new Set<object>()): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Symbolic replay encountered a non-finite value");
    return Object.is(value, -0) ? "-0" : String(value);
  }
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (!isObject(value)) throw new Error("Symbolic replay encountered an unsupported value");
  if (ancestors.has(value)) throw new Error("Symbolic replay encountered a cyclic value");
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) return `[${value.map(entry => canonical(entry, nextAncestors)).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key], nextAncestors)}`).join(",")}}`;
}

function same(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}

function fail(message: string): never {
  throw new Error(`Symbolic replay verification failed: ${message}`);
}

function own(record: unknown, key: string): boolean {
  return isObject(record) && Object.hasOwn(record, key);
}

function requireArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  return value;
}

function requirePath(value: unknown, name: string): readonly string[] {
  const path = requireArray(value, name);
  for (const [index, action] of path.entries()) {
    if (typeof action !== "string" || action.length === 0) fail(`${name}[${index}] must be a non-empty choice id`);
  }
  return path as readonly string[];
}

function assertModelShape(model: SymbolicModel): void {
  if (!isObject(model)) fail("model must be an object");
  const candidate = model as unknown as JsonRecord;
  for (const method of ["project", "encode", "image"] as const) {
    if (typeof candidate[method] !== "function") fail(`model.${method} is unavailable`);
  }
  if (!isObject(candidate.bdd)) fail("model.bdd is unavailable");
}

function assertFixedScenario(model: SymbolicModel): void {
  assertModelShape(model);
  let modelScenario: string;
  let fixedScenario: string;
  try {
    modelScenario = canonical(model.scenario);
    fixedScenario = canonical(SCENARIO);
  } catch (error) {
    fail(`scenario identity cannot be checked: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (modelScenario !== fixedScenario) {
    fail("model scenario differs from the fixed validated SCENARIO");
  }
}

function assertEquivalent(model: SymbolicModel, left: number, right: number, label: string): void {
  let difference: number;
  try {
    difference = model.bdd.xor(left, right);
  } catch (error) {
    fail(`${label} is not a valid BDD formula: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (difference !== 0) fail(`${label} differs from the production projection`);
}

function projectionFormula(model: SymbolicModel, state: GameState): number {
  try {
    // project is deliberately fed only an actual state produced by the engine;
    // this adapter never calls model.decode to manufacture a GameState.
    return model.encode(model.project(state));
  } catch (error) {
    fail(`production state cannot be projected: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function authoredChoice(id: string): Choice | undefined {
  return SCENARIO.choices.find(choice => choice.id === id);
}

function symbolicChoice(model: SymbolicModel, id: string): SymbolicChoice {
  const choice = model.choices.find(candidate => candidate.id === id);
  if (choice === undefined) fail(`choice ${JSON.stringify(id)} is absent from the symbolic model`);
  return choice;
}

function assertOutcome(state: GameState, choice: Choice): void {
  if (choice.outcome === undefined) {
    if (state.status !== "playing" || state.receipt !== undefined) {
      fail(`non-terminal choice ${JSON.stringify(choice.id)} produced a terminal state`);
    }
    return;
  }
  if (state.status !== choice.outcome.status || state.receipt === undefined) {
    fail(`choice ${JSON.stringify(choice.id)} produced the wrong terminal status`);
  }
  if (state.receipt.kind !== choice.outcome.status || state.receipt.summary !== choice.outcome.summary) {
    fail(`choice ${JSON.stringify(choice.id)} produced the wrong terminal receipt`);
  }
}

function assertReceiptMatchesAuthored(state: GameState, choice: Choice): void {
  if (choice.outcome === undefined) {
    if (state.receipt !== undefined) fail(`choice ${JSON.stringify(choice.id)} has an unexpected receipt`);
    return;
  }
  const receipt = state.receipt;
  if (receipt === undefined || receipt.kind !== choice.outcome.status || receipt.summary !== choice.outcome.summary) {
    fail(`terminal witness ${JSON.stringify(choice.id)} has the wrong receipt`);
  }
}

function assertLegalChoices(model: SymbolicModel, state: GameState, view: Observation): number {
  const source = projectionFormula(model, state);
  const actualIds = view.status === "playing" ? view.choices.map(choice => choice.id) : [];
  const actualSet = new Set(actualIds);
  if (actualSet.size !== actualIds.length) fail("production observation contains duplicate legal choices");
  const enabledIds: string[] = [];
  for (const choice of model.choices) {
    let enabled: number;
    try {
      enabled = model.bdd.and(source, choice.enabled);
    } catch (error) {
      fail(`symbolic enabled formula for ${JSON.stringify(choice.id)} is invalid: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (enabled !== 0) enabledIds.push(choice.id);
  }
  const sortedActual = [...actualSet].sort();
  const sortedEnabled = [...new Set(enabledIds)].sort();
  if (!same(sortedActual, sortedEnabled)) {
    fail(`legal choices differ at revision ${state.revision}: production ${JSON.stringify(sortedActual)}, symbolic ${JSON.stringify(sortedEnabled)}`);
  }
  return source;
}

function assertCheckpoint(state: GameState, view: Observation): void {
  let restored: GameState;
  try {
    restored = restore(save(state));
  } catch (error) {
    fail(`save/restore rejected an engine-produced checkpoint: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!same(restored, state)) fail(`save/restore changed the full state at revision ${state.revision}`);
  if (stateHash(restored) !== stateHash(state)) fail(`save/restore changed the state hash at revision ${state.revision}`);
  if (!same(observe(restored), view)) fail(`save/restore changed the observation at revision ${state.revision}`);
}

function assertReachable(model: SymbolicModel, reachable: number | undefined, state: GameState, label: string): void {
  if (reachable === undefined) return;
  const projection = projectionFormula(model, state);
  let hit: number;
  try {
    hit = model.bdd.and(reachable, projection);
  } catch (error) {
    fail(`result.reachable is not a valid BDD formula: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (hit === 0) fail(`${label} is absent from result.reachable`);
}

function replayPath(model: SymbolicModel, path: readonly string[], reachable?: number): ReplayResult {
  const statePath = requirePath(path, "path");
  let state = start(1);
  let view = observe(state);
  let source = projectionFormula(model, state);
  assertEquivalent(model, source, model.initial, "initial projection");
  const stats: {
    actions: number;
    choiceChecks: number;
    relationChecks: number;
    saveRestoreChecks: number;
    stateChecks: number;
  } = {
    actions: 0,
    choiceChecks: 0,
    relationChecks: 0,
    saveRestoreChecks: 0,
    stateChecks: 0,
  };
  assertReachable(model, reachable, state, "initial projection");
  assertLegalChoices(model, state, view);
  assertCheckpoint(state, view);
  stats.saveRestoreChecks += 1;
  stats.stateChecks += 1;

  for (const [index, choiceId] of statePath.entries()) {
    if (view.status !== "playing") fail(`path continues after terminal action at index ${index}`);
    const legalSource = assertLegalChoices(model, state, view);
    if (legalSource !== source) fail(`source projection changed while checking action ${index}`);
    const modelChoice = symbolicChoice(model, choiceId);
    const authored = authoredChoice(choiceId);
    if (authored === undefined) fail(`path references a choice outside the fixed scenario: ${JSON.stringify(choiceId)}`);
    if (!view.choices.some(choice => choice.id === choiceId)) {
      fail(`path action ${JSON.stringify(choiceId)} is not legal at revision ${state.revision}`);
    }
    if (model.bdd.and(source, modelChoice.enabled) === 0) {
      fail(`path action ${JSON.stringify(choiceId)} is not symbolically enabled at revision ${state.revision}`);
    }
    stats.choiceChecks += 1;
    const next = choose(state, choiceId, state.revision);
    assertOutcome(next, authored);
    const nextView = observe(next);
    const nextProjection = projectionFormula(model, next);
    let modeledNext: number;
    try {
      modeledNext = model.image(source, modelChoice);
    } catch (error) {
      fail(`relation image for ${JSON.stringify(choiceId)} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    assertEquivalent(model, modeledNext, nextProjection, `relation image for ${JSON.stringify(choiceId)}`);
    if (modelChoice.terminal !== (authored.outcome !== undefined)) {
      fail(`symbolic terminal marker for ${JSON.stringify(choiceId)} disagrees with authored outcome`);
    }
    assertReceiptMatchesAuthored(next, authored);
    assertReachable(model, reachable, next, `projection after ${JSON.stringify(choiceId)}`);
    assertLegalChoices(model, next, nextView);
    assertCheckpoint(next, nextView);
    state = next;
    view = nextView;
    source = nextProjection;
    stats.actions += 1;
    stats.relationChecks += 1;
    stats.saveRestoreChecks += 1;
    stats.stateChecks += 1;
  }
  // Terminal states have no legal production choices, and the same enabled
  // check above proves that no symbolic choice remains enabled there.
  assertLegalChoices(model, state, view);
  return { state, stats: Object.freeze({ ...stats }) };
}

/**
 * Replay a symbolic action path through the real fixed engine.
 *
 * The returned state is the actual state returned by start/choose, rather than
 * a state decoded from a BDD assignment. Every prefix is checked for legal
 * choice agreement, exact relation-image agreement, and save/restore parity.
 */
export function replaySymbolicPath(model: SymbolicModel, path: readonly string[]): GameState {
  assertFixedScenario(model);
  return replayPath(model, path).state;
}

function reportArray(value: unknown, name: string): readonly string[] {
  const array = requireArray(value, name);
  const result: string[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of array.entries()) {
    if (typeof entry !== "string" || entry.length === 0) fail(`${name}[${index}] must be a non-empty string`);
    if (seen.has(entry)) fail(`${name} contains duplicate ${JSON.stringify(entry)}`);
    seen.add(entry);
    result.push(entry);
  }
  return result;
}

function witnessRecord(value: unknown, name: string): Readonly<Record<string, readonly string[]>> {
  if (!isObject(value) || Array.isArray(value)) fail(`${name} must be an object`);
  const result: Record<string, readonly string[]> = Object.create(null) as Record<string, readonly string[]>;
  for (const key of Object.keys(value as JsonRecord)) result[key] = requirePath((value as JsonRecord)[key], `${name}.${key}`);
  return result;
}

function assertKnownWitnessKeys(
  witnesses: Readonly<Record<string, readonly string[]>>,
  known: ReadonlySet<string>,
  name: string,
): void {
  for (const key of Object.keys(witnesses)) if (!known.has(key)) fail(`${name} contains unknown key ${JSON.stringify(key)}`);
}

function countStats(total: ReplayAccumulator[], scenes: number, choices: number, endings: number, unreachableScenes: readonly string[], unreachableChoices: readonly string[]): SymbolicWitnessSummary {
  return Object.freeze({
    actions: total.reduce((sum, value) => sum + value.actions, 0),
    choiceChecks: total.reduce((sum, value) => sum + value.choiceChecks, 0),
    relationChecks: total.reduce((sum, value) => sum + value.relationChecks, 0),
    saveRestoreChecks: total.reduce((sum, value) => sum + value.saveRestoreChecks, 0),
    stateChecks: total.reduce((sum, value) => sum + value.stateChecks, 0),
    sceneWitnesses: scenes,
    choiceWitnesses: choices,
    endingWitnesses: endings,
    unreachableScenes: Object.freeze([...unreachableScenes]),
    unreachableChoices: Object.freeze([...unreachableChoices]),
  });
}

/**
 * Verify the authored scene, choice, and terminal witnesses emitted by the
 * symbolic reachability pass against the real engine. This is an opt-in
 * experiment check and deliberately does not alter the release audit.
 */
export function verifySymbolicWitnesses(model: SymbolicModel, result: SymbolicReachability): SymbolicWitnessSummary {
  assertFixedScenario(model);
  if (!isObject(result)) fail("reachability result must be an object");
  if (result.exhaustive !== true) fail("reachability result is not exhaustive");
  if (result.deadEnds !== 0) fail("reachability result contains dead-end playing states");
  if (result.noCompletion !== 0) fail("reachability result contains playing states without a completion path");
  const unreachableScenes = reportArray(result.unreachableScenes, "unreachableScenes");
  const unreachableChoices = reportArray(result.unreachableChoices, "unreachableChoices");
  const sceneIds = new Set(SCENARIO.scenes.map(scene => scene.id));
  const choiceIds = new Set(SCENARIO.choices.map(choice => choice.id));
  assertKnownWitnessKeys(witnessRecord(result.sceneWitnesses, "sceneWitnesses"), sceneIds, "sceneWitnesses");
  assertKnownWitnessKeys(witnessRecord(result.choiceWitnesses, "choiceWitnesses"), choiceIds, "choiceWitnesses");
  assertKnownWitnessKeys(witnessRecord(result.endingWitnesses, "endingWitnesses"), choiceIds, "endingWitnesses");
  for (const id of unreachableScenes) if (!sceneIds.has(id)) fail(`unreachableScenes contains unknown scene ${JSON.stringify(id)}`);
  for (const id of unreachableChoices) if (!choiceIds.has(id)) fail(`unreachableChoices contains unknown choice ${JSON.stringify(id)}`);
  const unreachableSceneSet = new Set(unreachableScenes);
  const unreachableChoiceSet = new Set(unreachableChoices);
  const sceneWitnesses = witnessRecord(result.sceneWitnesses, "sceneWitnesses");
  const choiceWitnesses = witnessRecord(result.choiceWitnesses, "choiceWitnesses");
  const endingWitnesses = witnessRecord(result.endingWitnesses, "endingWitnesses");
  for (const id of unreachableScenes) if (own(sceneWitnesses, id)) fail(`scene ${JSON.stringify(id)} is both unreachable and witnessed`);
  for (const id of unreachableChoices) if (own(choiceWitnesses, id)) fail(`choice ${JSON.stringify(id)} is both unreachable and witnessed`);

  const replayStats: ReplayAccumulator[] = [];
  const reachable = result.reachable;
  for (const scene of SCENARIO.scenes) {
    if (unreachableSceneSet.has(scene.id)) continue;
    if (!own(sceneWitnesses, scene.id)) fail(`scene ${JSON.stringify(scene.id)} has no witness`);
    const replay = replayPath(model, sceneWitnesses[scene.id]!, reachable);
    if (observe(replay.state).sceneId !== scene.id) fail(`scene witness ${JSON.stringify(scene.id)} ends at the wrong scene`);
    replayStats.push(replay.stats);
  }

  for (const choice of SCENARIO.choices) {
    if (unreachableChoiceSet.has(choice.id)) continue;
    if (!own(choiceWitnesses, choice.id)) fail(`choice ${JSON.stringify(choice.id)} has no witness`);
    const path = choiceWitnesses[choice.id]!;
    if (path.length === 0 || path[path.length - 1] !== choice.id) {
      fail(`choice witness ${JSON.stringify(choice.id)} does not end with its choice id`);
    }
    const replay = replayPath(model, path, reachable);
    const final = replay.state;
    const finalRecord = final.history[final.history.length - 1];
    if (finalRecord === undefined || finalRecord.choiceId !== choice.id) {
      fail(`choice witness ${JSON.stringify(choice.id)} does not end with its authored action`);
    }
    assertReceiptMatchesAuthored(final, choice);
    replayStats.push(replay.stats);
    if (choice.outcome !== undefined) {
      if (!own(endingWitnesses, choice.id)) fail(`terminal choice ${JSON.stringify(choice.id)} has no ending witness`);
    }
  }
  for (const key of Object.keys(endingWitnesses)) {
    const choice = authoredChoice(key);
    if (choice === undefined || choice.outcome === undefined) fail(`ending witness ${JSON.stringify(key)} is not an authored terminal choice`);
    if (unreachableChoiceSet.has(key)) fail(`ending witness ${JSON.stringify(key)} is marked unreachable`);
    if (!own(choiceWitnesses, key)) fail(`ending witness ${JSON.stringify(key)} has no corresponding choice witness`);
    const path = endingWitnesses[key]!;
    if (path.length === 0 || path[path.length - 1] !== key) fail(`ending witness ${JSON.stringify(key)} does not end with its choice id`);
    const replay = replayPath(model, path, reachable);
    if (replay.state.status !== choice.outcome.status || replay.state.receipt?.summary !== choice.outcome.summary) {
      fail(`ending witness ${JSON.stringify(key)} has the wrong terminal receipt`);
    }
    replayStats.push(replay.stats);
  }
  return countStats(
    replayStats,
    Object.keys(sceneWitnesses).length,
    Object.keys(choiceWitnesses).length,
    Object.keys(endingWitnesses).length,
    unreachableScenes,
    unreachableChoices,
  );
}
