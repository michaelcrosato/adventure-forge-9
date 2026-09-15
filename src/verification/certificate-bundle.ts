import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  readSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  hashBytes,
  parseJsonBytes,
  readBoundedBytes,
  readForestArtifact,
  validateForestArtifact,
  type CertificateFileLimits,
  type ForestArtifact,
} from "./certificate-files.js";

export const CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA = "af9-campaign-certificate-manifest-v1" as const;
export const SYMBOLIC_CERTIFICATE_SCHEMA = "af9-symbolic-certificate-v1" as const;
export const SYMBOLIC_DESCRIPTOR_SCHEMA = "af9-symbolic-model-descriptor-v1" as const;
export const FACTORIZED_CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA = "af9-campaign-factorized-certificate-manifest-v1" as const;
export const FACTORIZED_CERTIFICATE_SCHEMA = "af9-symbolic-factorized-certificate-v1" as const;

export interface CertificateSourceFile {
  readonly path: string;
  readonly sha256: string;
}

export interface CertificateSourceBinding {
  readonly files: readonly CertificateSourceFile[];
  readonly sourceHash: string;
}

export interface CertificateBuildBinding {
  readonly runtimeMode: "source";
  readonly buildId: string;
  readonly inputs: CertificateSourceBinding;
}

export interface CertificateCatalog {
  readonly sceneIds: readonly string[];
  readonly choiceIds: readonly string[];
  readonly failureIds: readonly string[];
  readonly endingPairs: readonly (readonly [string, string])[];
}

export interface CertificateSceneForest {
  readonly sceneId: string;
  readonly forestId: string;
}

export interface CertificatePayload {
  readonly schema: typeof SYMBOLIC_CERTIFICATE_SCHEMA;
  readonly descriptor: Record<string, unknown>;
  readonly failureForestId: string;
  readonly sceneForests: readonly CertificateSceneForest[];
}

export interface CertificateForestSet {
  readonly directory: string;
  readonly entries: readonly ForestArtifact[];
  readonly totalJsonBytes: number;
  readonly totalCompressedBytes: number;
  readonly limits: CertificateFileLimits;
}

export interface CertificateBundleManifest {
  readonly schema: typeof CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA;
  readonly build: CertificateBuildBinding;
  readonly generatorCore: CertificateSourceBinding;
  readonly runtimeVerifier: CertificateSourceBinding;
  readonly artifactIO: CertificateSourceBinding;
  readonly config: Record<string, unknown>;
  readonly bounds: Readonly<Record<string, number>>;
  readonly certificate: CertificatePayload;
  readonly catalog: CertificateCatalog;
  readonly forests: CertificateForestSet;
}

export interface FactorizedCertificatePayload {
  readonly schema: typeof FACTORIZED_CERTIFICATE_SCHEMA;
  readonly descriptor: Record<string, unknown>;
  readonly sceneForests: readonly CertificateSceneForest[];
  readonly failureForests: readonly { readonly seedId: string; readonly forestId: string }[];
}

type SharedCertificateManifest = Omit<CertificateBundleManifest, "schema" | "certificate">;

export interface FactorizedCertificateBundleManifest extends SharedCertificateManifest {
  readonly schema: typeof FACTORIZED_CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA;
  readonly certificate: FactorizedCertificatePayload;
}

/** Bindings computed by the current release, rather than taken from the manifest. */
export interface CertificateBundleExpectedBindings {
  readonly build: CertificateBuildBinding;
  readonly generatorCore: CertificateSourceBinding;
  readonly runtimeVerifier: CertificateSourceBinding;
  readonly artifactIO: CertificateSourceBinding;
  readonly config: Record<string, unknown>;
  readonly bounds: Readonly<Record<string, number>>;
  readonly catalog: CertificateCatalog;
}

export interface CertificateBundleLimits {
  readonly maxManifestBytes: number;
  readonly maxDescriptorBytes: number;
  readonly file: CertificateFileLimits;
  readonly maxTotalJsonBytes: number;
  readonly maxTotalCompressedBytes: number;
}

export const DEFAULT_CERTIFICATE_BUNDLE_LIMITS: CertificateBundleLimits = Object.freeze({
  maxManifestBytes: 4 * 1024 * 1024,
  maxDescriptorBytes: 2 * 1024 * 1024,
  file: Object.freeze({
    maxNodes: 8_000_000,
    maxJsonBytes: 128 * 1024 * 1024,
    maxCompressedBytes: 32 * 1024 * 1024,
  }),
  maxTotalJsonBytes: 512 * 1024 * 1024,
  maxTotalCompressedBytes: 128 * 1024 * 1024,
});

export interface OpenCertificateBundleOptions {
  readonly repositoryRoot: string;
  readonly manifestPath: string;
  readonly expected: CertificateBundleExpectedBindings;
  readonly limits?: CertificateBundleLimits;
}

