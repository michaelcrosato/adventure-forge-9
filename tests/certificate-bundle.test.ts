import assert from 'node:assert/strict';
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { gzipSync } from 'node:zlib';
import {
  CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA,
  DEFAULT_CERTIFICATE_BUNDLE_LIMITS,
  FACTORIZED_CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA,
  FACTORIZED_CERTIFICATE_SCHEMA,
  SYMBOLIC_CERTIFICATE_SCHEMA,
  SYMBOLIC_DESCRIPTOR_SCHEMA,
  openCertificateBundle,
  openFactorizedCertificateBundle,
  type CertificateBundleExpectedBindings,
  type CertificateBundleLimits,
  type CertificateBundleManifest,
  type FactorizedCertificateBundleManifest,
  type CertificateSourceBinding,
  type CertificateSourceFile,
} from '../src/verification/certificate-bundle.js';
import {
  hashBytes,
  writeForestArtifact,
  type ForestArtifact,
} from '../src/verification/certificate-files.js';

type Fixture = {
  readonly root: string;
  readonly manifestPath: string;
  readonly forestDirectory: string;
  readonly expected: CertificateBundleExpectedBindings;
  readonly manifest: CertificateBundleManifest;
  readonly limits: CertificateBundleLimits;
  readonly entries: readonly ForestArtifact[];
};

const fixtureForest = Object.freeze({
  schema: 'af9-bdd-forest-v1',
  variableCount: 1,
  roots: [0],
  nodes: [],
});

function sourceHash(files: readonly CertificateSourceFile[]): string {
  return hashBytes(Buffer.from(JSON.stringify(files.map(file => ({ path: file.path, sha256: file.sha256 })))));
}

function makeSourceBinding(root: string, paths: readonly string[], label: string): CertificateSourceBinding {
  const files = paths.map((path, index) => {
    const absolute = join(root, path);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, `${label}-${index}\n`);
    return Object.freeze({ path, sha256: hashBytes(readFileSync(absolute)) });
  });
  return Object.freeze({ files: Object.freeze(files), sourceHash: sourceHash(files) });
}

function makeLimits(overrides: Partial<CertificateBundleLimits> = {}): CertificateBundleLimits {
  const file = overrides.file ?? DEFAULT_CERTIFICATE_BUNDLE_LIMITS.file;
  return Object.freeze({
    maxManifestBytes: overrides.maxManifestBytes ?? 64 * 1024,
    maxDescriptorBytes: overrides.maxDescriptorBytes ?? 16 * 1024,
    file: Object.freeze({
      maxNodes: file.maxNodes,
      maxJsonBytes: file.maxJsonBytes,
      maxCompressedBytes: file.maxCompressedBytes,
    }),
    maxTotalJsonBytes: overrides.maxTotalJsonBytes ?? 64 * 1024,
    maxTotalCompressedBytes: overrides.maxTotalCompressedBytes ?? 32 * 1024,
  });
}

function writeManifest(path: string, manifest: CertificateBundleManifest): void {
  writeFileSync(path, `${JSON.stringify(manifest)}\n`, { flag: 'w' });
}

