import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILD_ID, createBuildId } from "../engine/build-id.js";
import { SCENARIO } from "../engine/content.js";
import {
  openFactorizedCertificateBundle,
  type CertificateBundleExpectedBindings,
  type CertificateCatalog,
  type CertificateSourceBinding,
} from "./certificate-bundle.js";
import { hashBytes, readBoundedBytes } from "./certificate-files.js";
import { FAILURE_KINDS } from "./symbolic-certificates.js";
import {
  verifyFactorizedSymbolicCertificate,
  type FactorizedCertificateProgress,
  type FactorizedCertificateVerificationResult,
} from "./symbolic-factorized-certificates.js";
import { SymbolicModel } from "./symbolic-model.js";

/** These bounds are obligations of the verifier, never clamps on gameplay. */
export const CAMPAIGN_RESOURCE_BOUNDS = Object.freeze({
  supplies: 4,
  medicine: 4,
  debt: 14,
  risk: 19,
  tools: 1,
  water: 2,
  evacuees: 8,
  "archive-evidence": 11,
  tide: 3,
  "reedway-regulator": 5,
});

export const CAMPAIGN_CERTIFICATE_CONFIG = Object.freeze({
  verifier: Object.freeze({
    nodeLimit: 3_000_000,
    cacheLimit: 500_000,
    roundLimit: 128,
    order: "interleaved" as const,
    transitionMode: "relational" as const,
    completionCompactEvery: 1,
    coneCompactAt: 1_250_000,
  }),
  generation: Object.freeze({
    roundLimit: 128,
    nonCompletionMode: "failure-absorbed",
    nonCompletionPartition: "scene",
    obligationCompactEvery: 1,
    fixedPointCompactEvery: 1,
    failurePartition: "choice",
  }),
  runtimePolicy: Object.freeze({
    checkedElapsedMs: 3_600_000,
    externalTimeoutMs: 3_630_000,
    nodeMaxOldSpaceSizeMiB: 1536,
  }),
});

// Role membership is supplied by this release, never by a certificate file.
export const CAMPAIGN_CERTIFICATE_SOURCE_ROLES = Object.freeze({
  generatorCore: Object.freeze([
    "src/verification/bdd.ts",
    "src/verification/symbolic-certificates.ts",
    "src/verification/symbolic-model.ts",
    "src/verification/symbolic-obligations.ts",
    "src/verification/symbolic-properties.ts",
    "src/verification/symbolic-replay.ts",
  ]),
  runtimeVerifier: Object.freeze([
    "src/verification/campaign-certificate.ts",
    "src/verification/symbolic-factorized-certificates.ts",
    "tests/helpers/campaign-certificate-runner.ts",
  ]),
  artifactIO: Object.freeze([
    "src/verification/certificate-bundle.ts",
    "src/verification/certificate-files.ts",
  ]),
});

export const CAMPAIGN_CERTIFICATE_MANIFEST_PATH = "certificates/campaign/manifest.json";
const MAX_SOURCE_FILE_BYTES = 16 * 1024 * 1024;

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** A compiled invocation must never silently consume a source-mode proof. */
export function campaignCertificateRoot(): string {
  const filename = fileURLToPath(import.meta.url);
  const root = resolve(dirname(filename), "../..");
  assert.equal(filename, join(root, "src/verification/campaign-certificate.ts"),
    "Campaign certificate verification requires the source-mode TypeScript entrypoint");
  return root;
}

function sourcePaths(root: string, directory: string): string[] {
  const absolute = join(root, directory);
  const stat = lstatSync(absolute);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), `${directory} must be a real directory`);
  return readdirSync(absolute).flatMap(name => {
    const path = `${directory}/${name}`;
    const entry = lstatSync(join(root, path));
    assert(!entry.isSymbolicLink(), `Source input must not be a symlink: ${path}`);
    if (entry.isDirectory()) return sourcePaths(root, path);
    assert(entry.isFile(), `Source input must be a regular file: ${path}`);
    return [path];
  });
}

