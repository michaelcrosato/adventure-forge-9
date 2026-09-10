import { isDeepStrictEqual } from "node:util";
import { SymbolicModel } from "./symbolic-model.js";
import {
  FAILURE_KINDS, SymbolicCertificateError, assertAnchors, assertCurrentOnly,
  assertFresh, certificateDescriptor, computeCompletion,
  importedSingle, regenerateFailureSeeds,
  type FailureSeedMetadata, type SymbolicCertificateProgress,
  type SymbolicForestLoader, type SymbolicModelDescriptor,
} from "./symbolic-certificates.js";

export const FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA = "af9-symbolic-factorized-certificate-v1" as const;

export interface FactorizedSymbolicCertificate {
  readonly schema: typeof FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA;
  readonly descriptor: SymbolicModelDescriptor;
  readonly sceneForests: readonly { readonly sceneId: string; readonly forestId: string }[];
  readonly failureForests: readonly { readonly seedId: string; readonly forestId: string }[];
}

export type FactorizedCertificateProgress = SymbolicCertificateProgress | {
  readonly phase: "completion-or-failure";
  readonly round: number;
  readonly nodes: number;
  readonly fixed: boolean;
} | {
  readonly phase: "cone-compact";
  readonly id: string;
  readonly choiceId: string;
  readonly nodes: number;
  readonly previousNodes: number;
};

export interface FactorizedCertificateOptions {
  readonly roundLimit?: number;
  /** Applied to both independently recomputed least fixed points. */
  readonly completionCompactEvery?: number;
  /** Copy cone roots between choices at this allocated-node count; zero disables copying. */
  readonly coneCompactAt?: number;
  readonly onProgress?: (progress: FactorizedCertificateProgress) => void;
}

export interface FactorizedCertificateVerificationResult {
  readonly complete: true;
  /** Owner of both returned predicates. */
  readonly model: SymbolicModel;
  readonly completable: number;
  readonly completionOrFailure: number;
  readonly completionRounds: number;
  readonly completionOrFailureRounds: number;
  readonly descriptor: SymbolicModelDescriptor;
  readonly sceneIds: readonly string[];
  readonly failureSeeds: readonly FailureSeedMetadata[];
  readonly checkedSceneForests: number;
  readonly checkedFailureForests: number;
}

function fail(message: string): never { throw new SymbolicCertificateError(message); }

function object(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(`${path}: must be an object`);
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== keys.length || keys.some(key => !Object.hasOwn(input, key))) {
    fail(`${path}: must contain exactly ${keys.join(", ")}`);
  }
  return input;
}

function entries(value: unknown, key: "sceneId" | "seedId", path: string): readonly { id: string; forestId: string }[] {
  if (!Array.isArray(value)) fail(`${path}: must be an array`);
  const result: { id: string; forestId: string }[] = [];
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index)) fail(`${path}: must not be sparse`);
    const input = object(value[index], [key, "forestId"], `${path}[${index}]`);
    const id = input[key];
    const forestId = input.forestId;
    if (typeof id !== "string" || !id || typeof forestId !== "string" || !forestId) {
      fail(`${path}[${index}]: identifiers must be non-empty strings`);
    }
    result.push(Object.freeze({ id, forestId }));
  }
  return Object.freeze(result);
}

function copyBundle(source: SymbolicModel, roots: readonly number[], path: string): {
  model: SymbolicModel; roots: readonly number[];
} {
  for (const root of roots) assertCurrentOnly(source, root, `${path}.source`);
  const model = source.fresh();
  assertFresh(source, model, path);
  assertAnchors(source, model, path);
  const copied = source.bdd.copyForestTo(model.bdd, roots);
  if (copied.length !== roots.length) fail(`${path}: incomplete copied root bundle`);
  for (const root of copied) assertCurrentOnly(model, root, `${path}.copied`);
  return { model, roots: copied };
}

export interface FactorizedComponentOptions {
  readonly label?: string;
  readonly coneCompactAt?: number;
  readonly onProgress?: (progress: FactorizedCertificateProgress) => void;
}

