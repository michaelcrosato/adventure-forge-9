import { isDeepStrictEqual } from "node:util";
import { SymbolicModel, type SymbolicChoice } from "./symbolic-model.js";

/** The exact per-choice failure seeds checked by the split property proof. */
export type FailureKind =
  | "arithmetic-error"
  | "bound-exit"
  | "invalid-success"
  | "uncovered-enabled";

/** The exact obligations checked by the split property proof. */
export type ObligationKind = "non-completion" | FailureKind | "failure-union";

/** Metadata for an original per-choice failure seed in combined mode. */
export interface FailureSeedSummary {
  readonly id: string;
  readonly kind: FailureKind;
  readonly choiceId: string;
  readonly seedZero: boolean;
}

/** A serializable summary of one independently solved bad-state seed. */
export interface ObligationSummary {
  readonly id: string;
  readonly kind: ObligationKind;
  /** Present only for a scene-partitioned non-completion obligation. */
  readonly sceneId?: string;
  readonly choiceId?: string;
  readonly rounds: number;
  readonly nodes: number;
  readonly seedZero: boolean;
  readonly initialInBad: boolean;
  /** Present only when obligation-local compaction was enabled. */
  readonly compactions?: number;
}

export type ObligationProgress =
  | {
      readonly phase: "completion" | "completion-or-failure" | "obligation";
      readonly id?: string;
      readonly round: number;
      readonly nodes: number;
      readonly fixed: boolean;
    }
  | {
      readonly phase: "completion-compact" | "completion-or-failure-compact";
      readonly round: number;
      readonly nodes: number;
      /** Node count owned by the previous fixed-point manager during compaction. */
      readonly previousNodes: number;
      readonly fixed: false;
    }
  | {
      readonly phase: "obligation-compact";
      readonly id: string;
      /** Present when copying within a reverse choice sweep. */
      readonly choiceId?: string;
      readonly round: number;
      readonly nodes: number;
      /** Node count owned by the previous obligation manager during compaction. */
      readonly previousNodes: number;
      readonly fixed: false;
    };

export interface SymbolicObligationOptions {
  /** Maximum number of predecessor applications for every fixed point. */
  readonly roundLimit?: number;
  /** Whether to absorb failure-reachable states from the global seed. */
  readonly nonCompletionMode?: "direct" | "failure-absorbed";
  /**
   * Partition the non-completion seed by its source scene. Global is the
   * default and preserves the original single-obligation shape.
   */
  readonly nonCompletionPartition?: "global" | "scene";
  /**
   * Solve each choice's four failure seeds independently (the default), or
   * solve their exact union as one cone. Combined mode retains seed metadata
   * but does not claim to compute a separate closure for each choice.
   */
  readonly failurePartition?: "choice" | "combined";
  /**
   * Replace the completion and (in absorbed mode) completion-or-failure
   * manager every N nonfixed rounds. Zero disables fixed-point compaction and
   * preserves the default owner and result shape.
   */
  readonly fixedPointCompactEvery?: number;
  /**
   * Replace each nonzero obligation manager every N nonfixed rounds. Zero
   * disables obligation-local compaction and preserves the default shape.
   */
  readonly obligationCompactEvery?: number;
  /**
   * Opt into reverse in-place obligation sweeps, copying live roots between
   * choices when the manager grows to this node count. Zero disables this
   * strategy. The model's node limit remains an independent hard guard.
   */
  readonly obligationChoiceCompactAt?: number;
  /**
   * With choice sweeps enabled, require this many new nodes after each fresh
   * copy before the next between-choice copy. Zero preserves the absolute
   * threshold. The model's hard node limit is never changed by this option.
   */
  readonly obligationChoiceCompactInterval?: number;
  readonly onProgress?: (progress: ObligationProgress) => void;
  /** Observe each obligation while its roots still belong to its fresh model. */
  readonly onObligation?: (value: {
    readonly model: SymbolicModel;
    readonly seed: number;
    readonly bad: number;
    readonly summary: ObligationSummary;
  }) => void;
}

export interface CompletionSafetyByObligationResult {
  /**
   * Owner of every numeric root returned by this result. With the default
   * fixedPointCompactEvery=0 this is the supplied model; opt-in compaction
   * returns the final fresh owner used by the fixed-point proof.
   */
  readonly model: SymbolicModel;
  /** States with an existential authored route to a completed terminal. */
  readonly completable: number;
  readonly completionRounds: number;
  /** Existential completion-or-failure closure, not strong completion; absorbed mode only. */
  readonly completionOrFailure?: number;
  /** Predecessor rounds starting from the already-computed C union failure seeds. */
  readonly completionOrFailureRounds?: number;
  /** Per-round C copies when enabled; excludes the initial fresh handoff. */
  readonly completionCompactions?: number;
  /** Per-round W copies; present only with fixed-point compaction and absorption. */
  readonly completionOrFailureCompactions?: number;
  /** True when the original initial projection is in any obligation closure. */
  readonly initialInBad: boolean;
  readonly obligations: readonly ObligationSummary[];
  /** Present only in combined failure mode; contains no owned BDD roots. */
  readonly failureSeeds?: readonly FailureSeedSummary[];
  readonly complete: true;
}

const DEFAULT_ROUND_LIMIT = 10_000;

type CurrentRoot = number;

interface FixedPoint {
  readonly root: CurrentRoot;
  readonly rounds: number;
}

