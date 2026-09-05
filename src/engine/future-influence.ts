import type { Condition, Effect, Scenario } from "./content.js";
import type { GameStatus } from "./types.js";

/** The state dimensions needed to decide this analysis. */
export interface FutureInfluenceState {
  readonly scene: string;
  readonly status: GameStatus;
  readonly flags: Readonly<Record<string, boolean>>;
}

/**
 * A sound parameter boundary for a validated scenario at one current state.
 * Active dimensions can affect a future choice, effect, or phase-pruning
 * decision. Conserved dimensions are still carried symbolically because they
 * can affect visible text, or because every declared resource must remain
 * available to a later exact proof.
 */
export interface FutureInfluenceAnalysis {
  /** Scenes reachable through all potentially available authored choices. */
  readonly reachableScenes: readonly string[];
  /** Choice IDs in the same potential closure, excluding permanently pruned choices. */
  readonly reachableChoices: readonly string[];
  /** Resources read by reachable choice conditions or written by their effects. */
  readonly activeResources: readonly string[];
  /** Declared resources that are not read or written by the reachable closure. */
  readonly conservedResources: readonly string[];
  /** Flags read by reachable choice conditions, written by effects, or used to prune. */
  readonly activeFlags: readonly string[];
  /** Flags read only by text in the reachable closure and outside activeFlags. */
  readonly conservedFlags: readonly string[];
  /** Monotone false-gate flags that caused a choice to be pruned at this state. */
  readonly pruningJustifiers: readonly string[];
}

interface ScenarioIndex {
  readonly scenesById: ReadonlyMap<string, Scenario["scenes"][number]>;
  readonly choicesByScene: ReadonlyMap<string, readonly Scenario["choices"][number][]>;
  readonly resources: readonly string[];
  readonly clocksById: ReadonlyMap<string, string>;
  readonly monotoneFlags: ReadonlySet<string>;
  /**
   * Monotone false-gate flags in each static scene closure.  The analyzer's
   * cache only needs the current values of these flags; every other current
   * flag is irrelevant to the conservative closure.
   */
  readonly phaseFlagsByScene: ReadonlyMap<string, readonly string[]>;
}

/** A compiled future-influence analyzer for one detached Scenario snapshot. */
export interface FutureInfluenceAnalyzer {
  (state: FutureInfluenceState): FutureInfluenceAnalysis;
}

/**
 * Analyze the future influence of a validated Scenario without importing the
 * runtime engine or audit projection. Closure traversal is conservative for
 * every condition except a currently true flag that is globally never written
 * false: such a choice can never become legal again and is permanently
 * omitted. Future writes are recorded, but never used to speculate that a
 * currently false gate will become true during this closure.
 */
export function analyzeFutureInfluence(
  scenario: Scenario,
  state: FutureInfluenceState,
): FutureInfluenceAnalysis {
  return createFutureInfluenceAnalyzer(scenario)(state);
}

/**
 * Compile the static Scenario index once and analyze many current states.
 *
 * The input is copied and deeply frozen before indexing.  The returned
 * function therefore cannot be invalidated by a caller changing the Scenario
 * object after compilation.  Results are cached only on the current scene,
 * terminal/playing status, and values of monotone false-gate flags that can
 * affect that scene's conservative closure.
 */
export function createFutureInfluenceAnalyzer(scenario: Scenario): FutureInfluenceAnalyzer {
  const snapshot = snapshotScenario(scenario);
  const index = indexScenario(snapshot);
  const cache = new Map<string, FutureInfluenceAnalysis>();

  return (state: FutureInfluenceState): FutureInfluenceAnalysis => {
    if (!index.scenesById.has(state.scene)) {
      throw new Error(`Future influence cannot analyze unknown scene ${JSON.stringify(state.scene)}`);
    }
    assertState(state);

    const key = cacheKey(index, state);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const result = analyzeIndexedScenario(index, state);
    const immutable = freezeAnalysis(result);
    cache.set(key, immutable);
    return immutable;
  };
}