function sourceBinding(root: string, paths: readonly string[]): CertificateSourceBinding {
  const files = Object.freeze([...paths].sort(comparePaths).map(path => Object.freeze({
    path,
    sha256: hashBytes(readBoundedBytes(join(root, path), MAX_SOURCE_FILE_BYTES)),
  })));
  return Object.freeze({ files, sourceHash: hashBytes(Buffer.from(JSON.stringify(files), "utf8")) });
}

export function campaignCertificateCatalog(): CertificateCatalog {
  const endingPairs: (readonly [string, string])[] = [];
  const seen = new Set<string>();
  for (const choice of SCENARIO.choices) {
    if (!choice.outcome) continue;
    const pair = Object.freeze([choice.outcome.status, choice.outcome.summary] as const);
    const key = JSON.stringify(pair);
    if (!seen.has(key)) {
      seen.add(key);
      endingPairs.push(pair);
    }
  }
  return Object.freeze({
    sceneIds: Object.freeze(SCENARIO.scenes.map(scene => scene.id)),
    choiceIds: Object.freeze(SCENARIO.choices.map(choice => choice.id)),
    failureIds: Object.freeze(SCENARIO.choices.flatMap(choice => FAILURE_KINDS.map(kind => `${kind}:${choice.id}`))),
    endingPairs: Object.freeze(endingPairs),
  });
}

/** Recompute complete current source bindings; no manifest or old verdict is read. */
export function currentCampaignCertificateBindings(): CertificateBundleExpectedBindings {
  const root = campaignCertificateRoot();
  const verifierPaths = Object.values(CAMPAIGN_CERTIFICATE_SOURCE_ROLES).flat()
    .filter(path => path.startsWith("src/verification/")).sort(comparePaths);
  assert.deepEqual(sourcePaths(root, "src/verification").sort(comparePaths), verifierPaths,
    "Every verification source file must have an explicit certificate role");
  const paths = ["package.json", "package-lock.json", "tsconfig.json",
    ...sourcePaths(root, "src/engine"), ...sourcePaths(root, "src/content")].sort(comparePaths);
  const buildDigest = createHash("sha256").update("runtime-mode:source").update("\0");
  for (const path of paths) {
    buildDigest.update(path).update("\0")
      .update(readBoundedBytes(join(root, path), MAX_SOURCE_FILE_BYTES)).update("\0");
  }
  const buildId = `af9-${buildDigest.digest("hex").slice(0, 24)}`;
  assert.equal(buildId, createBuildId(), "Certificate source inputs differ from createBuildId inputs");
  assert.equal(buildId, BUILD_ID, "Gameplay source changed after engine modules were loaded");
  return Object.freeze({
    build: Object.freeze({ runtimeMode: "source", buildId, inputs: sourceBinding(root, paths) }),
    generatorCore: sourceBinding(root, CAMPAIGN_CERTIFICATE_SOURCE_ROLES.generatorCore),
    runtimeVerifier: sourceBinding(root, CAMPAIGN_CERTIFICATE_SOURCE_ROLES.runtimeVerifier),
    artifactIO: sourceBinding(root, CAMPAIGN_CERTIFICATE_SOURCE_ROLES.artifactIO),
    config: CAMPAIGN_CERTIFICATE_CONFIG,
    bounds: CAMPAIGN_RESOURCE_BOUNDS,
    catalog: campaignCertificateCatalog(),
  });
}

export interface CampaignCertificateAudit {
  readonly schema: "af9-campaign-certificate-audit-v1";
  readonly complete: true;
  readonly buildId: string;
  readonly completionRounds: number;
  readonly completionOrFailureRounds: number;
  readonly checkedSceneIds: readonly string[];
  readonly checkedFailureSeedIds: readonly string[];
  readonly loadedForestIds: readonly string[];
  readonly globalCompletableAssignments: string;
  readonly elapsedMs: number;
  readonly scope: Readonly<{
    readonly exactCompletionRecomputed: true;
    readonly exactCompletionOrFailureRecomputed: true;
    readonly backwardSafetyCertificatesVerified: true;
    readonly sourceIntegrityRechecked: true;
    readonly reachableStateCountClaimed: false;
    readonly exactNonCompletionRecomputed: false;
    readonly leastBadConesClaimed: false;
  }>;
}