interface StaticAnchors {
  readonly validDomain: CurrentRoot;
  readonly initial: CurrentRoot;
  readonly playing: CurrentRoot;
  readonly completed: CurrentRoot;
}

interface SeedSpec {
  readonly id: string;
  readonly kind: ObligationKind;
  readonly sceneId?: string;
  readonly choiceId?: string;
  readonly seed: CurrentRoot;
}

interface FailureSeedSpec extends SeedSpec {
  readonly kind: FailureKind;
  readonly choiceId: string;
}

function assertEquivalentFreshModel(original: SymbolicModel, fresh: SymbolicModel): void {
  if (!(fresh instanceof SymbolicModel)) {
    throw new Error("Symbolic fresh() must return a SymbolicModel");
  }
  if (fresh === original || fresh.bdd === original.bdd) {
    throw new Error("Symbolic fresh() must return a distinct model and BDD manager");
  }
  if (!isDeepStrictEqual(fresh.fieldOrder, original.fieldOrder)) {
    throw new Error("Fresh symbolic model fieldOrder does not match the original");
  }
  if (!isDeepStrictEqual(fresh.currentVariables, original.currentVariables)) {
    throw new Error("Fresh symbolic model currentVariables do not match the original");
  }
  if (!isDeepStrictEqual(fresh.nextVariables, original.nextVariables)) {
    throw new Error("Fresh symbolic model nextVariables do not match the original");
  }
  if (!isDeepStrictEqual(fresh.scenario, original.scenario)) {
    throw new Error("Fresh symbolic model scenario does not match the original");
  }
  if (!isDeepStrictEqual(fresh.transitionMode, original.transitionMode)) {
    throw new Error("Fresh symbolic model transitionMode does not match the original");
  }
}