function analyzeIndexedScenario(
  index: ScenarioIndex,
  state: FutureInfluenceState,
): FutureInfluenceAnalysis {
  if (!index.scenesById.has(state.scene)) {
    throw new Error(`Future influence cannot analyze unknown scene ${JSON.stringify(state.scene)}`);
  }

  const textFlags = new Set<string>();
  const activeFlags = new Set<string>();
  const activeResources = new Set<string>();
  const pruningJustifiers = new Set<string>();
  const reachableChoices = new Set<string>();

  if (state.status !== "playing") {
    const scene = index.scenesById.get(state.scene)!;
    for (const line of scene.text) addFlagReads(line.when, textFlags);
    return finish(
      index.resources,
      [state.scene],
      reachableChoices,
      activeResources,
      activeFlags,
      textFlags,
      pruningJustifiers,
    );
  }

  const reachableScenes = new Set<string>([state.scene]);
  const pendingScenes = [state.scene];
  for (let indexInQueue = 0; indexInQueue < pendingScenes.length; indexInQueue++) {
    const sceneId = pendingScenes[indexInQueue]!;
    const scene = index.scenesById.get(sceneId);
    if (scene === undefined) {
      // The scenario index checks every authored destination, but retaining a
      // guard here keeps the helper fail closed if a caller mutates a typed
      // object after validation.
      throw new Error(`Future influence encountered unknown scene ${JSON.stringify(sceneId)}`);
    }
    for (const line of scene.text) addFlagReads(line.when, textFlags);

    for (const choice of index.choicesByScene.get(sceneId) ?? []) {
      const justifiers = pruningJustifiersFor(choice.when, state.flags, index.monotoneFlags);
      if (justifiers.length > 0) {
        for (const flag of justifiers) {
          pruningJustifiers.add(flag);
          activeFlags.add(flag);
        }
        continue;
      }

      reachableChoices.add(choice.id);
      addConditionInfluence(choice.when, activeResources, activeFlags, index.resources);
      for (const effect of choice.effects) {
        addEffectInfluence(effect, activeResources, activeFlags, index);
        if (effect.type !== "goTo") continue;
        if (!reachableScenes.has(effect.scene)) {
          reachableScenes.add(effect.scene);
          pendingScenes.push(effect.scene);
        }
      }
    }
  }

  return finish(
    index.resources,
    [...reachableScenes].sort(),
    reachableChoices,
    activeResources,
    activeFlags,
    textFlags,
    pruningJustifiers,
  );
}

function cacheKey(index: ScenarioIndex, state: FutureInfluenceState): string {
  if (state.status !== "playing") return JSON.stringify([state.status, state.scene]);
  const phaseFlags = index.phaseFlagsByScene.get(state.scene) ?? [];
  const mask = phaseFlags.map((flag) => currentFlagIsTrue(state.flags, flag) ? "1" : "0").join("");
  return JSON.stringify([state.status, state.scene, mask]);
}

function currentFlagIsTrue(flags: Readonly<Record<string, boolean>>, flag: string): boolean {
  return Object.hasOwn(flags, flag) && flags[flag] === true;
}

function finish(
  resources: readonly string[],
  reachableScenes: readonly string[],
  reachableChoices: ReadonlySet<string>,
  activeResources: ReadonlySet<string>,
  activeFlags: ReadonlySet<string>,
  textFlags: ReadonlySet<string>,
  pruningJustifiers: ReadonlySet<string>,
): FutureInfluenceAnalysis {
  const sortedActiveFlags = [...activeFlags].sort();
  const activeFlagSet = new Set(sortedActiveFlags);
  return {
    reachableScenes: [...reachableScenes].sort(),
    reachableChoices: [...reachableChoices].sort(),
    activeResources: [...activeResources].sort(),
    conservedResources: resources.filter((resource) => !activeResources.has(resource)),
    activeFlags: sortedActiveFlags,
    conservedFlags: [...textFlags].filter((flag) => !activeFlagSet.has(flag)).sort(),
    pruningJustifiers: [...pruningJustifiers].sort(),
  };
}

function freezeAnalysis(analysis: FutureInfluenceAnalysis): FutureInfluenceAnalysis {
  return Object.freeze({
    reachableScenes: Object.freeze([...analysis.reachableScenes]),
    reachableChoices: Object.freeze([...analysis.reachableChoices]),
    activeResources: Object.freeze([...analysis.activeResources]),
    conservedResources: Object.freeze([...analysis.conservedResources]),
    activeFlags: Object.freeze([...analysis.activeFlags]),
    conservedFlags: Object.freeze([...analysis.conservedFlags]),
    pruningJustifiers: Object.freeze([...analysis.pruningJustifiers]),
  });
}

