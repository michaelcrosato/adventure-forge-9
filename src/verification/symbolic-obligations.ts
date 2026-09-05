import { isDeepStrictEqual } from "node:util";
import { SymbolicModel, type SymbolicChoice } from "./symbolic-model.js";

/** The exact failure obligations checked by the split property proof. */
export type ObligationKind =
  | "non-completion"
  | "arithmetic-error"
  | "bound-exit"
  | "invalid-success"
  | "uncovered-enabled";

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
}

export interface ObligationProgress {
  readonly phase: "completion" | "completion-or-failure" | "obligation";
  readonly id?: string;
  readonly round: number;
  readonly nodes: number;
  readonly fixed: boolean;
}

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
  /** All returned numeric roots belong to this original model manager. */
  readonly model: SymbolicModel;
  /** States with an existential authored route to a completed terminal. */
  readonly completable: number;
  readonly completionRounds: number;
  /** Existential completion-or-failure closure, not strong completion; absorbed mode only. */
  readonly completionOrFailure?: number;
  /** Predecessor rounds starting from the already-computed C union failure seeds. */
  readonly completionOrFailureRounds?: number;
  /** True when the original initial projection is in any obligation closure. */
  readonly initialInBad: boolean;
  readonly obligations: readonly ObligationSummary[];
  readonly complete: true;
}

const DEFAULT_ROUND_LIMIT = 10_000;

type CurrentRoot = number;

interface FixedPoint {
  readonly root: CurrentRoot;
  readonly rounds: number;
}