/** Check one component only. This does not establish complete campaign coverage. */
export function verifyFactorizedComponent(
  source: SymbolicModel, seed: number, forest: unknown, options: FactorizedComponentOptions = {},
): { readonly model: SymbolicModel; readonly root: number } {
  if (!(source instanceof SymbolicModel)) throw new TypeError("model must be a SymbolicModel");
  if (options === null || typeof options !== "object" || Array.isArray(options)) throw new TypeError("options must be an object");
  const requestedThreshold = options.coneCompactAt;
  const requestedLabel = options.label;
  const onProgress = options.onProgress;
  const threshold = requestedThreshold === undefined ? 1_000_000 : requestedThreshold;
  const label = requestedLabel === undefined ? "component" : requestedLabel;
  if (!Number.isSafeInteger(threshold) || threshold < 0) throw new RangeError("coneCompactAt must be a non-negative safe integer");
  if (typeof label !== "string" || !label) throw new TypeError("label must be a non-empty string");
  if (onProgress !== undefined && typeof onProgress !== "function") throw new TypeError("onProgress must be a function");
  let owner: SymbolicModel;
  let root: number;
  {
    const copied = copyBundle(source, [seed], `${label} owner`);
    owner = copied.model;
    root = importedSingle(owner, forest, label);
    assertCurrentOnly(owner, root, label);
    // OR equality is the same subset test without allocating a whole-cone complement.
    if (owner.bdd.or(root, owner.playing) !== owner.playing) fail(`${label}.playing: cone contains a non-playing state`);
    if (owner.bdd.and(owner.initial, root) !== 0) fail(`${label}: cone intersects the initial state`);
    if (owner.bdd.or(copied.roots[0]!, root) !== root) fail(`${label}.seed coverage: seed is outside its required superset`);
  }
  // Pre(empty) is empty for every relation. All other cones are checked
  // against EVERY authored choice, with that choice taken from its current owner.
  if (root !== 0) for (let index = 0; index < owner.choices.length; index++) {
    const choice = owner.choices[index]!;
    const previousNodes = owner.bdd.stats().nodes;
    // A successful target must lie in the existential output range of this
    // exact relation. Restrict BEFORE renaming the cone to next-state bits:
    // Pre_R(B) = Pre_R(B intersect Range(R)). This avoids copying unrelated
    // scene branches and derives no assumptions from the functional compiler.
    const nextRange = owner.bdd.exists(choice.relation, owner.currentVariables);
    const toCurrent = new Map(owner.nextVariables.map((variable, bit) => [variable, owner.currentVariables[bit]!]));
    const range = owner.bdd.rename(nextRange, toCurrent);
    assertCurrentOnly(owner, range, `${label}.${choice.id}.range`);
    const target = owner.bdd.and(root, range);
    const predecessor = owner.preimage(target, choice);
    assertCurrentOnly(owner, predecessor, `${label}.${choice.id}.predecessor`);
    if (owner.bdd.or(root, predecessor) !== root) fail(`${label}.predecessor-closed: choice ${choice.id} adds states outside the cone`);
    const nodes = owner.bdd.stats().nodes;
    if (threshold > 0 && nodes >= threshold && nodes > previousNodes) {
      const copied = copyBundle(owner, [root], `${label} copy after ${choice.id}`);
      owner = copied.model;
      root = copied.roots[0]!;
      onProgress?.(Object.freeze({ phase: "cone-compact", id: label, choiceId: choice.id,
        nodes: owner.bdd.stats().nodes, previousNodes: nodes }));
    }
  }
  return Object.freeze({ model: owner, root });
}

function foundations(
  source: SymbolicModel, roundLimit: number, compactEvery: number,
  onProgress: FactorizedCertificateOptions["onProgress"],
) {
  let completion: ReturnType<typeof computeCompletion> | undefined = computeCompletion(source, roundLimit, compactEvery, onProgress);
  let owner = completion.owner;
  let completable = completion.root;
  const completionRounds = completion.rounds;
  let regenerated: ReturnType<typeof regenerateFailureSeeds> | undefined = regenerateFailureSeeds(owner, completion.anchors);
  completion = undefined;
  const failureSeeds = Object.freeze(regenerated.seeds.map(seed => seed.metadata));
  let seedRoots = regenerated.seeds.map(seed => seed.root);
  let root = owner.bdd.or(completable, regenerated.union);
  regenerated = undefined;
  assertCurrentOnly(owner, root, "completion-or-failure seed");
  for (let round = 1; round <= roundLimit; round++) {
    const predecessor = owner.preimage(root);
    assertCurrentOnly(owner, predecessor, "completion-or-failure predecessor");
    const next = owner.bdd.or(root, predecessor);
    const fixed = next === root;
    onProgress?.(Object.freeze({ phase: "completion-or-failure", round, nodes: owner.bdd.stats().nodes, fixed }));
    if (fixed) {
      const base = copyBundle(owner, [completable, root, ...seedRoots], "factorized foundation owner");
      return {
        model: base.model, completable: base.roots[0]!, completionOrFailure: base.roots[1]!,
        seedRoots: base.roots.slice(2), failureSeeds, completionRounds, completionOrFailureRounds: round,
      };
    }
    root = next;
    if (compactEvery > 0 && round % compactEvery === 0) {
      const copied = copyBundle(owner, [completable, root, ...seedRoots], `completion-or-failure copy ${round}`);
      owner = copied.model;
      completable = copied.roots[0]!;
      root = copied.roots[1]!;
      seedRoots = copied.roots.slice(2);
    }
  }
  fail(`completion-or-failure: fixed point not reached within round limit ${roundLimit}`);
}