function fixture(context: TestContext, options: { readonly limits?: CertificateBundleLimits } = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'af9-certificate-bundle-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const limits = options.limits ?? makeLimits();

  const gameplayFiles = [
    'package-lock.json',
    'package.json',
    'src/content/content.ts',
    'src/engine/engine.ts',
    'tsconfig.json',
  ];
  for (const [index, path] of gameplayFiles.entries()) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, `gameplay-${index}\n`);
  }
  const generatorCore = makeSourceBinding(root, ['roles/generator.ts'], 'generator');
  const runtimeVerifier = makeSourceBinding(root, ['roles/runtime.ts'], 'runtime');
  const artifactIO = makeSourceBinding(root, ['roles/io.ts'], 'io');
  const buildFiles = gameplayFiles.map(path => Object.freeze({
    path,
    sha256: hashBytes(readFileSync(join(root, path))),
  }));
  const buildInputs = Object.freeze({
    files: Object.freeze(buildFiles),
    sourceHash: sourceHash(buildFiles),
  });

  const forestDirectory = join(root, 'certificates/campaign/forests');
  mkdirSync(forestDirectory, { recursive: true });
  const entries = Object.freeze([
    writeForestArtifact(forestDirectory, 0, 'failure-union:', fixtureForest, limits.file),
    writeForestArtifact(forestDirectory, 1, 'non-completion:scene:start', fixtureForest, limits.file),
  ]);
  const config = Object.freeze({
    verifier: Object.freeze({ nodeLimit: 10, cacheLimit: 4 }),
    generation: Object.freeze({ roundLimit: 2 }),
  });
  const bounds = Object.freeze({ water: 2 });
  const catalog = Object.freeze({
    sceneIds: Object.freeze(['start']),
    choiceIds: Object.freeze(['choice:finish']),
    failureIds: Object.freeze([
      'arithmetic-error:choice:finish',
      'bound-exit:choice:finish',
      'invalid-success:choice:finish',
      'uncovered-enabled:choice:finish',
    ]),
    endingPairs: Object.freeze([Object.freeze(['choice:finish', 'completed'] as const)]),
  });
  const descriptor = {
    schema: SYMBOLIC_DESCRIPTOR_SCHEMA,
    scenario: { id: 'fixture-scenario', scenes: [] },
    resources: ['water'],
    flags: [],
    fieldOrder: ['water'],
    currentVariables: [0],
    nextVariables: [1],
    variableCount: 2,
    order: 'interleaved',
    transitionMode: 'relational',
    strategy: { order: 'interleaved', transitionMode: 'relational', fieldOrder: ['water'] },
    anchors: { schema: 'af9-bdd-forest-v1', variableCount: 2, roots: [1, 0, 1, 0], nodes: [] },
  };
  const manifest = {
    schema: CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA,
    build: {
      runtimeMode: 'source' as const,
      buildId: 'af9-0123456789abcdef01234567',
      inputs: buildInputs,
    },
    generatorCore,
    runtimeVerifier,
    artifactIO,
    config,
    bounds,
    certificate: {
      schema: SYMBOLIC_CERTIFICATE_SCHEMA,
      descriptor,
      failureForestId: 'failure-union:',
      sceneForests: [{ sceneId: 'start', forestId: 'non-completion:scene:start' }],
    },
    catalog,
    forests: {
      directory: 'certificates/campaign/forests',
      entries,
      totalJsonBytes: entries.reduce((sum, entry) => sum + entry.jsonBytes, 0),
      totalCompressedBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      limits: limits.file,
    },
  } as unknown as CertificateBundleManifest;
  const manifestPath = join(root, 'certificates/campaign/manifest.json');
  writeManifest(manifestPath, manifest);
  const expected = {
    build: manifest.build,
    generatorCore,
    runtimeVerifier,
    artifactIO,
    config,
    bounds,
    catalog,
  };
  return { root, manifestPath, forestDirectory, expected, manifest, limits, entries };
}

function open(fixtureValue: Fixture): ReturnType<typeof openCertificateBundle> {
  return openCertificateBundle({
    repositoryRoot: fixtureValue.root,
    manifestPath: fixtureValue.manifestPath,
    expected: fixtureValue.expected,
    limits: fixtureValue.limits,
  });
}

function rewriteWith(fixtureValue: Fixture, edit: (manifest: any) => void): void {
  const changed = JSON.parse(JSON.stringify(fixtureValue.manifest)) as any;
  edit(changed);
  writeManifest(fixtureValue.manifestPath, changed);
}

test('opens a valid bundle and keeps proof forests lazy and immutable', context => {
  const value = fixture(context);
  const bundle = open(value);
  assert.deepEqual(bundle.loadedForestIds(), []);
  const descriptor = bundle.manifest.certificate.descriptor;
  assert(Object.isFrozen(descriptor));
  assert(Object.isFrozen(descriptor.scenario));
  assert(Object.isFrozen(descriptor.anchors));
  assert(Object.isFrozen((descriptor.anchors as { roots: unknown[] }).roots));
  assert.throws(() => Object.defineProperty(descriptor.scenario, 'id', { value: 'tampered' }), TypeError);
  const forest = bundle.loadForest('non-completion:scene:start') as Record<string, unknown>;
  assert.deepEqual(forest, fixtureForest);
  assert(Object.isFrozen(forest));
  assert.deepEqual(bundle.loadedForestIds(), ['non-completion:scene:start']);
  const reloaded = bundle.loadForest('non-completion:scene:start');
  assert.notEqual(reloaded, forest);
  assert.deepEqual(reloaded, fixtureForest);
  assert.throws(() => Object.defineProperty(forest, 'schema', { value: 'tampered' }), TypeError);
  assert.throws(() => bundle.loadForest('missing-forest'));
  bundle.recheckIntegrity();
});