function snapshotOptions(options: SymbolicObligationOptions | undefined): {
  readonly roundLimit: number;
  readonly nonCompletionMode: "direct" | "failure-absorbed";
  readonly nonCompletionPartition: "global" | "scene";
  readonly failurePartition: "choice" | "combined";
  readonly fixedPointCompactEvery: number;
  readonly obligationCompactEvery: number;
  readonly obligationChoiceCompactAt: number;
  readonly obligationChoiceCompactInterval: number;
  readonly onProgress: ((progress: ObligationProgress) => void) | undefined;
  readonly onObligation: ((value: {
    readonly model: SymbolicModel;
    readonly seed: number;
    readonly bad: number;
    readonly summary: ObligationSummary;
  }) => void) | undefined;
} {
  if (options === undefined) {
    return Object.freeze({
      roundLimit: DEFAULT_ROUND_LIMIT,
      nonCompletionMode: "direct" as const,
      nonCompletionPartition: "global" as const,
      failurePartition: "choice" as const,
      fixedPointCompactEvery: 0,
      obligationCompactEvery: 0,
      obligationChoiceCompactAt: 0,
      obligationChoiceCompactInterval: 0,
      onProgress: undefined,
      onObligation: undefined,
    });
  }
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  // Read each option exactly once. Besides making the snapshot explicit, this
  // prevents an accessor from changing the proof configuration mid-run.
  const requestedRoundLimit = options.roundLimit;
  const requestedNonCompletionMode = options.nonCompletionMode;
  const requestedNonCompletionPartition = options.nonCompletionPartition;
  const requestedFailurePartition = options.failurePartition;
  const requestedFixedPointCompactEvery = options.fixedPointCompactEvery;
  const requestedObligationCompactEvery = options.obligationCompactEvery;
  const requestedObligationChoiceCompactAt = options.obligationChoiceCompactAt;
  const requestedObligationChoiceCompactInterval = options.obligationChoiceCompactInterval;
  const onProgress = options.onProgress;
  const onObligation = options.onObligation;
  const roundLimit = requestedRoundLimit === undefined ? DEFAULT_ROUND_LIMIT : requestedRoundLimit;
  const nonCompletionMode = requestedNonCompletionMode === undefined ? "direct" : requestedNonCompletionMode;
  const nonCompletionPartition = requestedNonCompletionPartition === undefined ? "global" : requestedNonCompletionPartition;
  const failurePartition = requestedFailurePartition === undefined ? "choice" : requestedFailurePartition;
  const fixedPointCompactEvery = requestedFixedPointCompactEvery === undefined ? 0 : requestedFixedPointCompactEvery;
  const obligationCompactEvery = requestedObligationCompactEvery === undefined ? 0 : requestedObligationCompactEvery;
  const obligationChoiceCompactAt = requestedObligationChoiceCompactAt === undefined ? 0 : requestedObligationChoiceCompactAt;
  const obligationChoiceCompactInterval = requestedObligationChoiceCompactInterval === undefined ? 0 : requestedObligationChoiceCompactInterval;
  if (!Number.isSafeInteger(roundLimit) || roundLimit < 1) {
    throw new RangeError("roundLimit must be a positive safe integer");
  }
  if (nonCompletionMode !== "direct" && nonCompletionMode !== "failure-absorbed") {
    throw new RangeError("nonCompletionMode must be \"direct\" or \"failure-absorbed\"");
  }
  if (nonCompletionPartition !== "global" && nonCompletionPartition !== "scene") {
    throw new RangeError("nonCompletionPartition must be \"global\" or \"scene\"");
  }
  if (failurePartition !== "choice" && failurePartition !== "combined") {
    throw new RangeError("failurePartition must be \"choice\" or \"combined\"");
  }
  if (!Number.isSafeInteger(fixedPointCompactEvery) || fixedPointCompactEvery < 0) {
    throw new RangeError("fixedPointCompactEvery must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(obligationCompactEvery) || obligationCompactEvery < 0) {
    throw new RangeError("obligationCompactEvery must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(obligationChoiceCompactAt) || obligationChoiceCompactAt < 0) {
    throw new RangeError("obligationChoiceCompactAt must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(obligationChoiceCompactInterval) || obligationChoiceCompactInterval < 0) {
    throw new RangeError("obligationChoiceCompactInterval must be a non-negative safe integer");
  }
  if (obligationChoiceCompactInterval > 0 && obligationChoiceCompactAt === 0) {
    throw new RangeError("obligationChoiceCompactInterval requires obligationChoiceCompactAt > 0");
  }
  if (onProgress !== undefined && typeof onProgress !== "function") {
    throw new TypeError("onProgress must be a function");
  }
  if (onObligation !== undefined && typeof onObligation !== "function") {
    throw new TypeError("onObligation must be a function");
  }
  return Object.freeze({
    roundLimit,
    nonCompletionMode,
    nonCompletionPartition,
    failurePartition,
    fixedPointCompactEvery,
    obligationCompactEvery,
    obligationChoiceCompactAt,
    obligationChoiceCompactInterval,
    onProgress,
    onObligation,
  });
}

/**
 * Split the backward safety proof into independent bad-state obligations.
 *
 * Completion is existential: C is the least fixed point of completed states
 * and their authored predecessors. Each bad seed is then closed under the
 * same predecessor relation. The seed closures are solved in fresh managers
 * so a large union does not keep every obligation's intermediate BDD nodes
 * alive in one append-only manager. The optional failure-absorbed mode first
 * removes states that can already reach either completion or an explicit
 * failure seed from the global non-completion seed; it leaves C and every
 * separate failure obligation intact.
 *
 * In scene-partitioned mode the non-completion seed N is split into disjoint
 * N_s = N & atScene(s) for every authored scene, and each cone still uses all
 * authored choices as predecessors. The exact distributive identity
 * Pre*(union_s N_s) = union_s Pre*(N_s) makes this equivalent to one global
 * non-completion obligation; the partition is only a workload decomposition.
 *
 * When obligation-local compaction is enabled, only a nonzero obligation's
 * current closure, seed, and static identity anchors are copied into a fresh
 * equivalent manager after each configured number of nonfixed rounds. The
 * canonical fixed-point comparison happens before that copy; compaction
 * changes ownership and allocation history, never the predecessor relation.
 *
 * Combined failure mode solves Pre*(union_i F_i) once. Distributivity makes
 * this exactly the union of the separate failure closures for initial-state
 * safety, including overlapping and zero seeds. Original seed metadata is
 * retained, but a combined failure does not identify an offending choice or
 * claim that each individual failure closure was computed.
 *
 * Fixed-point compaction also copies C and W after configured nonfixed rounds.
 * It first hands construction roots to a fresh owner, then preserves C, W,
 * every live original failure seed and all static anchors at each handoff.
 * Returned numeric roots belong to result.model, the final active owner.
 */
export function proveCompletionSafetyByObligation(
  model: SymbolicModel,
  options?: SymbolicObligationOptions,
): CompletionSafetyByObligationResult {
  if (!(model instanceof SymbolicModel)) throw new TypeError("model must be a SymbolicModel");
  const snapshot = snapshotOptions(options);
  const currentFor = (owner: SymbolicModel, root: number, label: string): CurrentRoot => {
    if (owner.bdd.exists(root, owner.nextVariables) !== root) {
      throw new Error(`${label} must be a current-only symbolic root`);
    }
    return root;
  };

  let activeModel = model;
  let activeBdd = activeModel.bdd;
  const current = (root: CurrentRoot, label: string): CurrentRoot => currentFor(activeModel, root, label);
  const readAnchors = (owner: SymbolicModel, label: string): StaticAnchors => {
    // Preserve the original validation/read order for the default path.
    const validDomain = currentFor(owner, owner.validDomain, `${label}.validDomain`);
    const playing = currentFor(owner, owner.playing, `${label}.playing`);
    const completed = currentFor(owner, owner.completed, `${label}.completed`);
    const initial = currentFor(owner, owner.initial, `${label}.initial`);
    return Object.freeze({ validDomain, initial, playing, completed });
  };

  let staticAnchors = readAnchors(activeModel, "model");
  let invalidDomain = currentFor(activeModel, activeBdd.not(staticAnchors.validDomain), "invalidDomain");
  if (activeBdd.and(staticAnchors.initial, invalidDomain) !== 0) {
    throw new Error("Symbolic initial state is outside the valid domain");
  }

  const progress = (
    event: ObligationProgress,
    callback: ((progress: ObligationProgress) => void) | undefined,
  ): void => {
    callback?.(Object.freeze(event));
  };

  interface FixedPointBundle {
    readonly model: SymbolicModel;
    readonly anchors: StaticAnchors;
    readonly completion: CurrentRoot;
    readonly closure?: CurrentRoot;
    readonly failureSeed?: CurrentRoot;
    readonly choiceSeeds?: readonly FailureSeedSpec[];
  }

  /** Copy all live fixed-point roots atomically to a fresh equivalent owner. */
  const copyFixedPointBundle = (
    source: SymbolicModel,
    roots: {
      readonly completion: CurrentRoot;
      readonly anchors: StaticAnchors;
      readonly closure?: CurrentRoot;
      readonly failureSeed?: CurrentRoot;
      readonly choiceSeeds?: readonly FailureSeedSpec[];
    },
    label: string,
  ): FixedPointBundle => {
    const sourceCompletion = currentFor(source, roots.completion, `${label} source completion`);
    const sourceClosure = roots.closure === undefined
      ? undefined
      : currentFor(source, roots.closure, `${label} source closure`);
    const sourceFailureSeed = roots.failureSeed === undefined
      ? undefined
      : currentFor(source, roots.failureSeed, `${label} source failure seed`);
    const sourceChoiceSeeds = roots.choiceSeeds?.map((spec, index) => Object.freeze({
      ...spec,
      seed: currentFor(source, spec.seed, `${label} source choice seed ${index}`),
    }));
    const sourceAnchors: StaticAnchors = Object.freeze({
      validDomain: currentFor(source, roots.anchors.validDomain, `${label} source validDomain`),
      initial: currentFor(source, roots.anchors.initial, `${label} source initial`),
      playing: currentFor(source, roots.anchors.playing, `${label} source playing`),
      completed: currentFor(source, roots.anchors.completed, `${label} source completed`),
    });
    if (sourceAnchors.validDomain !== source.validDomain
      || sourceAnchors.initial !== source.initial
      || sourceAnchors.playing !== source.playing
      || sourceAnchors.completed !== source.completed) {
      throw new Error(`${label} source static roots do not match its model`);
    }
    if (sourceChoiceSeeds !== undefined && sourceFailureSeed === undefined) {
      throw new Error(`${label} choice seeds require a failure seed root`);
    }

    const forest: CurrentRoot[] = [];
    const completionIndex = forest.length;
    forest.push(sourceCompletion);
    const closureIndex = sourceClosure === undefined ? undefined : forest.length;
    if (sourceClosure !== undefined) forest.push(sourceClosure);
    const failureSeedIndex = sourceFailureSeed === undefined ? undefined : forest.length;
    if (sourceFailureSeed !== undefined) forest.push(sourceFailureSeed);
    const choiceSeedIndexes = sourceChoiceSeeds?.map(spec => {
      const index = forest.length;
      forest.push(spec.seed);
      return index;
    });
    const anchorIndexes = {
      validDomain: forest.length,
      initial: forest.length + 1,
      playing: forest.length + 2,
      completed: forest.length + 3,
    };
    forest.push(sourceAnchors.validDomain, sourceAnchors.initial, sourceAnchors.playing, sourceAnchors.completed);

    const fresh = source.fresh();
    assertEquivalentFreshModel(source, fresh);
    const copied = source.bdd.copyForestTo(fresh.bdd, forest);
    if (copied.length !== forest.length || copied.some(root => root === undefined)) {
      throw new Error(`${label} failed to copy the complete fixed-point root bundle`);
    }
    const copiedCompletion = currentFor(fresh, copied[completionIndex]!, `${label} copied completion`);
    const copiedClosure = closureIndex === undefined
      ? undefined
      : currentFor(fresh, copied[closureIndex]!, `${label} copied closure`);
    const copiedFailureSeed = failureSeedIndex === undefined
      ? undefined
      : currentFor(fresh, copied[failureSeedIndex]!, `${label} copied failure seed`);
    const copiedChoiceSeeds = sourceChoiceSeeds === undefined
      ? undefined
      : Object.freeze(sourceChoiceSeeds.map((spec, index) => Object.freeze({
        ...spec,
        seed: currentFor(fresh, copied[choiceSeedIndexes![index]!]!, `${label} copied choice seed ${index}`),
      })));
    const copiedAnchors: StaticAnchors = Object.freeze({
      validDomain: currentFor(fresh, copied[anchorIndexes.validDomain]!, `${label} copied validDomain`),
      initial: currentFor(fresh, copied[anchorIndexes.initial]!, `${label} copied initial`),
      playing: currentFor(fresh, copied[anchorIndexes.playing]!, `${label} copied playing`),
      completed: currentFor(fresh, copied[anchorIndexes.completed]!, `${label} copied completed`),
    });
    const freshAnchors = readAnchors(fresh, `${label} fresh model`);
    if (copiedAnchors.validDomain !== freshAnchors.validDomain
      || copiedAnchors.initial !== freshAnchors.initial
      || copiedAnchors.playing !== freshAnchors.playing
      || copiedAnchors.completed !== freshAnchors.completed) {
      throw new Error(`${label} fresh static roots do not match its model`);
    }
    return Object.freeze({
      model: fresh,
      anchors: copiedAnchors,
      completion: copiedCompletion,
      ...(copiedClosure === undefined ? {} : { closure: copiedClosure }),
      ...(copiedFailureSeed === undefined ? {} : { failureSeed: copiedFailureSeed }),
      ...(copiedChoiceSeeds === undefined ? {} : { choiceSeeds: copiedChoiceSeeds }),
    });
  };

  let completionRoot: CurrentRoot = staticAnchors.completed;
  let completionCompactions = 0;
  if (snapshot.fixedPointCompactEvery > 0) {
    // This validated initial handoff is excluded from the per-round count.
    const handedOff = copyFixedPointBundle(activeModel, {
      completion: completionRoot,
      anchors: staticAnchors,
    }, "fixed-point initial handoff");
    activeModel = handedOff.model;
    activeBdd = activeModel.bdd;
    staticAnchors = handedOff.anchors;
    completionRoot = handedOff.completion;
    invalidDomain = currentFor(activeModel, activeBdd.not(staticAnchors.validDomain), "initial handoff invalidDomain");
    if (activeBdd.and(staticAnchors.initial, invalidDomain) !== 0) {
      throw new Error("Initial handoff state is outside the valid domain");
    }
  }

  const completionFixedPoint = (): FixedPoint => {
    let root = completionRoot;
    for (let round = 1; round <= snapshot.roundLimit; round++) {
      const predecessor = currentFor(activeModel, activeModel.preimage(root), "completion predecessor");
      const next = currentFor(activeModel, activeBdd.or(root, predecessor), "completion fixed-point candidate");
      const fixed = next === root;
      progress({ phase: "completion", round, nodes: activeBdd.stats().nodes, fixed }, snapshot.onProgress);
      if (fixed) {
        completionRoot = root;
        return Object.freeze({ root, rounds: round });
      }
      root = next;
      if (snapshot.fixedPointCompactEvery > 0 && round % snapshot.fixedPointCompactEvery === 0) {
        const previousNodes = activeBdd.stats().nodes;
        const compacted = copyFixedPointBundle(activeModel, {
          completion: root,
          anchors: staticAnchors,
        }, `completion compaction after round ${round}`);
        activeModel = compacted.model;
        activeBdd = activeModel.bdd;
        staticAnchors = compacted.anchors;
        completionRoot = compacted.completion;
        invalidDomain = currentFor(activeModel, activeBdd.not(staticAnchors.validDomain), "completion compaction invalidDomain");
        completionCompactions++;
        progress({
          phase: "completion-compact",
          round,
          nodes: activeBdd.stats().nodes,
          previousNodes,
          fixed: false,
        }, snapshot.onProgress);
        root = completionRoot;
      }
    }
    throw new Error(`completion fixed point not reached within round limit ${snapshot.roundLimit}`);
  };

  const completion = completionFixedPoint();
  const seeds: SeedSpec[] = [];

  const seedForChoice = (
    owner: SymbolicModel,
    anchors: StaticAnchors,
    ownerInvalidDomain: CurrentRoot,
    choice: SymbolicChoice,
  ): readonly FailureSeedSpec[] => {
    const ownerBdd = owner.bdd;
    const enabled = currentFor(owner, choice.enabled, `choice ${choice.id}.enabled`);
    const arithmeticError = currentFor(owner, choice.arithmeticError, `choice ${choice.id}.arithmeticError`);
    const boundExit = currentFor(owner, choice.boundExit, `choice ${choice.id}.boundExit`);
    const faults = currentFor(owner, ownerBdd.or(arithmeticError, boundExit), `choice ${choice.id}.faults`);
    const validSources = currentFor(
      owner,
      owner.preimage(anchors.validDomain, choice),
      `choice ${choice.id}.valid-success-sources`,
    );
    const invalidSources = currentFor(
      owner,
      owner.preimage(ownerInvalidDomain, choice),
      `choice ${choice.id}.invalid-success-sources`,
    );
    const uncovered = currentFor(
      owner,
      ownerBdd.and(enabled, ownerBdd.not(ownerBdd.or(faults, validSources))),
      `choice ${choice.id}.uncovered-enabled-sources`,
    );
    return Object.freeze([
      Object.freeze({ id: `arithmetic-error:${choice.id}`, kind: "arithmetic-error" as const, choiceId: choice.id, seed: arithmeticError }),
      Object.freeze({ id: `bound-exit:${choice.id}`, kind: "bound-exit" as const, choiceId: choice.id, seed: boundExit }),
      Object.freeze({ id: `invalid-success:${choice.id}`, kind: "invalid-success" as const, choiceId: choice.id, seed: invalidSources }),
      Object.freeze({ id: `uncovered-enabled:${choice.id}`, kind: "uncovered-enabled" as const, choiceId: choice.id, seed: uncovered }),
    ]);
  };

  /**
   * Build the exact union of all four failure seeds for every authored choice.
   * Every individual formula is still constructed. Its identity and emptiness
   * are retained as metadata; only the predecessor closures are grouped.
   */
  const combineFailureSeeds = (owner: SymbolicModel, choiceSeeds: readonly FailureSeedSpec[]): {
    readonly seed: CurrentRoot;
    readonly metadata: readonly FailureSeedSummary[];
  } => {
    const ownerBdd = owner.bdd;
    let seed: CurrentRoot = 0;
    for (const spec of choiceSeeds) {
      seed = currentFor(owner, ownerBdd.or(seed, spec.seed), "failure seed union");
    }
    const metadata = Object.freeze(choiceSeeds.map(spec => Object.freeze({
      id: spec.id,
      kind: spec.kind,
      choiceId: spec.choiceId,
      seedZero: spec.seed === 0,
    })));
    return Object.freeze({ seed, metadata });
  };

  /**
   * Compute W = Pre*(C ∪ F). Since C = Pre*(completed), this is exactly
   * Pre*(completed ∪ F); using C avoids rebuilding the already-proven
   * completion cone. W is an existential "can complete or reach failure"
   * predicate and is never used as the strong completion result. With
   * P = playing states and N = P \ C, replacing N by P \ W is exact because
   * Pre*((P \ C) ∪ F) = Pre*((P \ W) ∪ F): the removed states are already in
   * Pre*(F), whose predecessor closure is idempotent.
   */
  const completionOrFailureFixedPoint = (
    seed: CurrentRoot,
    failureSeed: CurrentRoot,
    choiceSeeds: readonly FailureSeedSpec[],
  ): {
    readonly fixedPoint: FixedPoint;
    readonly failureSeed: CurrentRoot;
    readonly choiceSeeds: readonly FailureSeedSpec[];
  } => {
    let root = current(seed, "completion-or-failure seed");
    let liveFailureSeed = current(failureSeed, "completion-or-failure failure seed");
    let liveChoiceSeeds = choiceSeeds;
    for (let round = 1; round <= snapshot.roundLimit; round++) {
      const predecessor = current(activeModel.preimage(root), "completion-or-failure predecessor");
      const next = current(activeBdd.or(root, predecessor), "completion-or-failure fixed-point candidate");
      const fixed = next === root;
      progress({ phase: "completion-or-failure", round, nodes: activeBdd.stats().nodes, fixed }, snapshot.onProgress);
      if (fixed) return Object.freeze({
        fixedPoint: Object.freeze({ root, rounds: round }),
        failureSeed: liveFailureSeed,
        choiceSeeds: liveChoiceSeeds,
      });
      root = next;
      if (snapshot.fixedPointCompactEvery > 0 && round % snapshot.fixedPointCompactEvery === 0) {
        const previousNodes = activeBdd.stats().nodes;
        const compacted = copyFixedPointBundle(activeModel, {
          completion: completionRoot,
          closure: root,
          failureSeed: liveFailureSeed,
          choiceSeeds: liveChoiceSeeds,
          anchors: staticAnchors,
        }, `completion-or-failure compaction after round ${round}`);
        activeModel = compacted.model;
        activeBdd = activeModel.bdd;
        staticAnchors = compacted.anchors;
        completionRoot = compacted.completion;
        root = compacted.closure!;
        liveFailureSeed = compacted.failureSeed!;
        liveChoiceSeeds = compacted.choiceSeeds!;
        invalidDomain = currentFor(activeModel, activeBdd.not(staticAnchors.validDomain), "completion-or-failure compaction invalidDomain");
        completionOrFailureCompactions++;
        progress({
          phase: "completion-or-failure-compact",
          round,
          nodes: activeBdd.stats().nodes,
          previousNodes,
          fixed: false,
        }, snapshot.onProgress);
      }
    }
    throw new Error(`completion-or-failure fixed point not reached within round limit ${snapshot.roundLimit}`);
  };

  let completionOrFailure: FixedPoint | undefined;
  let failureSeedMetadata: readonly FailureSeedSummary[] | undefined;
  let completionOrFailureCompactions = 0;
  const appendNonCompletionSeeds = (owner: SymbolicModel, seed: CurrentRoot): void => {
    const ownerBdd = owner.bdd;
    if (snapshot.nonCompletionPartition === "global") {
      seeds.push(Object.freeze({
        id: "non-completion:",
        kind: "non-completion",
        seed,
      }));
      return;
    }

    const scenePredicates = owner.scenario.scenes.map(scene => Object.freeze({
      id: scene.id,
      predicate: currentFor(owner, owner.atScene(scene.id), `scene ${scene.id} predicate`),
    }));
    const sceneSeeds = scenePredicates.map(scene => Object.freeze({
      id: `non-completion:scene:${scene.id}`,
      kind: "non-completion" as const,
      sceneId: scene.id,
      seed: currentFor(
        owner,
        ownerBdd.and(seed, scene.predicate),
        `non-completion seed for scene ${scene.id}`,
      ),
    }));

    // Validate the decomposition before any cone is solved. atScene() is
    // checked independently above, and these checks make the partition
    // contract fail closed if a model implementation changes its encoding.
    for (let left = 0; left < sceneSeeds.length; left++) {
      for (let right = left + 1; right < sceneSeeds.length; right++) {
        if (ownerBdd.and(sceneSeeds[left]!.seed, sceneSeeds[right]!.seed) !== 0) {
          throw new Error("scene-partitioned non-completion seeds overlap");
        }
      }
    }
    let union = 0;
    for (const sceneSeed of sceneSeeds) union = currentFor(
      owner,
      ownerBdd.or(union, sceneSeed.seed),
      "scene-partitioned non-completion seed union",
    );
    if (ownerBdd.xor(union, seed) !== 0) {
      throw new Error("scene-partitioned non-completion seeds do not equal the global seed");
    }
    seeds.push(...sceneSeeds);
  };

  if (snapshot.nonCompletionMode === "direct") {
    // Keep the default operation order: direct mode constructs the global
    // non-completion seed before compiling each choice's four failure seeds.
    appendNonCompletionSeeds(activeModel, current(
      activeBdd.and(staticAnchors.playing, activeBdd.not(completionRoot)),
      "non-completion seed",
    ));
    if (snapshot.failurePartition === "choice") {
      for (const choice of activeModel.choices) {
        seeds.push(...seedForChoice(activeModel, staticAnchors, invalidDomain, choice));
      }
    } else {
      const choiceSeeds: FailureSeedSpec[] = [];
      for (const choice of activeModel.choices) {
        choiceSeeds.push(...seedForChoice(activeModel, staticAnchors, invalidDomain, choice));
      }
      const combined = combineFailureSeeds(activeModel, choiceSeeds);
      failureSeedMetadata = combined.metadata;
      seeds.push(Object.freeze({
        id: "failure-union:",
        kind: "failure-union" as const,
        seed: combined.seed,
      }));
    }
  } else {
    const choiceSeeds: FailureSeedSpec[] = [];
    for (const choice of activeModel.choices) {
      choiceSeeds.push(...seedForChoice(activeModel, staticAnchors, invalidDomain, choice));
    }
    let failureSeed: CurrentRoot;
    if (snapshot.failurePartition === "combined") {
      const combined = combineFailureSeeds(activeModel, choiceSeeds);
      failureSeed = combined.seed;
      failureSeedMetadata = combined.metadata;
    } else {
      failureSeed = 0;
      for (const spec of choiceSeeds) {
        failureSeed = current(activeBdd.or(failureSeed, spec.seed), "failure seed union");
      }
    }
    const completionOrFailureSeed = current(
      activeBdd.or(completionRoot, failureSeed),
      "completion-or-failure initial seed",
    );
    const closure = completionOrFailureFixedPoint(completionOrFailureSeed, failureSeed, choiceSeeds);
    completionOrFailure = closure.fixedPoint;
    failureSeed = closure.failureSeed;
    appendNonCompletionSeeds(activeModel, current(
      activeBdd.and(staticAnchors.playing, activeBdd.not(completionOrFailure.root)),
      "failure-absorbed non-completion seed",
    ));
    if (snapshot.failurePartition === "choice") {
      seeds.push(...closure.choiceSeeds);
    } else {
      seeds.push(Object.freeze({
        id: "failure-union:",
        kind: "failure-union" as const,
        seed: failureSeed,
      }));
    }
  }

  // No fixed-point owner changes occur after this point. Obligation cones may
  // use their own disposable managers, while result roots stay with these
  // final fixed-point roots.
  const finalModel = activeModel;
  const finalBdd = activeBdd;
  const finalStaticAnchors = staticAnchors;
  const solveObligation = (spec: SeedSpec): ObligationSummary => {
    const choiceSweeps = snapshot.obligationChoiceCompactAt > 0;
    const compactionEnabled = snapshot.obligationCompactEvery > 0 || choiceSweeps;
    const copyToFresh = (
      source: SymbolicModel,
      bad: CurrentRoot,
      seed: CurrentRoot,
      anchors: StaticAnchors,
      label: string,
    ): {
      readonly model: SymbolicModel;
      readonly bad: CurrentRoot;
      readonly seed: CurrentRoot;
      readonly anchors: StaticAnchors;
    } => {
      const sourceBad = currentFor(source, bad, `${label} source bad`);
      const sourceSeed = currentFor(source, seed, `${label} source seed`);
      const sourceAnchors: StaticAnchors = {
        validDomain: currentFor(source, anchors.validDomain, `${label} source validDomain`),
        initial: currentFor(source, anchors.initial, `${label} source initial`),
        playing: currentFor(source, anchors.playing, `${label} source playing`),
        completed: currentFor(source, anchors.completed, `${label} source completed`),
      };
      if (sourceAnchors.validDomain !== source.validDomain
        || sourceAnchors.initial !== source.initial
        || sourceAnchors.playing !== source.playing
        || sourceAnchors.completed !== source.completed) {
        throw new Error(`${label} source static roots do not match its model`);
      }

      const fresh = source.fresh();
      assertEquivalentFreshModel(source, fresh);
      const copied = source.bdd.copyForestTo(fresh.bdd, [
        sourceBad,
        sourceSeed,
        sourceAnchors.validDomain,
        sourceAnchors.initial,
        sourceAnchors.playing,
        sourceAnchors.completed,
      ]);
      if (copied.length !== 6 || copied.some(root => root === undefined)) {
        throw new Error(`${label} failed to copy the complete obligation root bundle`);
      }
      const copiedBad = currentFor(fresh, copied[0]!, `${label} copied bad`);
      const copiedSeed = currentFor(fresh, copied[1]!, `${label} copied seed`);
      const freshAnchors: StaticAnchors = {
        validDomain: currentFor(fresh, copied[2]!, `${label} copied validDomain`),
        initial: currentFor(fresh, copied[3]!, `${label} copied initial`),
        playing: currentFor(fresh, copied[4]!, `${label} copied playing`),
        completed: currentFor(fresh, copied[5]!, `${label} copied completed`),
      };
      const modelAnchors: StaticAnchors = {
        validDomain: currentFor(fresh, fresh.validDomain, `${label} fresh validDomain`),
        initial: currentFor(fresh, fresh.initial, `${label} fresh initial`),
        playing: currentFor(fresh, fresh.playing, `${label} fresh playing`),
        completed: currentFor(fresh, fresh.completed, `${label} fresh completed`),
      };
      if (freshAnchors.validDomain !== modelAnchors.validDomain
        || freshAnchors.initial !== modelAnchors.initial
        || freshAnchors.playing !== modelAnchors.playing
        || freshAnchors.completed !== modelAnchors.completed) {
        throw new Error(`${label} fresh static roots do not match its model`);
      }
      return { model: fresh, bad: copiedBad, seed: copiedSeed, anchors: freshAnchors };
    };

    if (spec.seed === 0) {
      const summary = Object.freeze({
        id: spec.id,
        kind: spec.kind,
        ...(spec.sceneId === undefined ? {} : { sceneId: spec.sceneId }),
        ...(spec.choiceId === undefined ? {} : { choiceId: spec.choiceId }),
        rounds: 1,
        nodes: finalBdd.stats().nodes,
        seedZero: true,
        initialInBad: false,
        ...(compactionEnabled ? { compactions: 0 } : {}),
      });
      progress({ phase: "obligation", id: spec.id, round: 1, nodes: summary.nodes, fixed: true }, snapshot.onProgress);
      snapshot.onObligation?.(Object.freeze({ model: finalModel, seed: 0, bad: 0, summary }));
      return summary;
    }

    let owner = finalModel;
    let bad: CurrentRoot = spec.seed;
    let seed: CurrentRoot = spec.seed;
    let anchors = finalStaticAnchors;
    ({ model: owner, bad, seed, anchors } = copyToFresh(
      owner, bad, seed, anchors, `obligation ${spec.id} initial copy`,
    ));
    let rounds = 0;
    let fixed = false;
    let compactions = 0;
    const choiceCopyThreshold = (): number => snapshot.obligationChoiceCompactInterval === 0
      ? snapshot.obligationChoiceCompactAt
      : Math.max(snapshot.obligationChoiceCompactAt, Math.min(
        Number.MAX_SAFE_INTEGER,
        owner.bdd.stats().nodes + snapshot.obligationChoiceCompactInterval,
      ));
    let nextChoiceCompactAt = choiceCopyThreshold();
    const compact = (round: number, choiceId?: string): void => {
      const previousNodes = owner.bdd.stats().nodes;
      ({ model: owner, bad, seed, anchors } = copyToFresh(
        owner, bad, seed, anchors,
        `obligation ${spec.id} compaction after round ${round}${choiceId === undefined ? "" : ` choice ${choiceId}`}`,
      ));
      compactions++;
      nextChoiceCompactAt = choiceCopyThreshold();
      progress({
        phase: "obligation-compact", id: spec.id, round,
        ...(choiceId === undefined ? {} : { choiceId }),
        nodes: owner.bdd.stats().nodes, previousNodes, fixed: false,
      }, snapshot.onProgress);
    };
    for (let round = 1; round <= snapshot.roundLimit; round++) {
      let next: CurrentRoot;
      if (choiceSweeps) {
        // Every update remains inside the seed's least backward closure.
        // Only an entire unchanged sweep establishes closure under all choices.
        let changed = false;
        for (let index = owner.choices.length - 1; index >= 0; index--) {
          const choice = owner.choices[index]!;
          const previousNodes = owner.bdd.stats().nodes;
          const predecessor = currentFor(owner, owner.preimage(bad, choice), `obligation ${spec.id} choice ${choice.id} predecessor`);
          const updated = currentFor(owner, owner.bdd.or(bad, predecessor), `obligation ${spec.id} choice ${choice.id} candidate`);
          changed = changed || updated !== bad;
          bad = updated;
          // Compare within this owner before copying. Re-fetch the next choice
          // from the new owner; never pass another manager's choice handles.
          const nodes = owner.bdd.stats().nodes;
          if (nodes >= nextChoiceCompactAt && nodes > previousNodes) compact(round, choice.id);
        }
        fixed = !changed;
        next = bad;
      } else {
        const predecessor = currentFor(owner, owner.preimage(bad), `obligation ${spec.id} predecessor`);
        next = currentFor(owner, owner.bdd.or(bad, predecessor), `obligation ${spec.id} fixed-point candidate`);
        fixed = next === bad;
      }
      rounds = round;
      progress({ phase: "obligation", id: spec.id, round, nodes: owner.bdd.stats().nodes, fixed }, snapshot.onProgress);
      if (fixed) {
        bad = next;
        break;
      }
      bad = next;
      if (snapshot.obligationCompactEvery > 0 && round % snapshot.obligationCompactEvery === 0) compact(round);
    }
    if (!fixed) {
      throw new Error(`obligation ${spec.id} fixed point not reached within round limit ${snapshot.roundLimit}`);
    }
    const initialInBad = owner.bdd.and(owner.initial, bad) !== 0;
    const summary = Object.freeze({
      id: spec.id,
      kind: spec.kind,
      ...(spec.sceneId === undefined ? {} : { sceneId: spec.sceneId }),
      ...(spec.choiceId === undefined ? {} : { choiceId: spec.choiceId }),
      rounds,
      nodes: owner.bdd.stats().nodes,
      seedZero: false,
      initialInBad,
      ...(compactionEnabled ? { compactions } : {}),
    });
    snapshot.onObligation?.(Object.freeze({ model: owner, seed, bad, summary }));
    return summary;
  };

  const obligations = Object.freeze(seeds.map(solveObligation));
  const baseResult = {
    model: finalModel,
    completable: completionRoot,
    completionRounds: completion.rounds,
    initialInBad: obligations.some(obligation => obligation.initialInBad),
    obligations,
    ...(failureSeedMetadata === undefined ? {} : { failureSeeds: failureSeedMetadata }),
    ...(snapshot.fixedPointCompactEvery > 0 ? { completionCompactions } : {}),
  };
  if (completionOrFailure === undefined) {
    return Object.freeze({ ...baseResult, complete: true as const });
  }
  return Object.freeze({
    ...baseResult,
    completionOrFailure: completionOrFailure.root,
    completionOrFailureRounds: completionOrFailure.rounds,
    ...(snapshot.fixedPointCompactEvery > 0 ? { completionOrFailureCompactions } : {}),
    complete: true as const,
  });
}