/**
 * Verify separate inductive failure cones without materializing their union.
 * C and W are recomputed least fixed points, never supplied by the producer.
 * If a reachable playing state were outside W, it would be in a scene cone.
 * Inside least W it has a finite route to C or a failure seed; the latter is
 * excluded by the corresponding backward-closed failure cone. Hence every
 * reachable playing state can reach completion and no failure is reachable.
 */
export function verifyFactorizedSymbolicCertificate(
  model: SymbolicModel, input: unknown, loadForest: SymbolicForestLoader,
  options: FactorizedCertificateOptions = {},
): FactorizedCertificateVerificationResult {
  if (!(model instanceof SymbolicModel)) throw new TypeError("model must be a SymbolicModel");
  if (typeof loadForest !== "function") throw new TypeError("loadForest must be a function");
  if (options === null || typeof options !== "object" || Array.isArray(options)) throw new TypeError("options must be an object");
  const requestedRounds = options.roundLimit;
  const requestedCompaction = options.completionCompactEvery;
  const requestedConeCompaction = options.coneCompactAt;
  const onProgress = options.onProgress;
  const roundLimit = requestedRounds === undefined ? 10_000 : requestedRounds;
  const compactEvery = requestedCompaction === undefined ? 1 : requestedCompaction;
  const coneCompactAt = requestedConeCompaction === undefined ? 1_000_000 : requestedConeCompaction;
  if (!Number.isSafeInteger(roundLimit) || roundLimit < 1) throw new RangeError("roundLimit must be a positive safe integer");
  if (!Number.isSafeInteger(compactEvery) || compactEvery < 0) throw new RangeError("completionCompactEvery must be a non-negative safe integer");
  if (!Number.isSafeInteger(coneCompactAt) || coneCompactAt < 0) throw new RangeError("coneCompactAt must be a non-negative safe integer");
  if (onProgress !== undefined && typeof onProgress !== "function") throw new TypeError("onProgress must be a function");
  const parsed = object(input, ["schema", "descriptor", "sceneForests", "failureForests"], "certificate");
  if (parsed.schema !== FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA) fail("certificate.schema: unsupported certificate schema");
  const descriptor = certificateDescriptor(model);
  if (!isDeepStrictEqual(parsed.descriptor, descriptor)) fail("certificate.descriptor: does not match the current symbolic model");
  const scenes = entries(parsed.sceneForests, "sceneId", "certificate.sceneForests");
  const failures = entries(parsed.failureForests, "seedId", "certificate.failureForests");
  const sceneIds = model.scenario.scenes.map(scene => scene.id);
  const failureIds = model.choices.flatMap(choice => FAILURE_KINDS.map(kind => `${kind}:${choice.id}`));
  if (!isDeepStrictEqual(scenes.map(scene => scene.id), sceneIds)) fail("certificate.sceneForests: must list every authored scene in scenario order");
  if (!isDeepStrictEqual(failures.map(failure => failure.id), failureIds)) fail("certificate.failureForests: must list every failure seed in authored choice and kind order");
  const allIds = [...scenes, ...failures].map(entry => entry.forestId);
  if (new Set(allIds).size !== allIds.length) fail("certificate: forest IDs must be unique");
  const base = foundations(model, roundLimit, compactEvery, onProgress);
  if (!isDeepStrictEqual(base.failureSeeds.map(seed => seed.id), failureIds)) fail("recomputed failure seed catalog differs");

  const check = (seed: number, forestId: string, label: string): SymbolicModel => {
    return verifyFactorizedComponent(base.model, seed, loadForest(forestId), {
      label, coneCompactAt, onProgress,
    }).model;
  };
  for (let index = 0; index < failures.length; index++) {
    const failure = failures[index]!;
    const owner = check(base.seedRoots[index]!, failure.forestId, `failure ${failure.id}`);
    onProgress?.(Object.freeze({ phase: "failure", id: failure.id, nodes: owner.bdd.stats().nodes }));
  }
  for (const scene of scenes) {
    const bdd = base.model.bdd;
    const seed = bdd.and(base.model.playing, bdd.and(base.model.atScene(scene.id), bdd.not(base.completionOrFailure)));
    const owner = check(seed, scene.forestId, `scene ${scene.id}`);
    onProgress?.(Object.freeze({ phase: "scene", id: scene.id, nodes: owner.bdd.stats().nodes }));
  }
  return Object.freeze({
    complete: true, model: base.model, completable: base.completable, completionOrFailure: base.completionOrFailure,
    completionRounds: base.completionRounds, completionOrFailureRounds: base.completionOrFailureRounds,
    descriptor, sceneIds: Object.freeze(sceneIds), failureSeeds: base.failureSeeds,
    checkedSceneForests: scenes.length, checkedFailureForests: failures.length,
  });
}