test('rechecks source bindings and rejects a caller binding drift', context => {
  const value = fixture(context);
  const bundle = open(value);
  const sourcePath = join(value.root, value.expected.runtimeVerifier.files[0]!.path);
  const original = readFileSync(sourcePath);
  writeFileSync(sourcePath, Buffer.concat([original, Buffer.from('drift\n')]));
  assert.throws(() => bundle.recheckIntegrity(), /source hashes changed/);
  writeFileSync(sourcePath, original);
  bundle.recheckIntegrity();

  const wrongExpected = { ...value.expected, config: { verifier: { nodeLimit: 11 } } };
  assert.throws(() => openCertificateBundle({
    repositoryRoot: value.root,
    manifestPath: value.manifestPath,
    expected: wrongExpected,
    limits: value.limits,
  }), /config differs/);
});

test('requires exact forest directory contents, including no extra or missing entry', context => {
  const value = fixture(context);
  writeFileSync(join(value.root, 'certificates/campaign', 'unexpected.txt'), 'extra');
  assert.throws(() => open(value), /manifest directory contains missing or extra|unexpected manifest directory entry/);
  unlinkSync(join(value.root, 'certificates/campaign', 'unexpected.txt'));
  writeFileSync(join(value.forestDirectory, 'unexpected.bin'), 'extra');
  assert.throws(() => open(value), /unexpected forest file|missing or extra/);
  unlinkSync(join(value.forestDirectory, 'unexpected.bin'));
  unlinkSync(join(value.forestDirectory, value.entries[1]!.file));
  assert.throws(() => open(value), /missing or extra/);
});

test('rejects symlinked and hardlink-aliased forest entries', context => {
  const value = fixture(context);
  const source = join(value.forestDirectory, value.entries[0]!.file);
  const target = join(value.forestDirectory, value.entries[1]!.file);
  unlinkSync(target);
  symlinkSync(source, target);
  assert.throws(() => open(value), /regular non-symlink|symlink/);

  unlinkSync(target);
  linkSync(source, target);
  assert.throws(() => open(value), /hard-linked|alias the same inode/);

  const sourceAlias = fixture(context);
  const generatorPath = join(sourceAlias.root, sourceAlias.expected.generatorCore.files[0]!.path);
  const runtimePath = join(sourceAlias.root, sourceAlias.expected.runtimeVerifier.files[0]!.path);
  unlinkSync(runtimePath);
  linkSync(generatorPath, runtimePath);
  assert.throws(() => open(sourceAlias), /hard-linked|alias the same inode/);
});

test('rejects traversal, duplicate IDs, catalog drift, and unknown manifest fields', context => {
  const traversal = fixture(context);
  rewriteWith(traversal, manifest => { manifest.forests.directory = 'certificates/campaign/../escape'; });
  assert.throws(() => open(traversal), /invalid segment|escapes/);

  const duplicate = fixture(context);
  rewriteWith(duplicate, manifest => { manifest.forests.entries[1].id = manifest.forests.entries[0].id; });
  assert.throws(() => open(duplicate), /forest IDs must be unique/);

  const catalog = fixture(context);
  rewriteWith(catalog, manifest => { manifest.catalog.sceneIds = ['scene:other']; });
  assert.throws(() => open(catalog), /scene catalog order differs|current catalog/);

  const extra = fixture(context);
  rewriteWith(extra, manifest => { manifest.untrustedVerdict = true; });
  assert.throws(() => open(extra), /manifest fields differ/);

  const prototypeKey = fixture(context);
  rewriteWith(prototypeKey, manifest => {
    Object.defineProperty(manifest.bounds, '__proto__', { value: 7, enumerable: true, configurable: true, writable: true });
  });
  assert.throws(() => open(prototypeKey));

  const nonCanonical = fixture(context);
  rewriteWith(nonCanonical, manifest => { manifest.certificate.failureForestId = 'failure-custom:'; });
  assert.throws(() => open(nonCanonical), /canonical/);
});

