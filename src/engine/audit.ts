import { choose, observe, start, stateHash, type GameState, type GameStatus, type Observation, type Receipt } from "./index.js";
import { SCENARIO, type Condition, type Scenario } from "./content.js";

/**
 * The audit's semantic state keeps every value that can affect a future
 * choice, scene text, or ending. Facts and history are deliberately omitted:
 * the closed content vocabulary never reads either one in a condition or an
 * effect. They remain on the representative engine state used for public
 * projection and receipt checks.
 */
export interface AuditStateProjection {
  readonly scene: string;
  readonly resources: Readonly<Record<string, number>>;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly status: GameStatus;
  readonly receipt?: Pick<Receipt, "kind" | "summary">;
}

export interface FutureReadAnalysis {
  /** Static scene closure following every authored goTo, including conditional choices. */
  readonly reachableScenes: readonly string[];
  /** Flags read by a choice condition or text condition in that closure. */
  readonly retainedFlags: readonly string[];
  /** The same conservative closure, calculated from each possible current scene. */
  readonly reachableScenesByScene: ReadonlyMap<string, readonly string[]>;
  /** The flags that can be read from each scene or any scene after it. */
  readonly retainedFlagsByScene: ReadonlyMap<string, readonly string[]>;
  /** Flags read by visible scene text when no further choice can be taken. */
  readonly terminalTextFlagsByScene: ReadonlyMap<string, readonly string[]>;
  /** Flags written only to true that may be used as permanent phase gates. */
  readonly monotoneFlags: readonly string[];
  /** Monotone false-gate flags that can occur in each static scene closure. */
  readonly phaseFlagsByScene: ReadonlyMap<string, readonly string[]>;
  /** Resolve the future read set for a particular current state. */
  readonly retainedFlagsForState: (
    state: Pick<AuditStateProjection, "scene" | "status" | "flags">
  ) => readonly string[];
}

/**
 * Find the conservative future scene closure and the flag read set for a
 * validated scenario. This is intentionally independent of runtime state so
 * it can be tested with small adversarial content graphs.
 */
export function analyzeFutureReads(scenario: Scenario): FutureReadAnalysis {
  assertKnownVocabulary(scenario);
  const choicesByScene = new Map<string, Scenario["choices"]>();
  for (const choice of scenario.choices) {
    const choices = choicesByScene.get(choice.scene);
    if (choices === undefined) choicesByScene.set(choice.scene, [choice]);
    else choicesByScene.set(choice.scene, [...choices, choice]);
  }

  const scenesById = new Map(scenario.scenes.map((scene) => [scene.id, scene] as const));
  const monotoneFlags = [...findMonotoneFlags(scenario)].sort();
  const monotoneFlagSet = new Set(monotoneFlags);
  const reachableScenesByScene = new Map<string, readonly string[]>();
  const retainedFlagsByScene = new Map<string, readonly string[]>();
  const terminalTextFlagsByScene = new Map<string, readonly string[]>();
  const phaseFlagsByScene = new Map<string, readonly string[]>();
  for (const scene of scenario.scenes) {
    const reachable = staticSceneClosure(scene.id, choicesByScene, scenesById);
    reachableScenesByScene.set(scene.id, [...reachable].sort());

    const retainedFlags = new Set<string>();
    const phaseFlags = new Set<string>();
    for (const sceneId of reachable) {
      const futureScene = scenesById.get(sceneId);
      if (futureScene === undefined) continue;
      for (const line of futureScene.text) addFlagReads(line.when, retainedFlags);
      for (const choice of choicesByScene.get(sceneId) ?? []) {
        addFlagReads(choice.when, retainedFlags);
        for (const condition of choice.when ?? []) {
          if (condition.type === "flag" && condition.value === false && monotoneFlagSet.has(condition.flag)) {
            phaseFlags.add(condition.flag);
          }
        }
      }
    }
    retainedFlagsByScene.set(scene.id, [...retainedFlags].sort());
    phaseFlagsByScene.set(scene.id, [...phaseFlags].sort());

    const terminalTextFlags = new Set<string>();
    for (const line of scene.text) addFlagReads(line.when, terminalTextFlags);
    terminalTextFlagsByScene.set(scene.id, [...terminalTextFlags].sort());
  }

  // A cache entry is valid for every state with the same current values for
  // the monotone false gates that can occur in this scene's static closure.
  // Historical true flags outside that mask cannot affect this resolver.
  const retainedFlagsCache = new Map<string, Map<string, readonly string[]>>();
  const retainedFlagsForState = (
    state: Pick<AuditStateProjection, "scene" | "status" | "flags">,
  ): readonly string[] => {
    if (state.status !== "playing") return terminalTextFlagsByScene.get(state.scene) ?? [];
    const phaseFlags = phaseFlagsByScene.get(state.scene) ?? [];
    const mask = monotoneMask(state.flags, phaseFlags);
    let sceneCache = retainedFlagsCache.get(state.scene);
    if (sceneCache === undefined) {
      sceneCache = new Map<string, readonly string[]>();
      retainedFlagsCache.set(state.scene, sceneCache);
    }
    const cached = sceneCache.get(mask);
    if (cached !== undefined) return cached;

    const retainedFlags = stateSpecificFutureReads(
      state.scene,
      state.flags,
      choicesByScene,
      scenesById,
      monotoneFlagSet,
    );
    const resolved = Object.freeze([...retainedFlags].sort());
    sceneCache.set(mask, resolved);
    return resolved;
  };

  const reachableScenes = reachableScenesByScene.get(scenario.initialScene) ?? [];
  const retainedFlags = retainedFlagsByScene.get(scenario.initialScene) ?? [];

  return {
    reachableScenes,
    retainedFlags,
    reachableScenesByScene,
    retainedFlagsByScene,
    terminalTextFlagsByScene,
    monotoneFlags,
    phaseFlagsByScene,
    retainedFlagsForState,
  };
}

