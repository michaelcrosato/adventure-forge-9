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
  SYMBOLIC_CERTIFICATE_SCHEMA,
  SYMBOLIC_DESCRIPTOR_SCHEMA,
  openCertificateBundle,
  type CertificateBundleExpectedBindings,
  type CertificateBundleLimits,
  type CertificateBundleManifest,
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