test('rejects changed forest bytes on lazy load and on the full integrity pass', context => {
  const value = fixture(context);
  const bundle = open(value);
  const forestPath = join(value.forestDirectory, value.entries[1]!.file);
  const bytes = readFileSync(forestPath);
  const changed = Buffer.from(bytes);
  changed[changed.length - 1] = changed[changed.length - 1]! ^ 1;
  writeFileSync(forestPath, changed);
  assert.throws(() => bundle.loadForest('non-completion:scene:start'), /checksum|JSON|count/);
  assert.throws(() => bundle.recheckIntegrity(), /checksum|JSON|count/);
});

test('enforces cumulative metadata limits before any forest proof load', context => {
  const limits = makeLimits({ maxTotalCompressedBytes: 1 });
  const value = fixture(context, { limits });
  assert.throws(() => open(value), /cumulative limit exceeded/);
});

test('bounds decompression of a highly compressible forest payload', context => {
  const limits = makeLimits({
    file: { maxNodes: 10, maxJsonBytes: 2_048, maxCompressedBytes: 4_096 },
  });
  const value = fixture(context, { limits });
  const entry = value.entries[0]!;
  const raw = Buffer.from('a'.repeat(20_000));
  const compressed = gzipSync(raw);
  assert(compressed.length < limits.file.maxCompressedBytes);
  const metadata = {
    ...entry,
    bytes: compressed.length,
    sha256: hashBytes(compressed),
    jsonBytes: 1_000,
    jsonSha256: hashBytes(raw),
  };
  const changed = JSON.parse(JSON.stringify(value.manifest)) as any;
  changed.forests.entries[0] = metadata;
  changed.forests.totalCompressedBytes = metadata.bytes + value.entries[1]!.bytes;
  changed.forests.totalJsonBytes = metadata.jsonBytes + value.entries[1]!.jsonBytes;
  writeFileSync(join(value.forestDirectory, entry.file), compressed);
  writeManifest(value.manifestPath, changed);
  const bundle = open(value);
  assert.throws(() => bundle.loadForest(entry.id), /too large|larger|maximum|length|JSON/);
});

test('supports an empty scene catalog when the failure forest is the only proof file', context => {
  const value = fixture(context);
  const changed = JSON.parse(JSON.stringify(value.manifest)) as any;
  changed.certificate.sceneForests = [];
  changed.catalog.sceneIds = [];
  changed.catalog.choiceIds = [];
  changed.catalog.failureIds = [];
  changed.catalog.endingPairs = [];
  changed.forests.entries = [changed.forests.entries[0]];
  changed.forests.totalJsonBytes = changed.forests.entries[0].jsonBytes;
  changed.forests.totalCompressedBytes = changed.forests.entries[0].bytes;
  unlinkSync(join(value.forestDirectory, value.entries[1]!.file));
  writeManifest(value.manifestPath, changed);
  const bundle = openCertificateBundle({
    repositoryRoot: value.root,
    manifestPath: value.manifestPath,
    expected: { ...value.expected, catalog: changed.catalog },
    limits: value.limits,
  });
  assert.deepEqual(bundle.loadedForestIds(), []);
  bundle.recheckIntegrity();
});

test('rejects an oversized manifest before parsing or source traversal', context => {
  const value = fixture(context, { limits: makeLimits({ maxManifestBytes: 128 }) });
  assert(existsSync(value.manifestPath));
  assert.throws(() => open(value), /outside limits|Byte limit/);
});

type FactorizedFixture = Omit<Fixture, 'manifest'> & {
  readonly manifest: FactorizedCertificateBundleManifest;
};

