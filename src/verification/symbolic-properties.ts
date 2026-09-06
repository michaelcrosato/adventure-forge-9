import { SymbolicModel } from "./symbolic-model.js";

/** Progress emitted after each exact fixed-point iteration. */
export interface SymbolicPropertyProgress {
  readonly phase: "completion" | "bad";
  readonly round: number;
  readonly nodes: number;
  readonly fixed: boolean;
}

export interface SymbolicPropertyOptions {
  /** Maximum number of applications of each predecessor operator. */
  readonly roundLimit?: number;
  readonly onProgress?: (progress: SymbolicPropertyProgress) => void;
}

export interface CompletionSafetyResult {
  /** Every returned numeric root belongs to this exact model manager. */
  readonly model: SymbolicModel;
  /** States with an existential authored route to a completed outcome. */
  readonly completable: number;
  /** States with a path to an uncovered, unsafe, or non-completable state. */
  readonly bad: number;
  /** Union of authored arithmetic-error and bound-exit source predicates. */
  readonly faults: number;
  /** Successful relation sources whose output is outside validDomain. */
  readonly invalidSuccess: number;
  /** Enabled sources not covered by a fault or successful valid transition. */
  readonly uncoveredEnabled: number;
  readonly completionRounds: number;
  readonly badRounds: number;
  readonly initialInBad: boolean;
  readonly complete: true;
}

const DEFAULT_ROUND_LIMIT = 10_000;

/**
 * Prove the finite control/resource property without retaining forward
 * frontiers. Completion is existential: a state is completable when it has one
 * finite authored route to a completed terminal. The bad fixed point then
 * propagates any such failure backwards through successful authored edges.
 */
export function proveCompletionSafety(
  model: SymbolicModel,
  options: SymbolicPropertyOptions = {},
): CompletionSafetyResult {
  if (!(model instanceof SymbolicModel)) throw new TypeError("model must be a SymbolicModel");
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  const roundLimit = options.roundLimit === undefined ? DEFAULT_ROUND_LIMIT : options.roundLimit;
  if (!Number.isSafeInteger(roundLimit) || roundLimit < 1) {
    throw new RangeError("roundLimit must be a positive safe integer");
  }
  const onProgress = options.onProgress;
  if (onProgress !== undefined && typeof onProgress !== "function") {
    throw new TypeError("onProgress must be a function");
  }

  const bdd = model.bdd;
  const assertCurrent = (root: number, label: string): number => {
    // In a reduced BDD, eliminating every next variable leaves the identical
    // handle exactly when the function is independent of next-state inputs.
    if (bdd.exists(root, model.nextVariables) !== root) {
      throw new Error(`${label} must be a current-only symbolic root`);
    }
    return root;
  };
  const current = (root: number, label: string): number => assertCurrent(root, label);

  const validDomain = current(model.validDomain, "model.validDomain");
  const playing = current(model.playing, "model.playing");
  const completed = current(model.completed, "model.completed");
  const initial = current(model.initial, "model.initial");
  const invalidDomain = current(bdd.not(validDomain), "invalidDomain");
  if (bdd.and(initial, invalidDomain) !== 0) {
    throw new Error("Symbolic initial state is outside the valid domain");
  }

  let faults = 0;
  let invalidSuccess = 0;
  let uncoveredEnabled = 0;
  for (const choice of model.choices) {
    const enabled = current(choice.enabled, `choice ${choice.id}.enabled`);
    const arithmeticError = current(choice.arithmeticError, `choice ${choice.id}.arithmeticError`);
    const boundExit = current(choice.boundExit, `choice ${choice.id}.boundExit`);
    const errors = current(
      bdd.or(arithmeticError, boundExit),
      `choice ${choice.id}.faults`,
    );
    faults = current(bdd.or(faults, errors), "faults");

    const validSources = current(
      model.preimage(validDomain, choice),
      `choice ${choice.id}.valid-success-sources`,
    );
    const invalidSources = current(
      model.preimage(invalidDomain, choice),
      `choice ${choice.id}.invalid-success-sources`,
    );
    invalidSuccess = current(bdd.or(invalidSuccess, invalidSources), "invalidSuccess");

    const covered = current(bdd.or(errors, validSources), `choice ${choice.id}.covered-sources`);
    const uncovered = current(
      bdd.and(enabled, bdd.not(covered)),
      `choice ${choice.id}.uncovered-enabled-sources`,
    );
    uncoveredEnabled = current(bdd.or(uncoveredEnabled, uncovered), "uncoveredEnabled");
  }

  const fixedPoint = (
    seed: number,
    phase: "completion" | "bad",
  ): { readonly root: number; readonly rounds: number } => {
    let root = current(seed, `${phase} seed`);
    for (let round = 1; round <= roundLimit; round++) {
      const predecessor = current(model.preimage(root), `${phase} predecessor`);
      const next = current(bdd.or(root, predecessor), `${phase} fixed-point candidate`);
      const fixed = next === root;
      onProgress?.(Object.freeze({
        phase,
        round,
        nodes: bdd.stats().nodes,
        fixed,
      }));
      if (fixed) return Object.freeze({ root, rounds: round });
      root = next;
    }
    throw new Error(`${phase} fixed point not reached within round limit ${roundLimit}`);
  };

  // This is deliberately global over the finite valid domain. No forward
  // reachable set is required or computed by this property proof.
  const completion = fixedPoint(completed, "completion");
  const notCompletable = current(bdd.not(completion.root), "notCompletable");
  let bad0 = current(bdd.and(playing, notCompletable), "non-completable playing states");
  bad0 = current(bdd.or(bad0, faults), "bad0 faults");
  bad0 = current(bdd.or(bad0, invalidSuccess), "bad0 invalid successes");
  bad0 = current(bdd.or(bad0, uncoveredEnabled), "bad0 uncovered enabled sources");

  const bad = fixedPoint(bad0, "bad");
  const initialInBad = bdd.and(initial, bad.root) !== 0;
  return Object.freeze({
    model,
    completable: completion.root,
    bad: bad.root,
    faults,
    invalidSuccess,
    uncoveredEnabled,
    completionRounds: completion.rounds,
    badRounds: bad.rounds,
    initialInBad,
    complete: true as const,
  });
}
