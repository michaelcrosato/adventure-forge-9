import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { gzipSync } from 'node:zlib';
import { Bdd } from '../src/verification/bdd.js';
import { hashBytes, parseJsonBytes, readBoundedBytes, readForestArtifact, validateForestArtifact,
  writeForestArtifact, type ForestArtifact } from '../src/verification/certificate-files.js';

const limits = { maxNodes: 100, maxJsonBytes: 1024, maxCompressedBytes: 512 };
const forest = { schema: 'af9-bdd-forest-v1', variableCount: 3, roots: [3], nodes: [[2, 0, 1], [0, 0, 2]] };
function directory(context: TestContext): string {
  const path = mkdtempSync(join(tmpdir(), 'af9-certificate-files-'));
  context.after(() => rmSync(path, { recursive: true }));
  return path;
}
function writeRaw(path: string, index: number, raw: Buffer, nodes = 2): ForestArtifact {
  const compressed = gzipSync(raw);
  const entry = { id: 'raw', file: `cone-${String(index).padStart(5, '0')}.json.gz`, bytes: compressed.length,
    sha256: hashBytes(compressed), jsonBytes: raw.length, jsonSha256: hashBytes(raw), nodes };
  writeFileSync(join(path, entry.file), compressed, { flag: 'wx' });
  return entry;
}

test('compressed forests retain independent graph truth and zero roots without overwriting', context => {
  const path = directory(context);
  const entry = writeForestArtifact(path, 0, 'scene:a', forest, limits);
  assert.deepEqual(readForestArtifact(path, entry, limits), forest);
  const bdd = new Bdd(3), roots = bdd.importForest(readForestArtifact(path, entry, limits));
  const root = roots[0]; assert(root !== undefined);
  for (let bits = 0; bits < 8; bits++) {
    const assignment = [!!(bits & 1), !!(bits & 2), !!(bits & 4)];
    assert.equal(bdd.evaluate(root, assignment), assignment[0] && assignment[2]);
  }
  const zero = { schema: 'af9-bdd-forest-v1', variableCount: 3, roots: [0], nodes: [] };
  const zeroEntry = writeForestArtifact(path, 1, 'scene:zero', zero, limits);
  assert.equal(zeroEntry.nodes, 0);
  assert.deepEqual(bdd.importForest(readForestArtifact(path, zeroEntry, limits)), [0]);
  assert.throws(() => writeForestArtifact(path, 0, 'overwrite', zero, limits), /EEXIST/);
  assert.deepEqual(readForestArtifact(path, entry, limits), forest);
});

test('entry validation rejects paths, metadata lies and accessors before file access', context => {
  const path = directory(context), entry = writeForestArtifact(path, 0, 'scene:a', forest, limits);
  for (const patch of [{ file: '../cone-00000.json.gz' }, { file: '/cone-00000.json.gz' }, { nodes: -1 },
    { bytes: limits.maxCompressedBytes + 1 }, { jsonBytes: limits.maxJsonBytes + 1 }, { nodes: 101 },
    { bytes: Number.NaN }, { id: '' }, { sha256: 'bad' }, { extra: true }]) {
    assert.throws(() => readForestArtifact(path, { ...entry, ...patch }, limits));
  }
  let calls = 0;
  const accessor = Object.defineProperty({ ...entry }, 'bytes', { enumerable: true, get() { calls++; return entry.bytes; } });
  assert.throws(() => validateForestArtifact(accessor, limits), /own data field/);
  assert.equal(calls, 0);
  assert.throws(() => readForestArtifact(path, { ...entry, file: 'cone-99999.json.gz' }, limits), /ENOENT/);
});

test('rejects compressed and expanded corruption, truncation and malformed payloads', context => {
  const path = directory(context), entry = writeForestArtifact(path, 0, 'scene:a', forest, limits);
  for (const patch of [{ sha256: '0'.repeat(64) }, { jsonSha256: '0'.repeat(64) }, { jsonBytes: entry.jsonBytes + 1 }, { nodes: 0 }]) {
    assert.throws(() => readForestArtifact(path, { ...entry, ...patch }, limits), /checksum|count/);
  }
  writeFileSync(join(path, entry.file), readFileSync(join(path, entry.file)).subarray(0, entry.bytes - 1));
  assert.throws(() => readForestArtifact(path, entry, limits), /count/);
  const malformed = [Buffer.from('{'), Buffer.from(JSON.stringify({ ...forest, roots: [] })),
    Buffer.from(JSON.stringify({ ...forest, schema: 'other' })), Buffer.from([0x7b, 0xff, 0x7d])];
  for (const [index, raw] of malformed.entries()) {
    const bad = writeRaw(path, index + 1, raw);
    assert.throws(() => readForestArtifact(path, bad, limits));
  }
  assert.throws(() => parseJsonBytes(Buffer.from([0xff])), /encoded data/);
});

test('bounds allocation and decompression even when metadata claims a small payload', context => {
  const path = directory(context);
  const bomb = writeRaw(path, 0, Buffer.from('a'.repeat(100_000)), 0);
  assert(bomb.bytes < limits.maxCompressedBytes);
  assert.throws(() => readForestArtifact(path, { ...bomb, jsonBytes: 100 }, limits), { code: 'ERR_BUFFER_TOO_LARGE' });
  const metadata = join(path, 'manifest.json');
  writeFileSync(metadata, '{}');
  truncateSync(metadata, 2_000_000);
  assert.throws(() => readBoundedBytes(metadata, 1024), /outside limits/);
  assert.throws(() => writeForestArtifact(path, 1, 'large', forest, { ...limits, maxJsonBytes: 1 }), /byte limit/);
  assert.throws(() => writeForestArtifact(path, 1, 'large', forest, { ...limits, maxCompressedBytes: 1 }), /byte limit/);
  assert.throws(() => readBoundedBytes(metadata, 1024, 1025), /Expected bytes/);
});

test('rejects symlinked files and directories used as files while bounded metadata remains readable', context => {
  const path = directory(context), entry = writeForestArtifact(path, 0, 'scene:a', forest, limits);
  symlinkSync(join(path, entry.file), join(path, 'cone-00001.json.gz'));
  assert.throws(() => readForestArtifact(path, { ...entry, file: 'cone-00001.json.gz' }, limits), /non-symlink/);
  assert.throws(() => readBoundedBytes(path, 1024), /regular/);
  const metadata = join(path, 'manifest.json');
  writeFileSync(metadata, '{"complete":false}');
  assert.deepEqual(parseJsonBytes(readBoundedBytes(metadata, 1024)), { complete: false });
});