function findMonotoneFlags(scenario: Scenario): Set<string> {
  const writes = new Map<string, Set<boolean>>();
  for (const choice of scenario.choices) {
    for (const effect of choice.effects) {
      if (effect.type !== "setFlag") continue;
      const values = writes.get(effect.flag);
      if (values === undefined) writes.set(effect.flag, new Set([effect.value]));
      else values.add(effect.value);
    }
  }
  return new Set(
    [...writes]
      .filter(([, values]) => [...values].length > 0 && [...values].every((value) => value === true))
      .map(([flag]) => flag),
  );
}

function monotoneMask(flags: Readonly<Record<string, boolean>>, phaseFlags: readonly string[]): string {
  let mask = 0n;
  for (const [index, flag] of phaseFlags.entries()) {
    if (Object.hasOwn(flags, flag) && flags[flag] === true) mask |= 1n << BigInt(index);
  }
  return mask.toString(16);
}

function stateSpecificFutureReads(
  initialScene: string,
  flags: Readonly<Record<string, boolean>>,
  choicesByScene: ReadonlyMap<string, Scenario["choices"]>,
  scenesById: ReadonlyMap<string, Scenario["scenes"][number]>,
  monotoneFlags: ReadonlySet<string>,
): Set<string> {
  const reachable = new Set<string>([initialScene]);
  const pending = [initialScene];
  const retainedFlags = new Set<string>();
  for (let index = 0; index < pending.length; index++) {
    const sceneId = pending[index]!;
    const scene = scenesById.get(sceneId);
    if (scene === undefined) continue;
    for (const line of scene.text) addFlagReads(line.when, retainedFlags);
    for (const choice of choicesByScene.get(sceneId) ?? []) {
      const pruningFlags: string[] = [];
      for (const condition of choice.when ?? []) {
        if (condition.type === "flag"
          && condition.value === false
          && monotoneFlags.has(condition.flag)
          && Object.hasOwn(flags, condition.flag)
          && flags[condition.flag] === true) {
          pruningFlags.push(condition.flag);
        }
      }
      if (pruningFlags.length > 0) {
        // Keep every condition that independently proves this choice
        // impossible. These flags are part of the phase identity even when
        // the choice's destination and other reads disappear.
        for (const flag of pruningFlags) retainedFlags.add(flag);
        continue;
      }
      addFlagReads(choice.when, retainedFlags);
      for (const effect of choice.effects) {
        if (effect.type !== "goTo") continue;
        if (reachable.has(effect.scene) || !scenesById.has(effect.scene)) continue;
        reachable.add(effect.scene);
        pending.push(effect.scene);
      }
    }
  }
  return retainedFlags;
}

function staticSceneClosure(
  initialScene: string,
  choicesByScene: ReadonlyMap<string, Scenario["choices"]>,
  scenesById: ReadonlyMap<string, Scenario["scenes"][number]>,
): Set<string> {
  const reachable = new Set<string>([initialScene]);
  const pending = [initialScene];
  for (let index = 0; index < pending.length; index++) {
    const sceneId = pending[index]!;
    for (const choice of choicesByScene.get(sceneId) ?? []) {
      for (const effect of choice.effects) {
        switch (effect.type) {
          case "goTo":
            if (reachable.has(effect.scene)) continue;
            // validateScenario already rejects this case for the shipped
            // scenario. Keeping the guard makes the generic helper total for
            // a miniature graph supplied by a test or another caller.
            if (!scenesById.has(effect.scene)) continue;
            reachable.add(effect.scene);
            pending.push(effect.scene);
            break;
          case "setFlag":
          case "setResource":
          case "adjustResource":
          case "advanceClock":
          case "addFact":
            break;
          default:
            throw new Error("Audit cannot analyze an unknown effect type");
        }
      }
    }
  }
  return reachable;
}

