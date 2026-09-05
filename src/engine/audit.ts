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
  const reachableScenesByScene = new Map<string, readonly string[]>();
  const retainedFlagsByScene = new Map<string, readonly string[]>();
  for (const scene of scenario.scenes) {
    const reachable = staticSceneClosure(scene.id, choicesByScene, scenesById);
    reachableScenesByScene.set(scene.id, [...reachable].sort());

    const retainedFlags = new Set<string>();
    for (const sceneId of reachable) {
      const futureScene = scenesById.get(sceneId);
      if (futureScene === undefined) continue;
      for (const line of futureScene.text) addFlagReads(line.when, retainedFlags);
      for (const choice of choicesByScene.get(sceneId) ?? []) addFlagReads(choice.when, retainedFlags);
    }
    retainedFlagsByScene.set(scene.id, [...retainedFlags].sort());
  }

  const reachableScenes = reachableScenesByScene.get(scenario.initialScene) ?? [];
  const retainedFlags = retainedFlagsByScene.get(scenario.initialScene) ?? [];

  return {
    reachableScenes,
    retainedFlags,
    reachableScenesByScene,
    retainedFlagsByScene,
  };
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
        break;
      default:
        throw new Error("Audit cannot analyze an unknown condition type");
    }
  }
}

/**
 * Canonical key for the future-relevant part of a state. Every resource is
 * retained. Absent and false flags are equivalent to the engine's
 * `state.flags[name] ?? false` condition semantics.
 */
export function futureStateKey(state: AuditStateProjection, retainedFlags: ReadonlySet<string>): string {
  const flags = [...retainedFlags]
    .sort()
    .map((flag) => [flag, state.flags[flag] === true] as const);
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
  readonly path: readonly string[];
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
  retainedFlags: ReadonlySet<string>,
  key: string,
): number {
  if (futureStateKey(representative, retainedFlags) !== key || futureStateKey(candidate, retainedFlags) !== key) {
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
      if (futureStateKey(representativeNext, retainedFlags) !== futureStateKey(candidateNext, retainedFlags)) {
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
 * space. The default is bounded at 100,000 canonical states so a malformed future content graph
 * cannot make CI unbounded; increasing it is a diagnostic choice, not a
 * substitute for the reduction.
 */
export function auditScenario(maxStates = 100_000): ScenarioAudit {
  if (!Number.isSafeInteger(maxStates) || maxStates < 1) throw new Error("Invalid audit state limit");

  const futureReads = analyzeFutureReads(SCENARIO);
  const initial = start(1);
  const retainedFlagsByScene = new Map(
    [...futureReads.retainedFlagsByScene].map(([scene, flags]) => [scene, new Set(flags)] as const),
  );
  const retainedFor = (scene: string): ReadonlySet<string> => retainedFlagsByScene.get(scene) ?? new Set<string>();
  const initialKey = futureStateKey(initial, retainedFor(initial.scene));
  const queue: CanonicalState[] = [{ state: initial, path: [] }];
  const seen = new Set([initialKey]);
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
      endings.set(current.path.at(-1)!, endings.get(current.path.at(-1)!) ?? [...current.path]);
      continue;
    }
    if (view.choices.length === 0) deadEnds.push([...current.path]);

    const before = stateHash(state);
    for (const choice of view.choices) {
      const next = choose(state, choice.id, view.revision);
      transitions++;
      if (stateHash(state) !== before) throw new Error(`Action mutated its input: ${choice.id}`);
      if (next.revision !== state.revision + 1) throw new Error(`Action did not advance revision: ${choice.id}`);
      if (Object.values(next.resources).some((value) => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error(`Invalid resource balance: ${choice.id}`);
      }
      choices.set(choice.id, choices.get(choice.id) ?? [...current.path, choice.id]);

      const nextRetainedFlags = retainedFor(next.scene);
      const key = futureStateKey(next, nextRetainedFlags);
      const successorIndex = indices.get(key);
      if (successorIndex === undefined) {
        if (seen.size >= maxStates) {
          throw new Error(`Audit exceeded ${maxStates} future-relevant states; exhaustive coverage is not established`);
        }
        seen.add(key);
        indices.set(key, queue.length);
        parents.push([]);
        queue.push({ state: next, path: [...current.path, choice.id] });
        parents[queue.length - 1]!.push(index);
      } else {
        parents[successorIndex]!.push(index);
        mergedStates++;
        const representative = queue[successorIndex]!.state;
        congruenceSuccessors += assertCongruent(representative, next, nextRetainedFlags, key);
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
    states: seen.size,
    transitions,
    authoredScenes: SCENARIO.scenes.length,
    authoredChoices: SCENARIO.choices.length,
    reachableScenes: [...scenes].sort(),
    unreachableScenes: SCENARIO.scenes.map((scene) => scene.id).filter((id) => !scenes.has(id)),
    unreachableChoices: SCENARIO.choices.map((choice) => choice.id).filter((id) => !choices.has(id)),
    deadEnds,
    noCompletionPaths: queue.flatMap((entry, index) => entry.state.status === "playing" && !completionReachable.has(index)
      ? [{ scene: entry.state.scene, path: entry.path }]
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