export interface CertificateBundle {
  readonly repositoryRoot: string;
  readonly manifestPath: string;
  readonly manifest: CertificateBundleManifest;
  /** Forests are read and parsed only when this resolver is called. */
  readonly loadForest: (forestId: string) => unknown;
  readonly loadedForestIds: () => readonly string[];
  /** Rechecks the manifest, current source bindings, exact directory and every forest byte. */
  readonly recheckIntegrity: () => void;
}

export interface FactorizedCertificateBundle extends Omit<CertificateBundle, "manifest"> {
  readonly manifest: FactorizedCertificateBundleManifest;
}

type OpenedBundle<M extends SharedCertificateManifest> = Omit<CertificateBundle, "manifest"> & {
  readonly manifest: M;
};

type ManifestParser<M extends SharedCertificateManifest> =
  (value: unknown, limits: CertificateBundleLimits) => M;

const MANIFEST_KEYS = [
  "schema",
  "build",
  "generatorCore",
  "runtimeVerifier",
  "artifactIO",
  "config",
  "bounds",
  "certificate",
  "catalog",
  "forests",
] as const;
const BUILD_KEYS = ["runtimeMode", "buildId", "inputs"] as const;
const SOURCE_BINDING_KEYS = ["files", "sourceHash"] as const;
const SOURCE_FILE_KEYS = ["path", "sha256"] as const;
const CATALOG_KEYS = ["sceneIds", "choiceIds", "failureIds", "endingPairs"] as const;
const CERTIFICATE_KEYS = ["schema", "descriptor", "failureForestId", "sceneForests"] as const;
const SCENE_FOREST_KEYS = ["sceneId", "forestId"] as const;
const FACTORIZED_CERTIFICATE_KEYS = ["schema", "descriptor", "sceneForests", "failureForests"] as const;
const FAILURE_FOREST_KEYS = ["seedId", "forestId"] as const;
const FOREST_SET_KEYS = ["directory", "entries", "totalJsonBytes", "totalCompressedBytes", "limits"] as const;
const DESCRIPTOR_KEYS = [
  "schema",
  "scenario",
  "resources",
  "flags",
  "fieldOrder",
  "currentVariables",
  "nextVariables",
  "variableCount",
  "order",
  "transitionMode",
  "strategy",
  "anchors",
] as const;
const STRATEGY_KEYS = ["order", "transitionMode", "fieldOrder"] as const;
const ANCHOR_KEYS = ["schema", "variableCount", "roots", "nodes"] as const;

function record(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Reflect.ownKeys(value).sort(), [...keys].sort(), `${label} fields differ`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of keys) {
    const descriptor = descriptors[key];
    assert(descriptor && Object.hasOwn(descriptor, "value") && descriptor.enumerable, `${label}.${key} must be an own data field`);
  }
  return value as Record<string, unknown>;
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  for (const key of Reflect.ownKeys(value)) {
    assert(typeof key === "string", `${label} must not contain symbol keys`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    assert(descriptor && Object.hasOwn(descriptor, "value") && descriptor.enumerable, `${label}.${key} must be an own data field`);
  }
  return value as Record<string, unknown>;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    if (!Object.isFrozen(value)) Object.freeze(value);
  }
  return value;
}

function nonEmptyString(value: unknown, label: string): string {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  return value;
}

function hash(value: unknown, label: string): string {
  const result = nonEmptyString(value, label);
  assert(/^[0-9a-f]{64}$/.test(result), `${label} must be a lowercase SHA-256`);
  return result;
}

function integer(value: unknown, minimum: number, label: string): number {
  assert(typeof value === "number" && Number.isSafeInteger(value) && value >= minimum, `${label} outside limits`);
  return value;
}

function addSafe(total: number, value: number, label: string): number {
  assert(total <= Number.MAX_SAFE_INTEGER - value, `${label} exceeds safe integer range`);
  return total + value;
}

function denseArray(value: unknown, label: string): readonly unknown[] {
  assert(Array.isArray(value), `${label} must be an array`);
  for (let index = 0; index < value.length; index += 1) {
    assert(Object.hasOwn(value, index), `${label} must not be sparse`);
  }
  return value;
}

function stringArray(value: unknown, label: string): readonly string[] {
  return Object.freeze(denseArray(value, label).map((entry, index) => nonEmptyString(entry, `${label}[${index}]`)));
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values: readonly string[], label: string): readonly string[] {
  const sorted = [...values].sort(compareCodeUnits);
  assert.deepEqual(values, sorted, `${label} must be sorted`);
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
  return values;
}

function sourceHash(files: readonly CertificateSourceFile[]): string {
  const canonical = JSON.stringify(files.map(file => ({ path: file.path, sha256: file.sha256 })));
  return hashBytes(Buffer.from(canonical, "utf8"));
}

function parseSourceBinding(value: unknown, label: string): CertificateSourceBinding {
  const data = record(value, SOURCE_BINDING_KEYS, label);
  const rawFiles = denseArray(data.files, `${label}.files`);
  const files = Object.freeze(rawFiles.map((entry, index) => {
    const file = record(entry, SOURCE_FILE_KEYS, `${label}.files[${index}]`);
    return Object.freeze({
      path: nonEmptyString(file.path, `${label}.files[${index}].path`),
      sha256: hash(file.sha256, `${label}.files[${index}].sha256`),
    });
  }));
  sortedUnique(files.map(file => file.path), `${label}.files`);
  assert.equal(data.sourceHash, sourceHash(files), `${label}.sourceHash mismatch`);
  return Object.freeze({ files, sourceHash: data.sourceHash as string });
}