function factorizedFixture(context: TestContext): FactorizedFixture {
  const base = fixture(context);
  const forestDirectory = join(base.root, 'certificates/factorized/forests');
  mkdirSync(forestDirectory, { recursive: true });
  const ids = [
    ...base.expected.catalog.sceneIds.map(id => `non-completion:scene:${id}`),
    ...base.expected.catalog.failureIds,
  ];
  const entries = ids.map((id, index) => writeForestArtifact(
    forestDirectory, index, id, { ...fixtureForest, variableCount: 2 }, base.limits.file,
  ));
  const manifest: FactorizedCertificateBundleManifest = {
    schema: FACTORIZED_CAMPAIGN_CERTIFICATE_MANIFEST_SCHEMA,
    ...base.expected,
    certificate: {
      schema: FACTORIZED_CERTIFICATE_SCHEMA,
      descriptor: base.manifest.certificate.descriptor,
      sceneForests: base.manifest.certificate.sceneForests,
      failureForests: base.expected.catalog.failureIds.map(seedId => ({ seedId, forestId: seedId })),
    },
    forests: {
      directory: 'certificates/factorized/forests',
      entries,
      totalJsonBytes: entries.reduce((sum, entry) => sum + entry.jsonBytes, 0),
      totalCompressedBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      limits: base.limits.file,
    },
  };
  const manifestPath = join(base.root, 'certificates/factorized/manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
  return { ...base, forestDirectory, manifestPath, manifest, entries };
}

function openFactorized(value: FactorizedFixture): ReturnType<typeof openFactorizedCertificateBundle> {
  return openFactorizedCertificateBundle({
    repositoryRoot: value.root, manifestPath: value.manifestPath,
    expected: value.expected, limits: value.limits,
  });
}

function rewriteFactorized(value: FactorizedFixture, edit: (manifest: any) => void): void {
  const changed = JSON.parse(JSON.stringify(value.manifest)) as any;
  edit(changed);
  writeFileSync(value.manifestPath, JSON.stringify(changed) + '\n');
}

test('factorized bundles load every zero-seed obligation lazily and immutably', context => {
  const value = factorizedFixture(context);
  const bundle = openFactorized(value);
  assert.deepEqual(bundle.loadedForestIds(), []);
  assert(Object.isFrozen(bundle.manifest.certificate.failureForests));
  assert(Object.isFrozen(bundle.manifest.certificate.descriptor.anchors));
  for (const entry of value.entries) {
    const forest = bundle.loadForest(entry.id);
    assert.deepEqual(forest, { ...fixtureForest, variableCount: 2 });
    assert(Object.isFrozen(forest));
  }
  assert.deepEqual(bundle.loadedForestIds(), value.entries.map(entry => entry.id));
  assert.throws(() => bundle.loadForest('failure-union:'));
  bundle.recheckIntegrity();
});

test('factorized catalogs cannot omit, reorder or alias empty failure obligations', context => {
  const missing = factorizedFixture(context);
  rewriteFactorized(missing, manifest => { manifest.certificate.failureForests.pop(); });
  assert.throws(() => openFactorized(missing), /failure forest count/);
  const reordered = factorizedFixture(context);
  rewriteFactorized(reordered, manifest => { manifest.certificate.failureForests.reverse(); });
  assert.throws(() => openFactorized(reordered), /failure catalog order/);
  const alias = factorizedFixture(context);
  rewriteFactorized(alias, manifest => {
    manifest.certificate.failureForests[0].forestId = manifest.certificate.sceneForests[0].forestId;
  });
  assert.throws(() => openFactorized(alias), /canonical/);
  const absentArtifact = factorizedFixture(context);
  rewriteFactorized(absentArtifact, manifest => {
    const removed = manifest.forests.entries.pop();
    manifest.forests.totalJsonBytes -= removed.jsonBytes;
    manifest.forests.totalCompressedBytes -= removed.bytes;
  });
  assert.throws(() => openFactorized(absentArtifact), /forest entry IDs/);
});

test('legacy and factorized manifest schemas cannot be silently interchanged', context => {
  const value = factorizedFixture(context);
  assert.throws(() => openCertificateBundle({
    repositoryRoot: value.root, manifestPath: value.manifestPath,
    expected: value.expected, limits: value.limits,
  }), /schema/);
  const legacy = fixture(context);
  assert.throws(() => openFactorizedCertificateBundle({
    repositoryRoot: legacy.root, manifestPath: legacy.manifestPath,
    expected: legacy.expected, limits: legacy.limits,
  }), /schema/);
  rewriteFactorized(value, manifest => { manifest.certificate.schema = SYMBOLIC_CERTIFICATE_SCHEMA; });
  assert.throws(() => openFactorized(value), /schema/);
});

test('factorized bundles reject traversal, extra fields and duplicate artifact IDs', context => {
  const traversal = factorizedFixture(context);
  rewriteFactorized(traversal, manifest => { manifest.forests.directory = 'certificates/../escape'; });
  assert.throws(() => openFactorized(traversal), /invalid segment|escapes/);
  const extra = factorizedFixture(context);
  rewriteFactorized(extra, manifest => { manifest.certificate.accepted = true; });
  assert.throws(() => openFactorized(extra), /fields differ/);
  const duplicate = factorizedFixture(context);
  rewriteFactorized(duplicate, manifest => { manifest.forests.entries[1].id = manifest.forests.entries[0].id; });
  assert.throws(() => openFactorized(duplicate), /forest IDs must be unique/);
});

test('factorized bundles preserve source and config binding checks', context => {
  const value = factorizedFixture(context);
  const bundle = openFactorized(value);
  const source = join(value.root, value.expected.runtimeVerifier.files[0]!.path);
  const original = readFileSync(source);
  writeFileSync(source, Buffer.concat([original, Buffer.from('changed\n')]));
  assert.throws(() => bundle.recheckIntegrity(), /source hashes changed/);
  writeFileSync(source, original);
  assert.throws(() => openFactorizedCertificateBundle({
    repositoryRoot: value.root, manifestPath: value.manifestPath,
    expected: { ...value.expected, config: { verifier: { nodeLimit: 11 } } }, limits: value.limits,
  }), /config differs/);
  bundle.recheckIntegrity();
});

test('factorized bundles detect forest and manifest mutation after opening', context => {
  const value = factorizedFixture(context);
  const bundle = openFactorized(value);
  const path = join(value.forestDirectory, value.entries[1]!.file);
  const original = readFileSync(path);
  const changed = Buffer.from(original);
  changed[changed.length - 1] = changed[changed.length - 1]! ^ 1;
  writeFileSync(path, changed);
  assert.throws(() => bundle.loadForest(value.entries[1]!.id), /checksum|JSON|count/);
  assert.throws(() => bundle.recheckIntegrity(), /checksum|JSON|count/);
  writeFileSync(path, original);
  rewriteFactorized(value, manifest => { manifest.config.generation.roundLimit = 3; });
  assert.throws(() => bundle.recheckIntegrity(), /manifest changed|manifest contents changed/);
});

test('factorized bundles preserve exact-directory, symlink and hardlink guards', context => {
  const value = factorizedFixture(context);
  const bundle = openFactorized(value);
  const extra = join(value.forestDirectory, 'unexpected.bin');
  writeFileSync(extra, 'extra');
  assert.throws(() => bundle.recheckIntegrity(), /missing or extra|unexpected forest/);
  unlinkSync(extra);
  const source = join(value.forestDirectory, value.entries[0]!.file);
  const target = join(value.forestDirectory, value.entries[1]!.file);
  unlinkSync(target);
  symlinkSync(source, target);
  assert.throws(() => openFactorized(value), /regular non-symlink|symlink/);
  unlinkSync(target);
  linkSync(source, target);
  assert.throws(() => openFactorized(value), /hard-linked|alias/);
});

test('factorized bundles enforce both cumulative byte caps before loading proofs', context => {
  const value = factorizedFixture(context);
  for (const limits of [
    { ...value.limits, maxTotalCompressedBytes: 1 },
    { ...value.limits, maxTotalJsonBytes: 1 },
  ]) {
    assert.throws(() => openFactorizedCertificateBundle({
      repositoryRoot: value.root, manifestPath: value.manifestPath,
      expected: value.expected, limits,
    }), /cumulative limit exceeded/);
  }
});