function snapshotScenario(scenario: Scenario): Scenario {
  const snapshot: Scenario = {
    version: scenario.version,
    initialScene: scenario.initialScene,
    initialResources: Object.fromEntries(Object.entries(scenario.initialResources)),
    initialFacts: [...scenario.initialFacts],
    ...(scenario.clocks === undefined
      ? {}
      : { clocks: scenario.clocks.map((clock) => ({ ...clock })) }),
    scenes: scenario.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      text: scene.text.map((line) => ({
        text: line.text,
        ...(line.when === undefined
          ? {}
          : { when: line.when.map((condition) => ({ ...condition })) }),
      })),
    })),
    choices: scenario.choices.map((choice) => ({
      id: choice.id,
      scene: choice.scene,
      label: choice.label,
      description: choice.description,
      ...(choice.when === undefined
        ? {}
        : { when: choice.when.map((condition) => ({ ...condition })) }),
      effects: choice.effects.map((effect) => ({ ...effect })),
      ...(choice.outcome === undefined ? {} : { outcome: { ...choice.outcome } }),
    })),
  };
  return deepFreeze(snapshot);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function indexScenario(scenario: Scenario): ScenarioIndex {
  const resources = Object.keys(scenario.initialResources).sort();
  const resourceSet = new Set(resources);

  const scenesById = new Map<string, Scenario["scenes"][number]>();
  for (const scene of scenario.scenes) {
    if (scenesById.has(scene.id)) throw new Error(`Future influence found duplicate scene ${JSON.stringify(scene.id)}`);
    scenesById.set(scene.id, scene);
    for (const line of scene.text) assertKnownConditions(line.when, resourceSet);
  }
  if (!scenesById.has(scenario.initialScene)) {
    throw new Error(`Future influence found unknown initial scene ${JSON.stringify(scenario.initialScene)}`);
  }

  const clocksById = new Map<string, string>();
  for (const clock of scenario.clocks ?? []) {
    if (clocksById.has(clock.id)) throw new Error(`Future influence found duplicate clock ${JSON.stringify(clock.id)}`);
    if (!resourceSet.has(clock.resource)) {
      throw new Error(`Future influence found unknown clock resource ${JSON.stringify(clock.resource)}`);
    }
    clocksById.set(clock.id, clock.resource);
  }

  const choicesByScene = new Map<string, Scenario["choices"][number][]>();
  const choiceIds = new Set<string>();
  const flagWrites = new Map<string, Set<boolean>>();
  const seenFlags = new Set<string>();
  for (const choice of scenario.choices) {
    if (choiceIds.has(choice.id)) throw new Error(`Future influence found duplicate choice ${JSON.stringify(choice.id)}`);
    choiceIds.add(choice.id);
    if (!scenesById.has(choice.scene)) {
      throw new Error(`Future influence found choice ${JSON.stringify(choice.id)} in unknown scene ${JSON.stringify(choice.scene)}`);
    }
    assertKnownConditions(choice.when, resourceSet, seenFlags);
    const sceneChoices = choicesByScene.get(choice.scene);
    if (sceneChoices === undefined) choicesByScene.set(choice.scene, [choice]);
    else sceneChoices.push(choice);
    for (const effect of choice.effects) {
      assertKnownEffect(effect, resourceSet, scenesById, clocksById, seenFlags);
      if (effect.type !== "setFlag") continue;
      const values = flagWrites.get(effect.flag);
      if (values === undefined) flagWrites.set(effect.flag, new Set([effect.value]));
      else values.add(effect.value);
      seenFlags.add(effect.flag);
    }
  }

  const monotoneFlags = new Set<string>();
  for (const flag of seenFlags) {
    const writes = flagWrites.get(flag);
    // Match the active audit's conservative rule: at least one authored
    // write, and every such write sets the flag true.
    if (writes !== undefined && [...writes].every((value) => value === true)) monotoneFlags.add(flag);
  }

  const phaseFlagsByScene = new Map<string, readonly string[]>();
  for (const sceneId of scenesById.keys()) {
    const reachableScenes = staticSceneClosure(sceneId, choicesByScene);
    const phaseFlags = new Set<string>();
    for (const reachableScene of reachableScenes) {
      for (const choice of choicesByScene.get(reachableScene) ?? []) {
        for (const condition of choice.when ?? []) {
          if (condition.type === "flag"
            && condition.value === false
            && monotoneFlags.has(condition.flag)) {
            phaseFlags.add(condition.flag);
          }
        }
      }
    }
    phaseFlagsByScene.set(sceneId, Object.freeze([...phaseFlags].sort()));
  }

  return {
    scenesById,
    choicesByScene,
    resources,
    clocksById,
    monotoneFlags,
    phaseFlagsByScene,
  };
}