function parseBuild(value: unknown): CertificateBuildBinding {
  const data = record(value, BUILD_KEYS, "build");
  assert.equal(data.runtimeMode, "source", "build.runtimeMode must be source");
  const buildId = nonEmptyString(data.buildId, "build.buildId");
  assert(/^af9-[0-9a-f]{24}$/.test(buildId), "build.buildId has invalid format");
  return Object.freeze({
    runtimeMode: "source",
    buildId,
    inputs: parseSourceBinding(data.inputs, "build.inputs"),
  });
}

function parseConfig(value: unknown): Record<string, unknown> {
  return deepFreeze({ ...objectRecord(value, "config") });
}

function parseBounds(value: unknown): Readonly<Record<string, number>> {
  const data = objectRecord(value, "bounds");
  const result = Object.fromEntries(Object.entries(data).map(([name, raw]) => {
    nonEmptyString(name, "bounds key");
    return [name, integer(raw, 0, `bounds.${name}`)];
  }));
  return Object.freeze(result);
}

function parseDescriptor(value: unknown, maximumBytes: number): Record<string, unknown> {
  const data = record(value, DESCRIPTOR_KEYS, "certificate.descriptor");
  assert.equal(data.schema, SYMBOLIC_DESCRIPTOR_SCHEMA, "unsupported descriptor schema");
  assert(data.scenario !== null && typeof data.scenario === "object" && !Array.isArray(data.scenario), "descriptor.scenario must be an object");
  for (const key of ["resources", "flags", "fieldOrder", "currentVariables", "nextVariables"] as const) {
    denseArray(data[key], `descriptor.${key}`);
  }
  stringArray(data.resources, "descriptor.resources");
  stringArray(data.flags, "descriptor.flags");
  stringArray(data.fieldOrder, "descriptor.fieldOrder");
  for (const key of ["currentVariables", "nextVariables"] as const) {
    denseArray(data[key], `descriptor.${key}`).forEach((entry, index) => integer(entry, 0, `descriptor.${key}[${index}]`));
  }
  integer(data.variableCount, 0, "descriptor.variableCount");
  assert(data.order === "interleaved" || data.order === "blocked", "descriptor.order is invalid");
  assert(data.transitionMode === "relational" || data.transitionMode === "partitioned", "descriptor.transitionMode is invalid");
  const strategy = record(data.strategy, STRATEGY_KEYS, "descriptor.strategy");
  assert(strategy.order === data.order, "descriptor.strategy.order mismatch");
  assert(strategy.transitionMode === data.transitionMode, "descriptor.strategy.transitionMode mismatch");
  assert.deepEqual(strategy.fieldOrder, data.fieldOrder, "descriptor.strategy.fieldOrder mismatch");
  const anchors = record(data.anchors, ANCHOR_KEYS, "descriptor.anchors");
  assert.equal(anchors.schema, "af9-bdd-forest-v1", "descriptor.anchors schema mismatch");
  integer(anchors.variableCount, 0, "descriptor.anchors.variableCount");
  denseArray(anchors.roots, "descriptor.anchors.roots");
  denseArray(anchors.nodes, "descriptor.anchors.nodes");
  const serializedBytes = Buffer.byteLength(JSON.stringify(data), "utf8");
  assert(serializedBytes <= maximumBytes, "descriptor exceeds metadata limit");
  return Object.freeze({ ...data });
}

function parseCatalog(value: unknown): CertificateCatalog {
  const data = record(value, CATALOG_KEYS, "catalog");
  const sceneIds = stringArray(data.sceneIds, "catalog.sceneIds");
  const choiceIds = stringArray(data.choiceIds, "catalog.choiceIds");
  const failureIds = stringArray(data.failureIds, "catalog.failureIds");
  for (const [label, values] of [["catalog.sceneIds", sceneIds], ["catalog.choiceIds", choiceIds], ["catalog.failureIds", failureIds]] as const) {
    assert.equal(new Set(values).size, values.length, `${label} must be unique`);
  }
  const endingPairs = Object.freeze(denseArray(data.endingPairs, "catalog.endingPairs").map((entry, index) => {
    const pair = denseArray(entry, `catalog.endingPairs[${index}]`);
    assert.equal(pair.length, 2, `catalog.endingPairs[${index}] must contain two strings`);
    return Object.freeze([
      nonEmptyString(pair[0], `catalog.endingPairs[${index}][0]`),
      nonEmptyString(pair[1], `catalog.endingPairs[${index}][1]`),
    ] as const);
  }));
  return Object.freeze({ sceneIds, choiceIds, failureIds, endingPairs });
}

