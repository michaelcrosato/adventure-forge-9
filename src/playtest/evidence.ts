import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, chmodSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';

export const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export type EvidenceEvent = { sequence: number; at: string; kind: string; data: unknown; previous: string; hash: string };
export type RunStatus = 'completed' | 'interrupted' | 'incomplete_interview' | 'isolation_failed';

function inside(parent: string, child: string) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

export class EvidenceWriter {
  readonly runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  readonly directory: string;
  private previous = '0'.repeat(64);
  private sequence = 0;
  private sealed = false;

  constructor(sourceRoot: string, evidenceRoot = join(homedir(), '.local/share/adventure-forge-9/runs')) {
    mkdirSync(evidenceRoot, { recursive: true, mode: 0o700 });
    const actualRoot = realpathSync(evidenceRoot);
    if (inside(realpathSync(sourceRoot), actualRoot)) throw new Error('Evidence must be outside the source tree');
    this.directory = join(actualRoot, this.runId);
    mkdirSync(this.directory, { mode: 0o700 });
    writeFileSync(join(this.directory, 'events.jsonl'), '', { flag: 'wx', mode: 0o600 });
  }

  append(kind: string, data: unknown) {
    if (this.sealed) throw new Error('Evidence is sealed');
    const record = { sequence: this.sequence, at: new Date().toISOString(), kind, data, previous: this.previous };
    const hash = digest(JSON.stringify(record));
    const event: EvidenceEvent = { ...record, hash };
    appendFileSync(join(this.directory, 'events.jsonl'), JSON.stringify(event) + '\n');
    this.previous = hash;
    this.sequence++;
    return event;
  }

  write(name: string, data: unknown) {
    if (this.sealed) throw new Error('Evidence is sealed');
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(name) || name === 'manifest.json') throw new Error('Invalid evidence filename');
    writeFileSync(join(this.directory, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }

  seal(status: RunStatus, details: Record<string, unknown>) {
    this.append('run_closed', { status, ...details });
    const files = Object.fromEntries(readdirSync(this.directory).sort().map(name => [name, digest(readFileSync(join(this.directory, name)))]));
    const manifest = { format: 1, runId: this.runId, status, events: this.sequence, finalEventHash: this.previous, files, details };
    writeFileSync(join(this.directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o400 });
    for (const name of Object.keys(files)) chmodSync(join(this.directory, name), 0o400);
    this.sealed = true;
    return manifest;
  }
}

export function verifyEvidence(directory: string) {
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  if (manifest.format !== 1 || !manifest.files || typeof manifest.files !== 'object') throw new Error('Invalid manifest');
  const expectedNames = [...Object.keys(manifest.files), 'manifest.json'].sort();
  if (JSON.stringify(readdirSync(directory).sort()) !== JSON.stringify(expectedNames)) throw new Error('Unexpected or missing evidence files');
  for (const [name, hash] of Object.entries(manifest.files)) {
    if (!/^[a-zA-Z0-9_-]+\.jsonl?$/.test(name)) throw new Error('Unsafe evidence path');
    if (digest(readFileSync(join(directory, name))) !== hash) throw new Error(`Evidence hash mismatch: ${name}`);
  }
  const events: EvidenceEvent[] = readFileSync(join(directory, 'events.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  let previous = '0'.repeat(64);
  for (const [index, event] of events.entries()) {
    const { hash, ...record } = event;
    if (record.sequence !== index || record.previous !== previous || digest(JSON.stringify(record)) !== hash) throw new Error('Broken evidence event chain');
    previous = hash;
  }
  if (events.length !== manifest.events || previous !== manifest.finalEventHash) throw new Error('Evidence count mismatch');
  const final = events.at(-1);
  if (final?.kind !== 'run_closed' || (final.data as Record<string, unknown>).status !== manifest.status) throw new Error('Evidence status mismatch');
  return { manifest, events };
}

/** Exact local source snapshot; no credentials or ambient configuration. */
export function sourceSnapshot(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (path: string) => {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const name = join(path, entry.name);
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) files[name] = readFileSync(join(root, name), 'utf8');
    }
  };
  walk('src');
  for (const name of ['package.json', 'package-lock.json', 'tsconfig.json']) files[name] = readFileSync(join(root, name), 'utf8');
  return files;
}

export function snapshotIdentity(snapshot: Record<string, string>) {
  return digest(JSON.stringify(Object.fromEntries(Object.entries(snapshot).sort(([a], [b]) => a < b ? -1 : 1))));
}