function staticSceneClosure(
  initialScene: string,
  choicesByScene: ReadonlyMap<string, readonly Scenario["choices"][number][]>,
): ReadonlySet<string> {
  const reachable = new Set<string>([initialScene]);
  const pending = [initialScene];
  for (let index = 0; index < pending.length; index++) {
    const sceneId = pending[index]!;
    for (const choice of choicesByScene.get(sceneId) ?? []) {
      for (const effect of choice.effects) {
        if (effect.type !== "goTo" || reachable.has(effect.scene)) continue;
        reachable.add(effect.scene);
        pending.push(effect.scene);
      }
    }
  }
  return reachable;
}

function assertState(state: FutureInfluenceState): void {
  if (state.status !== "playing"
    && state.status !== "completed"
    && state.status !== "departed"
    && state.status !== "dead") {
    throw new Error(`Future influence cannot analyze unknown status ${JSON.stringify(state.status)}`);
  }
  if (typeof state.flags !== "object" || state.flags === null || Array.isArray(state.flags)) {
    throw new Error("Future influence found an invalid current flag map");
  }
  for (const [flag, value] of Object.entries(state.flags)) {
    if (typeof value !== "boolean") {
      throw new Error(`Future influence found non-boolean current flag ${JSON.stringify(flag)}`);
    }
  }
}

function pruningJustifiersFor(
  conditions: readonly Condition[] | undefined,
  flags: Readonly<Record<string, boolean>>,
  monotoneFlags: ReadonlySet<string>,
): string[] {
  const justifiers: string[] = [];
  for (const condition of conditions ?? []) {
    if (condition.type === "flag"
      && condition.value === false
      && monotoneFlags.has(condition.flag)
      && Object.hasOwn(flags, condition.flag)
      && flags[condition.flag] === true) {
      justifiers.push(condition.flag);
    }
  }
  return justifiers;
}

function addConditionInfluence(
  conditions: readonly Condition[] | undefined,
  resources: Set<string>,
  flags: Set<string>,
  knownResources: readonly string[],
): void {
  const resourceSet = new Set(knownResources);
  for (const condition of conditions ?? []) {
    if (condition.type === "flag") flags.add(condition.flag);
    else if (resourceSet.has(condition.resource)) resources.add(condition.resource);
    else throw new Error(`Future influence encountered unknown resource ${JSON.stringify(condition.resource)}`);
  }
}

function addFlagReads(conditions: readonly Condition[] | undefined, target: Set<string>): void {
  for (const condition of conditions ?? []) if (condition.type === "flag") target.add(condition.flag);
}

function addEffectInfluence(
  effect: Effect,
  resources: Set<string>,
  flags: Set<string>,
  index: ScenarioIndex,
): void {
  if (effect.type === "setFlag") {
    flags.add(effect.flag);
  } else if (effect.type === "setResource" || effect.type === "adjustResource") {
    resources.add(effect.resource);
  } else if (effect.type === "advanceClock") {
    const resource = index.clocksById.get(effect.clock);
    if (resource === undefined) throw new Error(`Future influence encountered unknown clock ${JSON.stringify(effect.clock)}`);
    resources.add(resource);
  }
}

function assertKnownConditions(
  conditions: readonly Condition[] | undefined,
  resources: ReadonlySet<string>,
  flags = new Set<string>(),
): void {
  for (const condition of conditions ?? []) {
    switch (condition.type) {
      case "flag":
        flags.add(condition.flag);
        break;
      case "resourceAtLeast":
      case "resourceAtMost":
        if (!resources.has(condition.resource)) {
          throw new Error(`Future influence found unknown resource ${JSON.stringify(condition.resource)} in condition`);
        }
        break;
      default:
        throw new Error("Future influence cannot analyze unknown condition type");
    }
  }
}

function assertKnownEffect(
  effect: Effect,
  resources: ReadonlySet<string>,
  scenes: ReadonlyMap<string, Scenario["scenes"][number]>,
  clocks: ReadonlyMap<string, string>,
  flags: Set<string>,
): void {
  switch (effect.type) {
    case "setFlag":
      flags.add(effect.flag);
      return;
    case "setResource":
    case "adjustResource":
      if (!resources.has(effect.resource)) {
        throw new Error(`Future influence found unknown resource ${JSON.stringify(effect.resource)} in effect`);
      }
      return;
    case "advanceClock":
      if (!clocks.has(effect.clock)) {
        throw new Error(`Future influence found unknown clock ${JSON.stringify(effect.clock)} in effect`);
      }
      return;
    case "goTo":
      if (!scenes.has(effect.scene)) {
        throw new Error(`Future influence found unknown destination ${JSON.stringify(effect.scene)}`);
      }
      return;
    case "addFact":
      return;
    default:
      throw new Error("Future influence cannot analyze unknown effect type");
  }
}