function parseCertificate(value: unknown, maximumDescriptorBytes: number): CertificatePayload {
  const data = record(value, CERTIFICATE_KEYS, "certificate");
  assert.equal(data.schema, SYMBOLIC_CERTIFICATE_SCHEMA, "unsupported certificate schema");
  const failureForestId = nonEmptyString(data.failureForestId, "certificate.failureForestId");
  const sceneForests = Object.freeze(denseArray(data.sceneForests, "certificate.sceneForests").map((entry, index) => {
    const scene = record(entry, SCENE_FOREST_KEYS, `certificate.sceneForests[${index}]`);
    return Object.freeze({
      sceneId: nonEmptyString(scene.sceneId, `certificate.sceneForests[${index}].sceneId`),
      forestId: nonEmptyString(scene.forestId, `certificate.sceneForests[${index}].forestId`),
    });
  }));
  return deepFreeze({
    schema: SYMBOLIC_CERTIFICATE_SCHEMA,
    descriptor: parseDescriptor(data.descriptor, maximumDescriptorBytes),
    failureForestId,
    sceneForests,
  });
}

function parseFactorizedCertificate(value: unknown, maximumDescriptorBytes: number): FactorizedCertificatePayload {
  const data = record(value, FACTORIZED_CERTIFICATE_KEYS, "certificate");
  assert.equal(data.schema, FACTORIZED_CERTIFICATE_SCHEMA, "unsupported factorized certificate schema");
  const sceneForests = Object.freeze(denseArray(data.sceneForests, "certificate.sceneForests").map((entry, index) => {
    const scene = record(entry, SCENE_FOREST_KEYS, `certificate.sceneForests[${index}]`);
    return Object.freeze({
      sceneId: nonEmptyString(scene.sceneId, `certificate.sceneForests[${index}].sceneId`),
      forestId: nonEmptyString(scene.forestId, `certificate.sceneForests[${index}].forestId`),
    });
  }));
  const failureForests = Object.freeze(denseArray(data.failureForests, "certificate.failureForests").map((entry, index) => {
    const failure = record(entry, FAILURE_FOREST_KEYS, `certificate.failureForests[${index}]`);
    return Object.freeze({
      seedId: nonEmptyString(failure.seedId, `certificate.failureForests[${index}].seedId`),
      forestId: nonEmptyString(failure.forestId, `certificate.failureForests[${index}].forestId`),
    });
  }));
  return deepFreeze({
    schema: FACTORIZED_CERTIFICATE_SCHEMA,
    descriptor: parseDescriptor(data.descriptor, maximumDescriptorBytes),
    sceneForests,
    failureForests,
  });
}

function normalizeLimits(value: CertificateBundleLimits): CertificateBundleLimits {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), "bundle limits must be an object");
  return Object.freeze({
    maxManifestBytes: integer(value.maxManifestBytes, 1, "maxManifestBytes"),
    maxDescriptorBytes: integer(value.maxDescriptorBytes, 1, "maxDescriptorBytes"),
    file: Object.freeze({
      maxNodes: integer(value.file.maxNodes, 1, "file.maxNodes"),
      maxJsonBytes: integer(value.file.maxJsonBytes, 1, "file.maxJsonBytes"),
      maxCompressedBytes: integer(value.file.maxCompressedBytes, 1, "file.maxCompressedBytes"),
    }),
    maxTotalJsonBytes: integer(value.maxTotalJsonBytes, 0, "maxTotalJsonBytes"),
    maxTotalCompressedBytes: integer(value.maxTotalCompressedBytes, 0, "maxTotalCompressedBytes"),
  });
}

function parseForestSet(value: unknown, limits: CertificateBundleLimits): CertificateForestSet {
  const data = record(value, FOREST_SET_KEYS, "forests");
  const directory = nonEmptyString(data.directory, "forests.directory");
  const entries = Object.freeze(denseArray(data.entries, "forests.entries").map((entry, index) => {
    return validateForestArtifact(entry, limits.file) as ForestArtifact;
  }));
  const ids = entries.map(entry => entry.id);
  const files = entries.map(entry => entry.file);
  assert.equal(new Set(ids).size, ids.length, "forest IDs must be unique");
  assert.equal(new Set(files).size, files.length, "forest filenames must be unique");
  const totalJsonBytes = integer(data.totalJsonBytes, 0, "forests.totalJsonBytes");
  const totalCompressedBytes = integer(data.totalCompressedBytes, 0, "forests.totalCompressedBytes");
  const calculatedJsonBytes = entries.reduce((sum, entry) => addSafe(sum, entry.jsonBytes, "forest JSON total"), 0);
  const calculatedCompressedBytes = entries.reduce((sum, entry) => addSafe(sum, entry.bytes, "forest compressed total"), 0);
  assert.equal(totalJsonBytes, calculatedJsonBytes, "forest JSON total mismatch");
  assert.equal(totalCompressedBytes, calculatedCompressedBytes, "forest compressed total mismatch");
  assert(totalJsonBytes <= limits.maxTotalJsonBytes, "forest JSON cumulative limit exceeded");
  assert(totalCompressedBytes <= limits.maxTotalCompressedBytes, "forest compressed cumulative limit exceeded");
  const declaredLimits = record(data.limits, ["maxNodes", "maxJsonBytes", "maxCompressedBytes"], "forests.limits");
  const fileLimits = Object.freeze({
    maxNodes: integer(declaredLimits.maxNodes, 1, "forests.limits.maxNodes"),
    maxJsonBytes: integer(declaredLimits.maxJsonBytes, 1, "forests.limits.maxJsonBytes"),
    maxCompressedBytes: integer(declaredLimits.maxCompressedBytes, 1, "forests.limits.maxCompressedBytes"),
  });
  assert.deepEqual(fileLimits, limits.file, "forest file limits differ from verifier limits");
  return Object.freeze({ directory, entries, totalJsonBytes, totalCompressedBytes, limits: fileLimits });
}