function addFlagReads(conditions: readonly Condition[] | undefined, target: Set<string>): void {
  for (const condition of conditions ?? []) {
    switch (condition.type) {
      case "flag":
        target.add(condition.flag);
        break;
      case "resourceAtLeast":
      case "resourceAtMost":
        break;
      default:
        throw new Error("Audit cannot analyze an unknown condition type");
    }
  }
}

function assertKnownVocabulary(scenario: Scenario): void {
  for (const scene of scenario.scenes) {
    for (const line of scene.text) assertKnownConditions(line.when);
  }
  for (const choice of scenario.choices) {
    assertKnownConditions(choice.when);
    for (const effect of choice.effects) {
      switch (effect.type) {
        case "setFlag":
        case "setResource":
        case "adjustResource":
        case "advanceClock":
        case "addFact":
        case "goTo":
          break;
        default:
          throw new Error("Audit cannot analyze an unknown effect type");
      }
    }
  }
}

function assertKnownConditions(conditions: readonly Condition[] | undefined): void {
  for (const condition of conditions ?? []) {
    switch (condition.type) {
      case "flag":
      case "resourceAtLeast":
      case "resourceAtMost":
        break;
      default:
        throw new Error("Audit cannot analyze an unknown condition type");
    }
  }
}

/**
 * Canonical key for the future-relevant part of a state. Every resource is
 * retained. Absent flags are false, with own-property lookup matching the
 * engine.
 */
export function futureStateKey(state: AuditStateProjection, retainedFlags: ReadonlySet<string>): string {
  const flags = [...retainedFlags]
    .sort()
    .map((flag) => [flag, Object.hasOwn(state.flags, flag) && state.flags[flag] === true] as const);
  return JSON.stringify({
    scene: state.scene,
    resources: Object.entries(state.resources).sort(([a], [b]) => a.localeCompare(b)),
    flags,
    status: state.status,
    ending: state.receipt === undefined ? null : { kind: state.receipt.kind, summary: state.receipt.summary },
  });
}

function observationChoiceSignature(view: Observation): string {
  return JSON.stringify(view.choices.map((choice) => ({ id: choice.id, label: choice.label, description: choice.description })));
}

function relevantTextSignature(view: Observation): string {
  return JSON.stringify(view.text);
}

function projectionWordCount(view: Observation): number {
  const text = [
    view.title,
    ...view.text,
    ...view.facts,
    ...view.choices.flatMap((choice) => [choice.label, choice.description]),
  ].join(" ").trim();
  return text.length === 0 ? 0 : text.split(/\s+/).length;
}

interface CanonicalState {
  readonly state: GameState;
  /** Index of the predecessor in the canonical queue; the root uses -1. */
  readonly parentIndex: number;
  /** The authored choice that led from parentIndex to this state. */
  readonly choiceFromParent?: string;
}

type RetainedFlagOrder = readonly string[];

/**
 * Serialize an audit state with orders prepared from the validated scenario.
 * `futureStateKey` remains the public defensive helper for arbitrary callers;
 * this internal form avoids sorting the same immutable vocabulary on every
 * canonical successor visit.
 */
function orderedFutureStateKey(
  state: AuditStateProjection,
  retainedFlags: RetainedFlagOrder,
  resourceOrder: readonly string[],
): string {
  const flags = retainedFlags
    .map((flag) => [flag, Object.hasOwn(state.flags, flag) && state.flags[flag] === true] as const);
  const resources = resourceOrder.map((resource) => [resource, state.resources[resource]] as const);
  return JSON.stringify({
    scene: state.scene,
    resources,
    flags,
    status: state.status,
    ending: state.receipt === undefined ? null : { kind: state.receipt.kind, summary: state.receipt.summary },
  });
}

function reconstructPath(queue: readonly CanonicalState[], index: number): string[] {
  const reversed: string[] = [];
  let currentIndex = index;
  while (currentIndex !== 0) {
    const current = queue[currentIndex];
    if (current === undefined || current.parentIndex < 0 || current.choiceFromParent === undefined) {
      throw new Error("Audit internal error: canonical path chain is incomplete");
    }
    reversed.push(current.choiceFromParent);
    currentIndex = current.parentIndex;
  }
  reversed.reverse();
  return reversed;
}