interface SeedSpec {
  readonly id: string;
  readonly kind: ObligationKind;
  readonly sceneId?: string;
  readonly choiceId?: string;
  readonly seed: CurrentRoot;
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
  const onProgress = options.onProgress;
  const onObligation = options.onObligation;
  const roundLimit = requestedRoundLimit === undefined ? DEFAULT_ROUND_LIMIT : requestedRoundLimit;
  const nonCompletionMode = requestedNonCompletionMode === undefined ? "direct" : requestedNonCompletionMode;
  const nonCompletionPartition = requestedNonCompletionPartition === undefined ? "global" : requestedNonCompletionPartition;
  if (!Number.isSafeInteger(roundLimit) || roundLimit < 1) {
    throw new RangeError("roundLimit must be a positive safe integer");
  }
  if (nonCompletionMode !== "direct" && nonCompletionMode !== "failure-absorbed") {
    throw new RangeError("nonCompletionMode must be \"direct\" or \"failure-absorbed\"");
  }
  if (nonCompletionPartition !== "global" && nonCompletionPartition !== "scene") {
    throw new RangeError("nonCompletionPartition must be \"global\" or \"scene\"");
  }
  if (onProgress !== undefined && typeof onProgress !== "function") {
    throw new TypeError("onProgress must be a function");
  }
  if (onObligation !== undefined && typeof onObligation !== "function") {
    throw new TypeError("onObligation must be a function");
  }
  return Object.freeze({ roundLimit, nonCompletionMode, nonCompletionPartition, onProgress, onObligation });
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
 */
export function proveCompletionSafetyByObligation(
  model: SymbolicModel,
  options?: SymbolicObligationOptions,
): CompletionSafetyByObligationResult {
  if (!(model instanceof SymbolicModel)) throw new TypeError("model must be a SymbolicModel");
  const snapshot = snapshotOptions(options);
  const bdd = model.bdd;

  const current = (root: number, label: string): CurrentRoot => {
    if (bdd.exists(root, model.nextVariables) !== root) {
      throw new Error(`${label} must be a current-only symbolic root`);
    }
    return root;
  };

  const validDomain = current(model.validDomain, "model.validDomain");
  const playing = current(model.playing, "model.playing");
  const completed = current(model.completed, "model.completed");
  const initial = current(model.initial, "model.initial");
  const invalidDomain = current(bdd.not(validDomain), "invalidDomain");
  if (bdd.and(initial, invalidDomain) !== 0) {
    throw new Error("Symbolic initial state is outside the valid domain");
  }

  const progress = (
    event: ObligationProgress,
    callback: ((progress: ObligationProgress) => void) | undefined,
  ): void => {
    callback?.(Object.freeze(event));
  };

  const completionFixedPoint = (): FixedPoint => {
    let root = completed;
    for (let round = 1; round <= snapshot.roundLimit; round++) {
      const predecessor = current(model.preimage(root), "completion predecessor");
      const next = current(bdd.or(root, predecessor), "completion fixed-point candidate");
      const fixed = next === root;
      progress({ phase: "completion", round, nodes: bdd.stats().nodes, fixed }, snapshot.onProgress);
      if (fixed) return Object.freeze({ root, rounds: round });
      root = next;
    }
    throw new Error(`completion fixed point not reached within round limit ${snapshot.roundLimit}`);
  };

  const completion = completionFixedPoint();
  const seeds: SeedSpec[] = [];

  const seedForChoice = (choice: SymbolicChoice): readonly SeedSpec[] => {
    const enabled = current(choice.enabled, `choice ${choice.id}.enabled`);
    const arithmeticError = current(choice.arithmeticError, `choice ${choice.id}.arithmeticError`);
    const boundExit = current(choice.boundExit, `choice ${choice.id}.boundExit`);
    const faults = current(bdd.or(arithmeticError, boundExit), `choice ${choice.id}.faults`);
    const validSources = current(
      model.preimage(validDomain, choice),
      `choice ${choice.id}.valid-success-sources`,
    );
    const invalidSources = current(
      model.preimage(invalidDomain, choice),
      `choice ${choice.id}.invalid-success-sources`,
    );
    const uncovered = current(
      bdd.and(enabled, bdd.not(bdd.or(faults, validSources))),
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
   * Compute W = Pre*(C ∪ F). Since C = Pre*(completed), this is exactly
   * Pre*(completed ∪ F); using C avoids rebuilding the already-proven
   * completion cone. W is an existential "can complete or reach failure"
   * predicate and is never used as the strong completion result. With
   * P = playing states and N = P \ C, replacing N by P \ W is exact because
   * Pre*((P \ C) ∪ F) = Pre*((P \ W) ∪ F): the removed states are already in
   * Pre*(F), whose predecessor closure is idempotent.
   */
  const completionOrFailureFixedPoint = (seed: CurrentRoot): FixedPoint => {
    let root = current(seed, "completion-or-failure seed");
    for (let round = 1; round <= snapshot.roundLimit; round++) {
      const predecessor = current(model.preimage(root), "completion-or-failure predecessor");
      const next = current(bdd.or(root, predecessor), "completion-or-failure fixed-point candidate");
      const fixed = next === root;
      progress({ phase: "completion-or-failure", round, nodes: bdd.stats().nodes, fixed }, snapshot.onProgress);
      if (fixed) return Object.freeze({ root, rounds: round });
      root = next;
    }
    throw new Error(`completion-or-failure fixed point not reached within round limit ${snapshot.roundLimit}`);
  };

  let completionOrFailure: FixedPoint | undefined;
  const appendNonCompletionSeeds = (seed: CurrentRoot): void => {
    if (snapshot.nonCompletionPartition === "global") {
      seeds.push(Object.freeze({
        id: "non-completion:",
        kind: "non-completion",
        seed,
      }));
      return;
    }

    const scenePredicates = model.scenario.scenes.map(scene => Object.freeze({
      id: scene.id,
      predicate: current(model.atScene(scene.id), `scene ${scene.id} predicate`),
    }));
    const sceneSeeds = scenePredicates.map(scene => Object.freeze({
      id: `non-completion:scene:${scene.id}`,
      kind: "non-completion" as const,
      sceneId: scene.id,
      seed: current(
        bdd.and(seed, scene.predicate),
        `non-completion seed for scene ${scene.id}`,
      ),
    }));

    // Validate the decomposition before any cone is solved. atScene() is
    // checked independently above, and these checks make the partition
    // contract fail closed if a model implementation changes its encoding.
    for (let left = 0; left < sceneSeeds.length; left++) {
      for (let right = left + 1; right < sceneSeeds.length; right++) {
        if (bdd.and(sceneSeeds[left]!.seed, sceneSeeds[right]!.seed) !== 0) {
          throw new Error("scene-partitioned non-completion seeds overlap");
        }
      }
    }
    let union = 0;
    for (const sceneSeed of sceneSeeds) union = current(
      bdd.or(union, sceneSeed.seed),
      "scene-partitioned non-completion seed union",
    );
    if (bdd.xor(union, seed) !== 0) {
      throw new Error("scene-partitioned non-completion seeds do not equal the global seed");
    }
    seeds.push(...sceneSeeds);
  };

  if (snapshot.nonCompletionMode === "direct") {
    // Keep the default operation order: direct mode constructs the global
    // non-completion seed before compiling each choice's four failure seeds.
    appendNonCompletionSeeds(current(bdd.and(playing, bdd.not(completion.root)), "non-completion seed"));
    for (const choice of model.choices) seeds.push(...seedForChoice(choice));
  } else {
    const choiceSeeds: SeedSpec[] = [];
    for (const choice of model.choices) choiceSeeds.push(...seedForChoice(choice));
    let failureSeed = 0;
    for (const spec of choiceSeeds) {
      failureSeed = current(bdd.or(failureSeed, spec.seed), "failure seed union");
    }
    const completionOrFailureSeed = current(
      bdd.or(completion.root, failureSeed),
      "completion-or-failure initial seed",
    );
    completionOrFailure = completionOrFailureFixedPoint(completionOrFailureSeed);
    appendNonCompletionSeeds(current(
      bdd.and(playing, bdd.not(completionOrFailure.root)),
      "failure-absorbed non-completion seed",
    ));
    seeds.push(...choiceSeeds);
  }

  const solveObligation = (spec: SeedSpec): ObligationSummary => {
    if (spec.seed === 0) {
      const summary = Object.freeze({
        id: spec.id,
        kind: spec.kind,
        ...(spec.sceneId === undefined ? {} : { sceneId: spec.sceneId }),
        ...(spec.choiceId === undefined ? {} : { choiceId: spec.choiceId }),
        rounds: 1,
        nodes: bdd.stats().nodes,
        seedZero: true,
        initialInBad: false,
      });
      progress({ phase: "obligation", id: spec.id, round: 1, nodes: summary.nodes, fixed: true }, snapshot.onProgress);
      snapshot.onObligation?.(Object.freeze({ model, seed: 0, bad: 0, summary }));
      return summary;
    }

    const fresh = model.fresh();
    assertEquivalentFreshModel(model, fresh);
    // The seed is the only obligation-specific root copied into this fresh
    // manager. These four static roots are copied as identity anchors so a
    // fresh implementation with the same field layout cannot silently carry
    // different bounds or lifecycle encoding.
    const copied = bdd.copyForestTo(fresh.bdd, [
      spec.seed,
      validDomain,
      initial,
      playing,
      completed,
    ]);
    const seed = copied[0];
    if (seed === undefined) throw new Error(`Failed to copy obligation seed ${spec.id}`);
    const freshCurrent = (root: number, label: string): CurrentRoot => {
      if (fresh.bdd.exists(root, fresh.nextVariables) !== root) {
        throw new Error(`${label} must be a current-only symbolic root`);
      }
      return root;
    };
    freshCurrent(fresh.initial, `fresh model initial`);
    const copiedValidDomain = copied[1];
    const copiedInitial = copied[2];
    const copiedPlaying = copied[3];
    const copiedCompleted = copied[4];
    if (copiedValidDomain !== fresh.validDomain
      || copiedInitial !== fresh.initial
      || copiedPlaying !== fresh.playing
      || copiedCompleted !== fresh.completed) {
      throw new Error(`Fresh symbolic model static roots do not match obligation ${spec.id}`);
    }
    let bad = freshCurrent(seed, `obligation ${spec.id} seed`);
    let rounds = 0;
    let fixed = false;
    for (let round = 1; round <= snapshot.roundLimit; round++) {
      const predecessor = freshCurrent(fresh.preimage(bad), `obligation ${spec.id} predecessor`);
      const next = freshCurrent(fresh.bdd.or(bad, predecessor), `obligation ${spec.id} fixed-point candidate`);
      fixed = next === bad;
      rounds = round;
      progress({ phase: "obligation", id: spec.id, round, nodes: fresh.bdd.stats().nodes, fixed }, snapshot.onProgress);
      if (fixed) {
        bad = next;
        break;
      }
      bad = next;
    }
    if (!fixed) {
      throw new Error(`obligation ${spec.id} fixed point not reached within round limit ${snapshot.roundLimit}`);
    }
    const initialInBad = fresh.bdd.and(fresh.initial, bad) !== 0;
    const summary = Object.freeze({
      id: spec.id,
      kind: spec.kind,
      ...(spec.sceneId === undefined ? {} : { sceneId: spec.sceneId }),
      ...(spec.choiceId === undefined ? {} : { choiceId: spec.choiceId }),
      rounds,
      nodes: fresh.bdd.stats().nodes,
      seedZero: false,
      initialInBad,
    });
    snapshot.onObligation?.(Object.freeze({ model: fresh, seed, bad, summary }));
    return summary;
  };

  const obligations = Object.freeze(seeds.map(solveObligation));
  const baseResult = {
    model,
    completable: completion.root,
    completionRounds: completion.rounds,
    initialInBad: obligations.some(obligation => obligation.initialInBad),
    obligations,
  };
  if (completionOrFailure === undefined) {
    return Object.freeze({ ...baseResult, complete: true as const });
  }
  return Object.freeze({
    ...baseResult,
    completionOrFailure: completionOrFailure.root,
    completionOrFailureRounds: completionOrFailure.rounds,
    complete: true as const,
  });
}