function parseManifest(value: unknown, limits: CertificateBundleLimits): CertificateBundleManifest {
  const data = record(value, MANIFEST_KEYS, "manifest");
  assert.equal(data.schema, CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA, "unsupported campaign certificate manifest schema");
  return deepFreeze({
    schema: CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA,
    build: parseBuild(data.build),
    generatorCore: parseSourceBinding(data.generatorCore, "generatorCore"),
    runtimeVerifier: parseSourceBinding(data.runtimeVerifier, "runtimeVerifier"),
    artifactIO: parseSourceBinding(data.artifactIO, "artifactIO"),
    config: parseConfig(data.config),
    bounds: parseBounds(data.bounds),
    certificate: parseCertificate(data.certificate, limits.maxDescriptorBytes),
    catalog: parseCatalog(data.catalog),
    forests: parseForestSet(data.forests, limits),
  });
}

function parseFactorizedManifest(value: unknown, limits: CertificateBundleLimits): FactorizedCertificateBundleManifest {
  const data = record(value, MANIFEST_KEYS, "manifest");
  assert.equal(data.schema, FACTORIZED_CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA, "unsupported factorized campaign manifest schema");
  return deepFreeze({
    schema: FACTORIZED_CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA,
    build: parseBuild(data.build),
    generatorCore: parseSourceBinding(data.generatorCore, "generatorCore"),
    runtimeVerifier: parseSourceBinding(data.runtimeVerifier, "runtimeVerifier"),
    artifactIO: parseSourceBinding(data.artifactIO, "artifactIO"),
    config: parseConfig(data.config),
    bounds: parseBounds(data.bounds),
    certificate: parseFactorizedCertificate(data.certificate, limits.maxDescriptorBytes),
    catalog: parseCatalog(data.catalog),
    forests: parseForestSet(data.forests, limits),
  });
}

function relativePath(value: unknown, label: string): string {
  const path = nonEmptyString(value, label);
  assert(!path.includes("\u0000"), `${label} must not contain NUL bytes`);
  assert(!path.startsWith("/") && !/^[A-Za-z]:/.test(path), `${label} must be repository-relative`);
  assert(!path.includes("\\"), `${label} must use POSIX separators`);
  const pieces = path.split("/");
  assert(pieces.every(piece => piece.length > 0 && piece !== "." && piece !== ".."), `${label} contains an invalid segment`);
  return path;
}

function relativeInside(root: string, path: string, label: string): string {
  const result = resolve(root, ...path.split("/"));
  const fromRoot = relative(root, result);
  assert(fromRoot !== "" && fromRoot !== ".." && !fromRoot.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !/^[A-Za-z]:/.test(fromRoot), `${label} escapes repository root`);
  return result;
}

function ensureNoSymlinkComponents(root: string, path: string, label: string): void {
  const relativePathValue = relative(root, path);
  assert(relativePathValue !== "" && !relativePathValue.startsWith(".."), `${label} escapes repository root`);
  let cursor = root;
  for (const segment of relativePathValue.split("/")) {
    cursor = join(cursor, segment);
    const stat = lstatSync(cursor);
    assert(!stat.isSymbolicLink(), `${label} contains a symlink component`);
    if (cursor !== path) assert(stat.isDirectory(), `${label} has a non-directory component`);
  }
}

function ensureRoot(root: string): string {
  const result = resolve(root);
  const stat = lstatSync(result);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), "repository root must be a real directory");
  return result;
}

function ensureDirectory(path: string, label: string): void {
  const stat = lstatSync(path);
  assert(stat.isDirectory() && !stat.isSymbolicLink(), `${label} must be a real directory`);
}