/**
 * Check the congruence promised by a collision. Facts and journal entries may
 * differ, so only legal choices, condition-selected scene text, and reduced
 * successor keys are compared. The static read analysis supplies the reason
 * this local check is sufficient for the closed content vocabulary.
 */
function assertCongruent(
  representative: GameState,
  candidate: GameState,
  retainedFlags: RetainedFlagOrder,
  key: string,
  retainedFor: (state: Pick<GameState, "scene" | "status" | "flags">) => RetainedFlagOrder,
  resourceOrder: readonly string[],
): number {
  const representativeRetainedFlags = retainedFor(representative);
  const candidateRetainedFlags = retainedFor(candidate);
  if (representativeRetainedFlags.join("\u0000") !== retainedFlags.join("\u0000")
    || candidateRetainedFlags.join("\u0000") !== retainedFlags.join("\u0000")) {
    throw new Error("Audit internal error: collision states use different retained flag sets");
  }
  if (orderedFutureStateKey(representative, retainedFlags, resourceOrder) !== key
    || orderedFutureStateKey(candidate, retainedFlags, resourceOrder) !== key) {
    throw new Error("Audit internal error: collision key does not describe both states");
  }
  const representativeView = observe(representative);
  const candidateView = observe(candidate);
  if (representativeView.sceneId !== candidateView.sceneId
    || representativeView.status !== candidateView.status
    || relevantTextSignature(representativeView) !== relevantTextSignature(candidateView)
    || observationChoiceSignature(representativeView) !== observationChoiceSignature(candidateView)) {
    throw new Error("Audit projection is not congruent after facts/history reduction");
  }

  let successors = 0;
  if (representativeView.status === "playing") {
    for (const choice of representativeView.choices) {
      const representativeNext = choose(representative, choice.id, representativeView.revision);
      const candidateNext = choose(candidate, choice.id, candidateView.revision);
      successors++;
      const representativeSuccessorFlags = retainedFor(representativeNext);
      const candidateSuccessorFlags = retainedFor(candidateNext);
      if (representativeSuccessorFlags.join("\u0000") !== candidateSuccessorFlags.join("\u0000")) {
        throw new Error(`Audit successor retained flag sets diverged for equivalent choice ${choice.id}`);
      }
      if (orderedFutureStateKey(representativeNext, representativeSuccessorFlags, resourceOrder)
        !== orderedFutureStateKey(candidateNext, candidateSuccessorFlags, resourceOrder)) {
        throw new Error(`Audit successor key diverged for equivalent choice ${choice.id}`);
      }
    }
  }
  return successors;
}

export interface ScenarioAudit {
  readonly exhaustive: true;
  /** Number of canonical future-relevant states, after facts/history collapse. */
  readonly states: number;
  readonly transitions: number;
  readonly authoredScenes: number;
  readonly authoredChoices: number;
  readonly reachableScenes: readonly string[];
  readonly unreachableScenes: readonly string[];
  readonly unreachableChoices: readonly string[];
  readonly deadEnds: readonly (readonly string[])[];
  readonly noCompletionPaths: readonly { scene: string; path: readonly string[] }[];
  readonly maxChoices: number;
  /** Maximum representative scene/facts/choice word count, not all fact-list variants. */
  readonly maxProjectionWords: number;
  /** Explicit spelling for maxProjectionWords; retained for API compatibility. */
  readonly representativeMaxProjectionWords: number;
  readonly choiceWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly endingWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly futureScenes: readonly string[];
  readonly retainedFlags: readonly string[];
  /** Number of non-canonical successor visits checked for congruence. */
  readonly mergedStates: number;
  readonly congruenceSuccessors: number;
  readonly projectionWordsExhaustive: false;
}

/**
 * Exhaustively audit the authored graph over a reduced future-relevant state
 * space. The default is bounded at 250,000 canonical states so malformed
 * future content cannot make CI unbounded. The Blackglass workload increase
 * is measured and documented in docs/STAGE6_BLACKGLASS.md; all semantic
 * checks remain mandatory regardless of the workload ceiling.
 */
