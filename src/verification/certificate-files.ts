import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

export interface CertificateFileLimits {
  readonly maxNodes: number;
  readonly maxJsonBytes: number;
  readonly maxCompressedBytes: number;
}

export interface ForestArtifact {
  readonly id: string;
  readonly file: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly jsonBytes: number;
  readonly jsonSha256: string;
  readonly nodes: number;
}

export function hashBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function record(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Reflect.ownKeys(value).sort(), [...keys].sort(), `${label} fields differ`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of keys) {
    const descriptor = descriptors[key];
    assert(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, `${label}.${key} must be an own data field`);
  }
  return value as Record<string, unknown>;
}

function integer(value: unknown, minimum: number, maximum: number, label: string): number {
  assert(typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum, `${label} outside limits`);
  return value;
}

function limits(input: CertificateFileLimits): CertificateFileLimits {
  const data = record(input, ['maxNodes', 'maxJsonBytes', 'maxCompressedBytes'], 'limits');
  return Object.freeze({
    maxNodes: integer(data.maxNodes, 1, Number.MAX_SAFE_INTEGER, 'maxNodes'),
    maxJsonBytes: integer(data.maxJsonBytes, 1, Number.MAX_SAFE_INTEGER, 'maxJsonBytes'),
    maxCompressedBytes: integer(data.maxCompressedBytes, 1, Number.MAX_SAFE_INTEGER, 'maxCompressedBytes'),
  });
}

function envelope(input: unknown, bounds: CertificateFileLimits): { readonly nodes: readonly unknown[] } {
  const data = record(input, ['schema', 'variableCount', 'roots', 'nodes'], 'forest');
  assert.equal(data.schema, 'af9-bdd-forest-v1');
  integer(data.variableCount, 0, Number.MAX_SAFE_INTEGER, 'variableCount');
  assert(Array.isArray(data.roots) && data.roots.length === 1, 'Forest requires one root');
  assert(Array.isArray(data.nodes) && data.nodes.length <= bounds.maxNodes, 'Forest exceeds node limit');
  // Canonical graph validation belongs to Bdd.importForest. Current-only
  // support and safety belong to the fresh symbolic certificate verifier.
  return { nodes: data.nodes };
}

export function validateForestArtifact(input: unknown, requestedLimits: CertificateFileLimits): ForestArtifact {
  const bounds = limits(requestedLimits);
  const data = record(input, ['id', 'file', 'bytes', 'sha256', 'jsonBytes', 'jsonSha256', 'nodes'], 'entry');
  assert(typeof data.id === 'string' && data.id.length > 0, 'Forest ID must be nonempty');
  assert(typeof data.file === 'string' && /^cone-[0-9]{5}\.json\.gz$/.test(data.file), 'Invalid forest filename');
  assert(typeof data.sha256 === 'string' && /^[0-9a-f]{64}$/.test(data.sha256), 'Invalid compressed hash');
  assert(typeof data.jsonSha256 === 'string' && /^[0-9a-f]{64}$/.test(data.jsonSha256), 'Invalid JSON hash');
  return Object.freeze({
    id: data.id, file: data.file,
    bytes: integer(data.bytes, 1, bounds.maxCompressedBytes, 'Compressed bytes'),
    sha256: data.sha256,
    jsonBytes: integer(data.jsonBytes, 1, bounds.maxJsonBytes, 'JSON bytes'),
    jsonSha256: data.jsonSha256,
    nodes: integer(data.nodes, 0, bounds.maxNodes, 'Nodes'),
  });
}

/** Bound allocation before reading, and check the same regular file descriptor throughout. */
export function readBoundedBytes(path: string, maximum: number, expectedBytes?: number): Buffer {
  integer(maximum, 1, Number.MAX_SAFE_INTEGER, 'Byte limit');
  if (expectedBytes !== undefined) integer(expectedBytes, 0, maximum, 'Expected bytes');
  const original = lstatSync(path);
  assert(original.isFile() && !original.isSymbolicLink(), 'Certificate input must be a regular non-symlink file');
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor);
    assert(before.isFile() && before.dev === original.dev && before.ino === original.ino, 'Certificate input changed before open');
    integer(before.size, 0, maximum, 'File bytes');
    if (expectedBytes !== undefined) assert.equal(before.size, expectedBytes, 'Byte count mismatch');
    const buffer = Buffer.alloc(before.size + 1);
    let count = 0;
    while (count < buffer.length) {
      const received = readSync(descriptor, buffer, count, buffer.length - count, count);
      if (received === 0) break;
      count += received;
    }
    const after = fstatSync(descriptor);
    assert.equal(count, before.size, 'File length changed during bounded read');
    assert.equal(after.size, before.size, 'File size changed during bounded read');
    return buffer.subarray(0, count);
  } finally {
    closeSync(descriptor);
  }
}

export function parseJsonBytes(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
}

/** Caller owns a new output directory; existing forest files are never overwritten. */
export function writeForestArtifact(directory: string, index: number, id: string, forest: unknown,
  requestedLimits: CertificateFileLimits): ForestArtifact {
  const bounds = limits(requestedLimits);
  integer(index, 0, 99_999, 'Forest index');
  assert(typeof id === 'string' && id.length > 0, 'Forest ID must be nonempty');
  const shape = envelope(forest, bounds);
  const json = Buffer.from(JSON.stringify(forest) + '\n');
  assert(json.length <= bounds.maxJsonBytes, 'Forest exceeds uncompressed byte limit');
  const compressed = gzipSync(json, { level: 6 });
  assert(compressed.length <= bounds.maxCompressedBytes, 'Forest exceeds compressed byte limit');
  const entry = Object.freeze({ id, file: `cone-${String(index).padStart(5, '0')}.json.gz`,
    bytes: compressed.length, sha256: hashBytes(compressed), jsonBytes: json.length,
    jsonSha256: hashBytes(json), nodes: shape.nodes.length });
  writeFileSync(join(directory, entry.file), compressed, { flag: 'wx', mode: 0o600 });
  return entry;
}

/** Integrity/envelope checks do not grant a semantic proof; the result must be imported and verified. */
export function readForestArtifact(directory: string, input: unknown, requestedLimits: CertificateFileLimits): unknown {
  const bounds = limits(requestedLimits);
  const entry = validateForestArtifact(input, bounds);
  const compressed = readBoundedBytes(join(directory, entry.file), bounds.maxCompressedBytes, entry.bytes);
  assert.equal(hashBytes(compressed), entry.sha256, 'Compressed checksum mismatch');
  const json = gunzipSync(compressed, { maxOutputLength: bounds.maxJsonBytes });
  assert.equal(json.length, entry.jsonBytes, 'Uncompressed byte count mismatch');
  assert.equal(hashBytes(json), entry.jsonSha256, 'Uncompressed checksum mismatch');
  const forest = parseJsonBytes(json);
  assert.equal(envelope(forest, bounds).nodes.length, entry.nodes, 'Forest node count mismatch');
  return forest;
}
