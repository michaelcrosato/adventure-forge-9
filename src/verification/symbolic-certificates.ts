import { isDeepStrictEqual } from "node:util";
import type { Scenario } from "../engine/content.js";
import { type BddForest } from "./bdd.js";
import { SymbolicModel } from "./symbolic-model.js";

/** The wire format for one untrusted symbolic certificate. */
export const SYMBOLIC_CERTIFICATE_SCHEMA = "af9-symbolic-certificate-v1" as const;
/** The deterministic descriptor bound to the validated symbolic model. */
export const SYMBOLIC_MODEL_DESCRIPTOR_SCHEMA = "af9-symbolic-model-descriptor-v1" as const;

export const FAILURE_KINDS = Object.freeze([
  "arithmetic-error",
  "bound-exit",
  "invalid-success",
  "uncovered-enabled",
] as const);

export type FailureKind = (typeof FAILURE_KINDS)[number];

/**
 * A JSON-safe description of the complete symbolic encoding.  The anchor
 * forest includes the exact bounded domain, so a same-width but different
 * resource bound cannot pass descriptor comparison.
 */
export interface SymbolicModelDescriptor {
  readonly schema: typeof SYMBOLIC_MODEL_DESCRIPTOR_SCHEMA;
  readonly scenario: Scenario;
  readonly resources: readonly string[];
  readonly flags: readonly string[];
  readonly fieldOrder: readonly string[];
  readonly currentVariables: readonly number[];
  readonly nextVariables: readonly number[];
  readonly variableCount: number;
  readonly order: "interleaved" | "blocked";
  readonly transitionMode: "relational" | "partitioned";
  readonly strategy: Readonly<{
    readonly order: "interleaved" | "blocked";
    readonly transitionMode: "relational" | "partitioned";
    readonly fieldOrder: readonly string[];
  }>;
  /** [validDomain, initial, playing, completed], in that order. */
  readonly anchors: BddForest;
}

export interface SymbolicSceneCertificate {
  readonly sceneId: string;
  readonly forestId: string;
}

/**
 * Forest IDs are resolved by the caller.  This keeps the verifier from
 * reading paths, executing archived code, or accepting raw manager handles.
 */
export interface SymbolicCertificate {
  readonly schema: typeof SYMBOLIC_CERTIFICATE_SCHEMA;
  readonly descriptor: SymbolicModelDescriptor;
  readonly failureForestId: string;
  readonly sceneForests: readonly SymbolicSceneCertificate[];
}

export type SymbolicForestLoader = (forestId: string) => unknown;

export interface SymbolicCertificateOptions {
  /** Maximum number of predecessor rounds for the exact completion fixed point. */
  readonly roundLimit?: number;
  /** Copy C and its anchors to a fresh owner after this many nonfixed rounds. */
  readonly completionCompactEvery?: number;
  readonly onProgress?: (progress: SymbolicCertificateProgress) => void;
}

export type SymbolicCertificateProgress =
  | {
      readonly phase: "completion";
      readonly round: number;
      readonly nodes: number;
      readonly fixed: boolean;
    }
  | {
      readonly phase: "failure" | "scene";
      readonly id: string;
      readonly nodes: number;
    };

export interface FailureSeedMetadata {
  readonly id: string;
  readonly kind: FailureKind;
  readonly choiceId: string;
  readonly seedZero: boolean;
}

export interface SymbolicCertificateVerificationResult {
  readonly complete: true;
  /** Owner of the exact recomputed completion root below. */
  readonly model: SymbolicModel;
  /** Exact C = least fixed point of completed ∪ Pre(C), owned by model. */
  readonly completable: Root;
  readonly descriptor: SymbolicModelDescriptor;
  readonly completionRounds: number;
  readonly sceneIds: readonly string[];
  /** Freshly regenerated metadata; no certificate seed verdict is trusted. */
  readonly failureSeeds: readonly FailureSeedMetadata[];
  readonly failureForestId: string;
  readonly checkedSceneForests: number;
  readonly checkedFailureForest: true;
}

export class SymbolicCertificateError extends Error {
  public readonly code = "SYMBOLIC_CERTIFICATE";

  public constructor(message: string) {
    super(message);
    this.name = "SymbolicCertificateError";
  }
}

type Root = number;

interface Anchors {
  readonly validDomain: Root;
  readonly initial: Root;
  readonly playing: Root;
  readonly completed: Root;
}

interface FailureSeed {
  readonly metadata: FailureSeedMetadata;
  readonly root: Root;
}

interface ParsedCertificate {
  readonly descriptor: unknown;
  readonly failureForestId: string;
  readonly sceneForests: readonly SymbolicSceneCertificate[];
}