export function auditScenario(maxStates = 250_000): ScenarioAudit {
  if (!Number.isSafeInteger(maxStates) || maxStates < 1) throw new Error("Invalid audit state limit");

  const futureReads = analyzeFutureReads(SCENARIO);
  const initial = start(1);
  const resourceOrder = Object.keys(initial.resources).sort((a, b) => a.localeCompare(b));
  const terminalTextFlagsByScene = new Map(
    [...futureReads.terminalTextFlagsByScene].map(([scene, flags]) => [scene, flags] as const),
  );
  const retainedFor = (state: Pick<GameState, "scene" | "status" | "flags">): RetainedFlagOrder => {
    if (state.status !== "playing") return terminalTextFlagsByScene.get(state.scene) ?? [];
    return futureReads.retainedFlagsForState(state);
  };
  const initialKey = orderedFutureStateKey(initial, retainedFor(initial), resourceOrder);
  const queue: CanonicalState[] = [{ state: initial, parentIndex: -1 }];
  const indices = new Map([[initialKey, 0]]);
  const parents: number[][] = [[]];
  const completionReachable = new Set<number>();
  const scenes = new Set<string>();
  const choices = new Map<string, string[]>();
  const endings = new Map<string, string[]>();
  const deadEnds: string[][] = [];
  let transitions = 0;
  let mergedStates = 0;
  let congruenceSuccessors = 0;
  let maxChoices = 0;
  let maxProjectionWords = 0;

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!;
    const state = current.state;
    const view = observe(state);
    scenes.add(view.sceneId);
    maxChoices = Math.max(maxChoices, view.choices.length);
    maxProjectionWords = Math.max(maxProjectionWords, projectionWordCount(view));

    if (view.status !== "playing") {
      if (view.status === "completed") completionReachable.add(index);
      if (view.choices.length !== 0 || !view.receipt || view.receipt.stateHash !== stateHash(state)) {
        throw new Error("Invalid terminal projection");
      }
      const path = reconstructPath(queue, index);
      const endingChoice = path.at(-1)!;
      if (!endings.has(endingChoice)) endings.set(endingChoice, path);
      continue;
    }
    if (view.choices.length === 0) deadEnds.push(reconstructPath(queue, index));

    const before = stateHash(state);
    for (const choice of view.choices) {
      const next = choose(state, choice.id, view.revision);
      transitions++;
      if (stateHash(state) !== before) throw new Error(`Action mutated its input: ${choice.id}`);
      if (next.revision !== state.revision + 1) throw new Error(`Action did not advance revision: ${choice.id}`);
      if (Object.values(next.resources).some((value) => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error(`Invalid resource balance: ${choice.id}`);
      }
      if (!choices.has(choice.id)) choices.set(choice.id, [...reconstructPath(queue, index), choice.id]);

      const nextRetainedFlags = retainedFor(next);
      const key = orderedFutureStateKey(next, nextRetainedFlags, resourceOrder);
      const successorIndex = indices.get(key);
      if (successorIndex === undefined) {
        if (indices.size >= maxStates) {
          throw new Error(`Audit exceeded ${maxStates} future-relevant states; exhaustive coverage is not established`);
        }
        indices.set(key, queue.length);
        parents.push([index]);
        queue.push({ state: next, parentIndex: index, choiceFromParent: choice.id });
      } else {
        parents[successorIndex]!.push(index);
        mergedStates++;
        const representative = queue[successorIndex]!.state;
        congruenceSuccessors += assertCongruent(
          representative,
          next,
          nextRetainedFlags,
          key,
          retainedFor,
          resourceOrder,
        );
      }
    }
  }

  const backwards = [...completionReachable];
  for (let index = 0; index < backwards.length; index++) {
    for (const parent of parents[backwards[index]!]!) {
      if (!completionReachable.has(parent)) {
        completionReachable.add(parent);
        backwards.push(parent);
      }
    }
  }

  return {
    exhaustive: true,
    states: indices.size,
    transitions,
    authoredScenes: SCENARIO.scenes.length,
    authoredChoices: SCENARIO.choices.length,
    reachableScenes: [...scenes].sort(),
    unreachableScenes: SCENARIO.scenes.map((scene) => scene.id).filter((id) => !scenes.has(id)),
    unreachableChoices: SCENARIO.choices.map((choice) => choice.id).filter((id) => !choices.has(id)),
    deadEnds,
    noCompletionPaths: queue.flatMap((entry, index) => entry.state.status === "playing" && !completionReachable.has(index)
      ? [{ scene: entry.state.scene, path: reconstructPath(queue, index) }]
      : []),
    maxChoices,
    maxProjectionWords,
    representativeMaxProjectionWords: maxProjectionWords,
    choiceWitnesses: Object.fromEntries(choices),
    endingWitnesses: Object.fromEntries(endings),
    futureScenes: futureReads.reachableScenes,
    retainedFlags: futureReads.retainedFlags,
    mergedStates,
    congruenceSuccessors,
    projectionWordsExhaustive: false,
  };
}