export interface CampaignCertificateAuditResult {
  /** Both verified least fixed points and their exact BDD owner. */
  readonly verification: FactorizedCertificateVerificationResult;
  readonly report: CampaignCertificateAudit;
}

/** Fresh exact C and W plus every source-failure and scene closure obligation. */
export function auditCampaignCertificate(
  onProgress?: (event: FactorizedCertificateProgress) => void,
): CampaignCertificateAuditResult {
  const started = performance.now();
  const expected = currentCampaignCertificateBindings();
  const bundle = openFactorizedCertificateBundle({
    repositoryRoot: campaignCertificateRoot(),
    manifestPath: join(campaignCertificateRoot(), CAMPAIGN_CERTIFICATE_MANIFEST_PATH),
    expected,
  });
  const checkTime = (): void => {
    assert(performance.now() - started <= CAMPAIGN_CERTIFICATE_CONFIG.runtimePolicy.checkedElapsedMs,
      "Campaign certificate checked time limit exceeded");
  };
  checkTime();
  const model = new SymbolicModel(SCENARIO, CAMPAIGN_RESOURCE_BOUNDS, CAMPAIGN_CERTIFICATE_CONFIG.verifier);
  const result = verifyFactorizedSymbolicCertificate(model, bundle.manifest.certificate, bundle.loadForest, {
    roundLimit: CAMPAIGN_CERTIFICATE_CONFIG.verifier.roundLimit,
    completionCompactEvery: CAMPAIGN_CERTIFICATE_CONFIG.verifier.completionCompactEvery,
    coneCompactAt: CAMPAIGN_CERTIFICATE_CONFIG.verifier.coneCompactAt,
    onProgress: event => { checkTime(); onProgress?.(event); },
  });
  assert.equal(result.complete, true);
  assert.notStrictEqual(result.model, model, "Completion result must have its fresh owner");
  assert.deepEqual(result.sceneIds, expected.catalog.sceneIds);
  assert.deepEqual(result.failureSeeds.map(seed => seed.id), expected.catalog.failureIds);
  assert.equal(result.checkedSceneForests, expected.catalog.sceneIds.length);
  assert.equal(result.checkedFailureForests, expected.catalog.failureIds.length);
  const loadedForestIds = bundle.loadedForestIds();
  assert.deepEqual(loadedForestIds, [...expected.catalog.failureIds,
    ...expected.catalog.sceneIds.map(id => `non-completion:scene:${id}`)]);
  assert.equal(result.model.bdd.exists(result.completable, result.model.nextVariables), result.completable);
  assert.equal(result.model.bdd.exists(result.completionOrFailure, result.model.nextVariables), result.completionOrFailure);
  const globalCompletableAssignments = result.model.bdd.count(result.completable, result.model.currentVariables).toString();
  bundle.recheckIntegrity();
  assert.deepEqual(currentCampaignCertificateBindings(), expected, "Current source bindings changed during verification");
  checkTime();
  const report: CampaignCertificateAudit = Object.freeze({
    schema: "af9-campaign-certificate-audit-v1",
    complete: true,
    buildId: expected.build.buildId,
    completionRounds: result.completionRounds,
    completionOrFailureRounds: result.completionOrFailureRounds,
    checkedSceneIds: result.sceneIds,
    checkedFailureSeedIds: Object.freeze(result.failureSeeds.map(seed => seed.id)),
    loadedForestIds,
    globalCompletableAssignments,
    elapsedMs: performance.now() - started,
    scope: Object.freeze({
      exactCompletionRecomputed: true,
      exactCompletionOrFailureRecomputed: true,
      backwardSafetyCertificatesVerified: true,
      sourceIntegrityRechecked: true,
      reachableStateCountClaimed: false,
      exactNonCompletionRecomputed: false,
      leastBadConesClaimed: false,
    }),
  });
  return Object.freeze({ verification: result, report });
}