const DEFAULT_ROUND_LIMIT = 10_000;

function fail(path: string, message: string): never {
  throw new SymbolicCertificateError(`${path}: ${message}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "must be an object");
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const accepted = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!accepted.has(key)) fail(path, `unknown property ${JSON.stringify(key)}`);
  }
}

function own(value: Record<string, unknown>, key: string, path: string): unknown {
  if (!Object.hasOwn(value, key)) fail(path, `missing property ${JSON.stringify(key)}`);
  return value[key];
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) fail(path, "must be a non-empty string");
  return value;
}

function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(path, "must be an array");
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) fail(path, "must not be sparse");
  }
  return value;
}

function parseCertificate(value: unknown): ParsedCertificate {
  const input = record(value, "certificate");
  exactKeys(input, ["schema", "descriptor", "failureForestId", "sceneForests"], "certificate");
  if (own(input, "schema", "certificate") !== SYMBOLIC_CERTIFICATE_SCHEMA) {
    fail("certificate.schema", "unsupported certificate schema");
  }
  const failureForestId = nonEmptyString(own(input, "failureForestId", "certificate"), "certificate.failureForestId");
  const rawScenes = array(own(input, "sceneForests", "certificate"), "certificate.sceneForests");
  const sceneForests = rawScenes.map((entry, index) => {
    const path = `certificate.sceneForests[${index}]`;
    const item = record(entry, path);
    exactKeys(item, ["sceneId", "forestId"], path);
    return Object.freeze({
      sceneId: nonEmptyString(own(item, "sceneId", path), `${path}.sceneId`),
      forestId: nonEmptyString(own(item, "forestId", path), `${path}.forestId`),
    });
  });
  const allForestIds = [failureForestId, ...sceneForests.map(scene => scene.forestId)];
  if (new Set(allForestIds).size !== allForestIds.length) {
    fail("certificate", "forest IDs must be unique");
  }
  return Object.freeze({
    descriptor: own(input, "descriptor", "certificate"),
    failureForestId,
    sceneForests: Object.freeze(sceneForests),
  });
}

function inferOrder(currentVariables: readonly number[], nextVariables: readonly number[]): "interleaved" | "blocked" {
  if (currentVariables.length !== nextVariables.length) {
    throw new Error("symbolic current/next variable arrays have different lengths");
  }
  const bits = currentVariables.length;
  const blocked = currentVariables.every((variable, index) => variable === index
    && nextVariables[index] === bits + index);
  if (blocked) return "blocked";
  const interleaved = currentVariables.every((variable, index) => variable === index * 2
    && nextVariables[index] === index * 2 + 1);
  if (interleaved) return "interleaved";
  throw new Error("symbolic variable arrays do not match a supported strategy");
}

/** Build the producer/verifier descriptor without changing the BDD manager. */
export function certificateDescriptor(model: SymbolicModel): SymbolicModelDescriptor {
  if (!(model instanceof SymbolicModel)) throw new TypeError("model must be a SymbolicModel");
  const order = inferOrder(model.currentVariables, model.nextVariables);
  const anchors = model.bdd.exportForest([
    model.validDomain,
    model.initial,
    model.playing,
    model.completed,
  ]);
  return Object.freeze({
    schema: SYMBOLIC_MODEL_DESCRIPTOR_SCHEMA,
    scenario: model.scenario,
    resources: model.resources,
    flags: model.flags,
    fieldOrder: model.fieldOrder,
    currentVariables: model.currentVariables,
    nextVariables: model.nextVariables,
    variableCount: model.currentVariables.length + model.nextVariables.length,
    order,
    transitionMode: model.transitionMode,
    strategy: Object.freeze({ order, transitionMode: model.transitionMode, fieldOrder: model.fieldOrder }),
    anchors,
  });
}

/** Alias used by preparation scripts. */
export const describeSymbolicModel = certificateDescriptor;

function assertCurrentOnly(owner: SymbolicModel, root: Root, path: string): void {
  if (owner.bdd.exists(root, owner.nextVariables) !== root) {
    fail(path, "forest root must be current-only");
  }
}

function subset(owner: SymbolicModel, left: Root, right: Root, path: string): void {
  if (owner.bdd.and(left, owner.bdd.not(right)) !== 0) fail(path, "set contains a state outside its required superset");
}

function assertAnchors(source: SymbolicModel, target: SymbolicModel, path: string): Anchors {
  const sourceRoots = [source.validDomain, source.initial, source.playing, source.completed] as const;
  const copied = source.bdd.copyForestTo(target.bdd, sourceRoots);
  const expected = [target.validDomain, target.initial, target.playing, target.completed] as const;
  for (let index = 0; index < copied.length; index += 1) {
    if (target.bdd.xor(copied[index]!, expected[index]!) !== 0) {
      fail(path, "copied anchor does not equal the freshly regenerated anchor");
    }
  }
  return Object.freeze({
    validDomain: copied[0]!,
    initial: copied[1]!,
    playing: copied[2]!,
    completed: copied[3]!,
  });
}

function assertFresh(source: SymbolicModel, fresh: SymbolicModel, path: string): void {
  if (fresh === source || fresh.bdd === source.bdd) fail(path, "fresh model must have a distinct BDD owner");
  if (!isDeepStrictEqual(certificateDescriptor(source), certificateDescriptor(fresh))) {
    fail(path, "fresh model descriptor differs from the source model");
  }
}

function copyConeOwner(
  source: SymbolicModel,
  completion: Root,
  failureUnion: Root,
  path: string,
): { readonly model: SymbolicModel; readonly completion: Root; readonly failureUnion: Root; readonly anchors: Anchors } {
  const fresh = source.fresh();
  assertFresh(source, fresh, path);
  const anchors = assertAnchors(source, fresh, path);
  const roots = source.bdd.copyForestTo(fresh.bdd, [completion, failureUnion]);
  assertCurrentOnly(fresh, roots[0]!, `${path}.completion`);
  assertCurrentOnly(fresh, roots[1]!, `${path}.failureUnion`);
  return Object.freeze({
    model: fresh,
    completion: roots[0]!,
    failureUnion: roots[1]!,
    anchors,
  });
}

interface Completion {
  readonly owner: SymbolicModel;
  readonly anchors: Anchors;
  readonly root: Root;
  readonly rounds: number;
}

function computeCompletion(
  source: SymbolicModel,
  roundLimit: number,
  compactEvery: number,
  onProgress: ((progress: SymbolicCertificateProgress) => void) | undefined,
): Completion {
  let owner = source.fresh();
  assertFresh(source, owner, "completion owner");
  let anchors = assertAnchors(source, owner, "completion owner");
  let root = anchors.completed;
  assertCurrentOnly(owner, root, "recomputed completed anchor");
  for (let round = 1; round <= roundLimit; round += 1) {
    const predecessor = owner.preimage(root);
    assertCurrentOnly(owner, predecessor, `completion predecessor ${round}`);
    const next = owner.bdd.or(root, predecessor);
    assertCurrentOnly(owner, next, `completion fixed-point candidate ${round}`);
    const fixed = next === root;
    onProgress?.(Object.freeze({
      phase: "completion",
      round,
      nodes: owner.bdd.stats().nodes,
      fixed,
    }));
    if (fixed) return Object.freeze({ owner, anchors, root, rounds: round });
    root = next;
    if (compactEvery > 0 && round % compactEvery === 0) {
      const fresh = owner.fresh();
      assertFresh(owner, fresh, `completion compaction after round ${round}`);
      const copiedAnchors = assertAnchors(owner, fresh, `completion compaction after round ${round}`);
      const copiedRoot = owner.bdd.copyForestTo(fresh.bdd, [root])[0]!;
      assertCurrentOnly(fresh, copiedRoot, `completion compaction after round ${round}.root`);
      owner = fresh;
      anchors = copiedAnchors;
      root = copiedRoot;
    }
  }
  fail("completion", `fixed point not reached within round limit ${roundLimit}`);
}

function regenerateFailureSeeds(owner: SymbolicModel, anchors: Anchors): {
  readonly seeds: readonly FailureSeed[];
  readonly union: Root;
} {
  const bdd = owner.bdd;
  const invalidDomain = bdd.not(anchors.validDomain);
  assertCurrentOnly(owner, invalidDomain, "recomputed invalid domain");
  if (bdd.and(anchors.initial, invalidDomain) !== 0) fail("model.initial", "initial state is outside the valid domain");
  const seeds: FailureSeed[] = [];
  let union: Root = 0;
  for (const choice of owner.choices) {
    const enabled = choiceRoot(owner, choice.enabled, `${choice.id}.enabled`);
    const arithmeticError = choiceRoot(owner, choice.arithmeticError, `${choice.id}.arithmeticError`);
    const boundExit = choiceRoot(owner, choice.boundExit, `${choice.id}.boundExit`);
    const faults = bdd.or(arithmeticError, boundExit);
    const validSources = owner.preimage(anchors.validDomain, choice);
    const invalidSources = owner.preimage(invalidDomain, choice);
    const uncovered = bdd.and(enabled, bdd.not(bdd.or(faults, validSources)));
    const values: readonly [FailureKind, Root][] = [
      ["arithmetic-error", arithmeticError],
      ["bound-exit", boundExit],
      ["invalid-success", invalidSources],
      ["uncovered-enabled", uncovered],
    ];
    for (const [kind, root] of values) {
      assertCurrentOnly(owner, root, `${kind}:${choice.id}`);
      const metadata = Object.freeze({
        id: `${kind}:${choice.id}`,
        kind,
        choiceId: choice.id,
        seedZero: root === 0,
      });
      seeds.push(Object.freeze({ metadata, root }));
      union = bdd.or(union, root);
    }
  }
  return Object.freeze({ seeds: Object.freeze(seeds), union });
}

function choiceRoot(owner: SymbolicModel, root: Root, path: string): Root {
  assertCurrentOnly(owner, root, path);
  return root;
}

function importedSingle(owner: SymbolicModel, forest: unknown, path: string): Root {
  let roots: readonly number[];
  try {
    roots = owner.bdd.importForest(forest);
  } catch (error) {
    throw new SymbolicCertificateError(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (roots.length !== 1) fail(path, "forest must contain exactly one root");
  return roots[0]!;
}

function checkBadCone(
  owner: SymbolicModel,
  root: Root,
  anchors: Anchors,
  path: string,
): void {
  assertCurrentOnly(owner, root, path);
  subset(owner, root, anchors.playing, `${path}.playing`);
  if (owner.bdd.and(anchors.initial, root) !== 0) fail(path, "cone intersects the initial state");
  const predecessor = owner.preimage(root);
  assertCurrentOnly(owner, predecessor, `${path}.predecessor`);
  subset(owner, predecessor, root, `${path}.predecessor-closed`);
}

/**
 * Verify an untrusted certificate against a freshly recomputed completion
 * fixed point and freshly regenerated failure seeds.  The verifier checks
 * inductive cones rather than trusting a claimed least fixed point or W.
 */
export function verifySymbolicCertificate(
  model: SymbolicModel,
  input: unknown,
  loadForest: SymbolicForestLoader,
  options: SymbolicCertificateOptions = {},
): SymbolicCertificateVerificationResult {
  if (!(model instanceof SymbolicModel)) throw new TypeError("model must be a SymbolicModel");
  if (typeof loadForest !== "function") throw new TypeError("loadForest must be a function");
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  const roundLimit = options.roundLimit ?? DEFAULT_ROUND_LIMIT;
  if (!Number.isSafeInteger(roundLimit) || roundLimit < 1) throw new RangeError("roundLimit must be a positive safe integer");
  const completionCompactEvery = options.completionCompactEvery ?? 1;
  if (!Number.isSafeInteger(completionCompactEvery) || completionCompactEvery < 0) {
    throw new RangeError("completionCompactEvery must be a non-negative safe integer");
  }
  const onProgress = options.onProgress;
  if (onProgress !== undefined && typeof onProgress !== "function") throw new TypeError("onProgress must be a function");
  const certificate = parseCertificate(input);
  const descriptor = certificateDescriptor(model);
  if (!isDeepStrictEqual(certificate.descriptor, descriptor)) {
    fail("certificate.descriptor", "does not match the current symbolic model");
  }

  const sceneIds = model.scenario.scenes.map(scene => scene.id);
  if (certificate.sceneForests.length !== sceneIds.length) {
    fail("certificate.sceneForests", `must contain exactly ${sceneIds.length} authored scenes`);
  }
  for (let index = 0; index < sceneIds.length; index += 1) {
    if (certificate.sceneForests[index]!.sceneId !== sceneIds[index]) {
      fail("certificate.sceneForests", "must list the exact authored scene catalog in scenario order");
    }
  }

  let completionResult: Completion | undefined = computeCompletion(model, roundLimit, completionCompactEvery, onProgress);
  let fixedOwner: SymbolicModel | undefined = completionResult.owner;
  let completionRoot: Root | undefined = completionResult.root;
  let anchors: Anchors | undefined = completionResult.anchors;
  const completionRounds = completionResult.rounds;
  // Keep only the extracted roots below; this releases the temporary result
  // wrapper so the verified base owner can replace the construction owner.
  completionResult = undefined;
  if (fixedOwner === undefined || anchors === undefined || completionRoot === undefined) {
    fail("completion", "completion owner was lost before failure regeneration");
  }
  let regenerated: ReturnType<typeof regenerateFailureSeeds> | undefined = regenerateFailureSeeds(fixedOwner, anchors);
  let verifiedFailureOwner: SymbolicModel | undefined;
  let verifiedFailureRoot: Root | undefined;
  let verifiedCompletionRoot: Root | undefined;

  // The failure forest is imported into a disposable owner together with
  // copied C, anchors, and every regenerated seed. No source numeric handle
  // crosses the owner boundary.
  {
    if (fixedOwner === undefined || completionRoot === undefined || regenerated === undefined) {
      fail("failure forest", "completion owner was lost before seed verification");
    }
    const cone = copyConeOwner(fixedOwner, completionRoot, regenerated.union, "failure cone owner");
    const copiedSeeds = fixedOwner.bdd.copyForestTo(
      cone.model.bdd,
      regenerated.seeds.map(seed => seed.root),
    );
    let rawForest: unknown;
    try {
      rawForest = loadForest(certificate.failureForestId);
    } catch (error) {
      throw new SymbolicCertificateError(`failure forest ${certificate.failureForestId}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const failure = importedSingle(cone.model, rawForest, "failure forest");
    checkBadCone(cone.model, failure, cone.anchors, "failure forest");
    for (let index = 0; index < copiedSeeds.length; index += 1) {
      subset(cone.model, copiedSeeds[index]!, failure, `failure seed ${regenerated.seeds[index]!.metadata.id}`);
    }
    onProgress?.(Object.freeze({ phase: "failure", id: certificate.failureForestId, nodes: cone.model.bdd.stats().nodes }));

    // Keep only one compact owner alive for scene checks. It contains the
    // verified BF and C plus copied anchors; the construction/failure-check
    // owners can then be reclaimed without changing any numeric root owner.
    const verifiedBase = copyConeOwner(
      cone.model,
      cone.completion,
      failure,
      "verified base owner",
    );
    verifiedFailureOwner = verifiedBase.model;
    verifiedFailureRoot = verifiedBase.failureUnion;
    verifiedCompletionRoot = verifiedBase.completion;
  }

  // No scene cone needs the completion owner's temporary predecessor nodes or
  // raw failure seed union. Keep only the verified copied roots and metadata.
  if (regenerated === undefined) fail("failure forest", "failure metadata was lost after verification");
  const failureMetadata = Object.freeze(regenerated.seeds.map(seed => seed.metadata));
  fixedOwner = undefined;
  completionRoot = undefined;
  anchors = undefined;
  regenerated = undefined;

  if (verifiedFailureOwner === undefined || verifiedFailureRoot === undefined || verifiedCompletionRoot === undefined) {
    fail("failure forest", "verification owner was not established");
  }
  const resultOwner = verifiedFailureOwner;
  const resultCompletionRoot = verifiedCompletionRoot;

  for (const sceneCertificate of certificate.sceneForests) {
    const cone = copyConeOwner(verifiedFailureOwner, verifiedCompletionRoot, verifiedFailureRoot, `scene ${sceneCertificate.sceneId} owner`);
    let rawForest: unknown;
    try {
      rawForest = loadForest(sceneCertificate.forestId);
    } catch (error) {
      throw new SymbolicCertificateError(`scene forest ${sceneCertificate.sceneId}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const sceneCone = importedSingle(cone.model, rawForest, `scene forest ${sceneCertificate.sceneId}`);
    checkBadCone(cone.model, sceneCone, cone.anchors, `scene forest ${sceneCertificate.sceneId}`);

    // Copy the failure certificate into this disposable scene owner so the
    // coverage check compares only handles owned by that owner.
    const scenePredicate = cone.model.atScene(sceneCertificate.sceneId);
    const playingScene = cone.model.bdd.and(cone.anchors.playing, scenePredicate);
    const uncovered = cone.model.bdd.and(
      playingScene,
      cone.model.bdd.not(cone.completion),
    );
    const covered = cone.model.bdd.or(sceneCone, cone.failureUnion);
    subset(cone.model, uncovered, covered, `scene ${sceneCertificate.sceneId} coverage`);
    onProgress?.(Object.freeze({ phase: "scene", id: sceneCertificate.sceneId, nodes: cone.model.bdd.stats().nodes }));
  }

  return Object.freeze({
    complete: true,
    model: resultOwner,
    completable: resultCompletionRoot,
    descriptor,
    completionRounds,
    sceneIds: Object.freeze([...sceneIds]),
    failureSeeds: failureMetadata,
    failureForestId: certificate.failureForestId,
    checkedSceneForests: sceneIds.length,
    checkedFailureForest: true,
  });
}

/** Descriptive alias for callers that use the longer proof name. */
export const verifyCompletionSafetyCertificate = verifySymbolicCertificate;