function ensureRegular(path: string, label: string): { readonly dev: number; readonly ino: number } {
  const stat = lstatSync(path);
  assert(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular non-symlink file`);
  assert(stat.nlink === 1, `${label} must not be hard-linked`);
  return { dev: stat.dev, ino: stat.ino };
}

function walkRegularFiles(root: string, directory: string, label: string): readonly string[] {
  const result: string[] = [];
  const walk = (path: string, relativeDirectory: string): void => {
    const stat = lstatSync(path);
    assert(!stat.isSymbolicLink(), `${label}/${relativeDirectory} must not contain symlinks`);
    assert(stat.isDirectory(), `${label}/${relativeDirectory} must be a directory`);
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = `${relativeDirectory}/${entry.name}`;
      const childPath = `${path}/${entry.name}`;
      const childStat = lstatSync(childPath);
      assert(!childStat.isSymbolicLink(), `${label}/${child} must not be a symlink`);
      if (childStat.isDirectory()) walk(childPath, child);
      else {
        assert(childStat.isFile(), `${label}/${child} must be a regular file`);
        result.push(child);
      }
    }
  };
  walk(directory, relative(root, directory).split("\\").join("/") || label);
  return result;
}

function gameplayInputPaths(root: string): readonly string[] {
  const mandatory = ["package.json", "package-lock.json", "tsconfig.json"];
  for (const path of mandatory) ensureRegular(relativeInside(root, path, path), path);
  const paths = [...mandatory];
  for (const directory of ["src/engine", "src/content"]) {
    const absolute = relativeInside(root, directory, directory);
    ensureDirectory(absolute, directory);
    paths.push(...walkRegularFiles(root, absolute, directory));
  }
  return Object.freeze(paths.sort(compareCodeUnits));
}

function pathIsUnder(child: string, parent: string): boolean {
  return child === parent || child.startsWith(`${parent}/`);
}

function assertSourcePathScopes(
  root: string,
  manifestPath: string,
  forestDirectory: string,
  manifest: SharedCertificateManifest,
): void {
  const manifestRelative = relative(root, manifestPath).split("\\").join("/");
  const forestRelative = relativePath(manifest.forests.directory, "forests.directory");
  const sourcePaths = [
    ...manifest.build.inputs.files,
    ...manifest.generatorCore.files,
    ...manifest.runtimeVerifier.files,
    ...manifest.artifactIO.files,
  ];
  const seen = new Set<string>();
  const inodes = new Set<string>();
  for (const source of sourcePaths) {
    const path = relativePath(source.path, "source path");
    assert(!seen.has(path), `source path appears in multiple bindings: ${path}`);
    seen.add(path);
    assert(path !== manifestRelative && !pathIsUnder(path, forestRelative), `source path is an artifact path: ${path}`);
    const absolute = relativeInside(root, path, `source path ${path}`);
    ensureNoSymlinkComponents(root, absolute, `source path ${path}`);
    const identity = ensureRegular(absolute, `source path ${path}`);
    const inode = `${identity.dev}:${identity.ino}`;
    assert(!inodes.has(inode), `source files alias the same inode: ${path}`);
    inodes.add(inode);
  }
  assert(forestDirectory !== manifestPath, "manifest cannot be the forest directory");
}

function hashRegularFile(path: string, label: string): string {
  const identity = ensureRegular(path, label);
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  const digest = createHash("sha256");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let position = 0;
  try {
    const before = fstatSync(descriptor);
    assert(before.isFile() && before.dev === identity.dev && before.ino === identity.ino, `${label} changed before open`);
    while (true) {
      const received = readSync(descriptor, buffer, 0, buffer.length, position);
      if (received === 0) break;
      digest.update(buffer.subarray(0, received));
      position += received;
    }
    const after = fstatSync(descriptor);
    assert(after.isFile() && after.dev === before.dev && after.ino === before.ino && after.size === before.size, `${label} changed during read`);
  } finally {
    closeSync(descriptor);
  }
  return digest.digest("hex");
}

function verifySourceBinding(root: string, binding: CertificateSourceBinding, label: string): void {
  const actual = binding.files.map(file => Object.freeze({
    path: file.path,
    sha256: hashRegularFile(relativeInside(root, file.path, `${label}.${file.path}`), `${label}.${file.path}`),
  }));
  assert.deepEqual(actual, binding.files, `${label} source hashes changed`);
  assert.equal(sourceHash(binding.files), binding.sourceHash, `${label} source hash changed`);
}

function verifySourceInputs(root: string, manifest: SharedCertificateManifest): void {
  const actualPaths = gameplayInputPaths(root);
  const manifestPaths = manifest.build.inputs.files.map(file => relativePath(file.path, "build.inputs path"));
  assert.deepEqual(manifestPaths, actualPaths, "build.inputs file set differs from source-mode BUILD_ID inputs");
  verifySourceBinding(root, manifest.build.inputs, "build.inputs");
  verifySourceBinding(root, manifest.generatorCore, "generatorCore");
  verifySourceBinding(root, manifest.runtimeVerifier, "runtimeVerifier");
  verifySourceBinding(root, manifest.artifactIO, "artifactIO");
}

function verifyCatalog(manifest: CertificateBundleManifest): void {
  const sceneForests = manifest.certificate.sceneForests;
  assert.equal(manifest.certificate.failureForestId, "failure-union:", "certificate failure forest ID is not canonical");
  assert.equal(sceneForests.length, manifest.catalog.sceneIds.length, "scene forest count differs from catalog");
  for (let index = 0; index < sceneForests.length; index += 1) {
    const sceneId = sceneForests[index]!.sceneId;
    assert.equal(sceneId, manifest.catalog.sceneIds[index], "scene catalog order differs");
    assert.equal(sceneForests[index]!.forestId, `non-completion:scene:${sceneId}`, "scene forest ID is not canonical");
  }
  const ids = [manifest.certificate.failureForestId, ...sceneForests.map(entry => entry.forestId)];
  assert.equal(new Set(ids).size, ids.length, "certificate forest IDs must be unique");
  const entryIds = manifest.forests.entries.map(entry => entry.id);
  assert.deepEqual([...entryIds].sort(compareCodeUnits), [...ids].sort(compareCodeUnits), "forest entry IDs differ from certificate catalog");
}

function verifyFactorizedCatalog(manifest: FactorizedCertificateBundleManifest): void {
  const { sceneForests, failureForests } = manifest.certificate;
  assert.equal(sceneForests.length, manifest.catalog.sceneIds.length, "scene forest count differs from catalog");
  for (let index = 0; index < sceneForests.length; index += 1) {
    const scene = sceneForests[index]!;
    assert.equal(scene.sceneId, manifest.catalog.sceneIds[index], "scene catalog order differs");
    assert.equal(scene.forestId, `non-completion:scene:${scene.sceneId}`, "scene forest ID is not canonical");
  }
  // Zero seeds remain mandatory entries. Catalog coverage is independent of
  // whether a producer claims that a particular obligation is empty.
  assert.equal(failureForests.length, manifest.catalog.failureIds.length, "failure forest count differs from catalog");
  for (let index = 0; index < failureForests.length; index += 1) {
    const failure = failureForests[index]!;
    assert.equal(failure.seedId, manifest.catalog.failureIds[index], "failure catalog order differs");
    assert.equal(failure.forestId, failure.seedId, "failure forest ID is not canonical");
  }
  const ids = [...sceneForests, ...failureForests].map(entry => entry.forestId);
  assert.equal(new Set(ids).size, ids.length, "certificate forest IDs must be unique");
  const entryIds = manifest.forests.entries.map(entry => entry.id);
  assert.deepEqual([...entryIds].sort(compareCodeUnits), [...ids].sort(compareCodeUnits),
    "forest entry IDs differ from certificate catalog");
}

function verifyDirectory(root: string, manifest: SharedCertificateManifest): { readonly directory: string; readonly identities: ReadonlyMap<string, { readonly dev: number; readonly ino: number }> } {
  const directory = relativeInside(root, relativePath(manifest.forests.directory, "forests.directory"), "forests.directory");
  ensureNoSymlinkComponents(root, directory, "forests.directory");
  ensureDirectory(directory, "forests.directory");
  const expected = new Set(manifest.forests.entries.map(entry => entry.file));
  const actual = readdirSync(directory, { withFileTypes: true });
  assert.equal(actual.length, expected.size, "forest directory contains missing or extra files");
  const identities = new Map<string, { readonly dev: number; readonly ino: number }>();
  const inodes = new Set<string>();
  for (const directoryEntry of actual) {
    assert(expected.has(directoryEntry.name), `unexpected forest file: ${directoryEntry.name}`);
    const filePath = `${directory}/${directoryEntry.name}`;
    const identity = ensureRegular(filePath, `forest ${directoryEntry.name}`);
    const inode = `${identity.dev}:${identity.ino}`;
    assert(!inodes.has(inode), `forest files alias the same inode: ${directoryEntry.name}`);
    inodes.add(inode);
    identities.set(directoryEntry.name, identity);
  }
  return { directory, identities };
}

function verifyManifestContainer(root: string, manifestPath: string, forestDirectory: string): void {
  const parent = dirname(manifestPath);
  ensureNoSymlinkComponents(root, parent, "manifest directory");
  ensureDirectory(parent, "manifest directory");
  const forestRelative = relative(parent, forestDirectory).split("\\").join("/");
  assert(forestRelative.length > 0 && !forestRelative.includes("/"), "forest directory must be beside manifest");
  const expected = new Set([basename(manifestPath), basename(forestDirectory)]);
  const actual = readdirSync(parent, { withFileTypes: true });
  assert.equal(actual.length, expected.size, "manifest directory contains missing or extra entries");
  for (const entry of actual) {
    assert(expected.has(entry.name), `unexpected manifest directory entry: ${entry.name}`);
  }
  ensureRegular(manifestPath, "manifest");
  ensureDirectory(forestDirectory, "forests.directory");
}

function verifyManifestSnapshot<M extends SharedCertificateManifest>(
  root: string,
  manifestPath: string,
  manifest: M,
  limits: CertificateBundleLimits,
  expectedManifestHash: string,
  expectedManifestBytes: number,
  parse: ManifestParser<M>,
): void {
  const bytes = readBoundedBytes(manifestPath, limits.maxManifestBytes, expectedManifestBytes);
  assert.equal(hashBytes(bytes), expectedManifestHash, "manifest changed during certificate use");
  assert.deepEqual(parse(parseJsonBytes(bytes), limits), manifest, "manifest contents changed during certificate use");
  assertSourcePathScopes(root, manifestPath, relativeInside(root, relativePath(manifest.forests.directory, "forests.directory"), "forests.directory"), manifest);
}

function verifyAllForests(
  directory: string,
  entries: readonly ForestArtifact[],
  limits: CertificateBundleLimits,
): void {
  let totalJsonBytes = 0;
  let totalCompressedBytes = 0;
  for (const entry of entries) {
    const forest = readForestArtifact(directory, entry, limits.file);
    assert(forest !== undefined, `forest ${entry.id} was not read`);
    totalJsonBytes = addSafe(totalJsonBytes, entry.jsonBytes, "forest JSON total");
    totalCompressedBytes = addSafe(totalCompressedBytes, entry.bytes, "forest compressed total");
  }
  assert(totalJsonBytes <= limits.maxTotalJsonBytes, "forest JSON cumulative limit exceeded during recheck");
  assert(totalCompressedBytes <= limits.maxTotalCompressedBytes, "forest compressed cumulative limit exceeded during recheck");
}

function verifyExpectedBindings(manifest: SharedCertificateManifest, expected: CertificateBundleExpectedBindings): void {
  assert.deepEqual(manifest.build, expected.build, "current build binding differs from manifest");
  assert.deepEqual(manifest.generatorCore, expected.generatorCore, "generatorCore binding differs from manifest");
  assert.deepEqual(manifest.runtimeVerifier, expected.runtimeVerifier, "runtimeVerifier binding differs from manifest");
  assert.deepEqual(manifest.artifactIO, expected.artifactIO, "artifactIO binding differs from manifest");
  assert(isDeepStrictEqual(manifest.config, expected.config), "current config differs from manifest");
  assert.deepEqual(manifest.bounds, expected.bounds, "current bounds differ from manifest");
  assert.deepEqual(manifest.catalog, expected.catalog, "current catalog differs from manifest");
}

/**
 * Parse and bind a production certificate manifest without constructing a
 * symbolic model. Forest bytes remain lazy until `loadForest` is called.
 */
function openBundle<M extends SharedCertificateManifest>(
  options: OpenCertificateBundleOptions,
  parse: ManifestParser<M>,
  checkCatalog: (manifest: M) => void,
): OpenedBundle<M> {
  const limits = normalizeLimits(options.limits ?? DEFAULT_CERTIFICATE_BUNDLE_LIMITS);
  const root = ensureRoot(options.repositoryRoot);
  const manifestPath = resolve(options.manifestPath);
  const manifestRelative = relative(root, manifestPath);
  assert(manifestRelative !== "" && !manifestRelative.startsWith("..") && !/^[A-Za-z]:/.test(manifestRelative), "manifest must be inside repository root");
  ensureNoSymlinkComponents(root, manifestPath, "manifest");
  const manifestBytes = readBoundedBytes(manifestPath, limits.maxManifestBytes);
  const manifestHash = hashBytes(manifestBytes);
  const manifest = parse(parseJsonBytes(manifestBytes), limits);
  verifyExpectedBindings(manifest, options.expected);
  const forestDirectory = relativeInside(root, relativePath(manifest.forests.directory, "forests.directory"), "forests.directory");
  verifyManifestContainer(root, manifestPath, forestDirectory);
  assertSourcePathScopes(root, manifestPath, forestDirectory, manifest);
  checkCatalog(manifest);
  verifySourceInputs(root, manifest);
  verifyDirectory(root, manifest);

  const byId = new Map(manifest.forests.entries.map(entry => [entry.id, entry] as const));
  const loaded = new Set<string>();
  const loadForest = (forestId: string): unknown => {
    assert(typeof forestId === "string" && byId.has(forestId), `unknown certificate forest: ${forestId}`);
    const entry = byId.get(forestId)!;
    const forest = deepFreeze(readForestArtifact(forestDirectory, entry, limits.file));
    loaded.add(forestId);
    return forest;
  };
  const loadedForestIds = (): readonly string[] => Object.freeze([...loaded]);
  const recheckIntegrity = (): void => {
    verifyManifestSnapshot(root, manifestPath, manifest, limits, manifestHash, manifestBytes.length, parse);
    verifyExpectedBindings(manifest, options.expected);
    verifyManifestContainer(root, manifestPath, forestDirectory);
    verifySourceInputs(root, manifest);
    checkCatalog(manifest);
    verifyDirectory(root, manifest);
    verifyAllForests(forestDirectory, manifest.forests.entries, limits);
  };
  return Object.freeze({
    repositoryRoot: root,
    manifestPath,
    manifest,
    loadForest,
    loadedForestIds,
    recheckIntegrity,
  });
}

/** Legacy combined certificates retain their original schema and checks. */
export function openCertificateBundle(options: OpenCertificateBundleOptions): CertificateBundle {
  return openBundle(options, parseManifest, verifyCatalog);
}

/** Factorized certificates share every source, path, byte and resource guard. */
export function openFactorizedCertificateBundle(options: OpenCertificateBundleOptions): FactorizedCertificateBundle {
  return openBundle(options, parseFactorizedManifest, verifyFactorizedCatalog);
}
