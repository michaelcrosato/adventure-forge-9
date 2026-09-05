import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EvidenceWriter, verifyEvidence } from '../src/playtest/evidence.js';
import { parseInterview } from '../src/playtest/prompts.js';

test('evidence preserves failed attempts, seals appends, detects changed responses', () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-evidence-'));
  try {
    const writer = new EvidenceWriter(process.cwd(), root);
    writer.append('provider_response', { text: 'I was confused.' });
    writer.seal('incomplete_interview', { reason: 'provider interrupted' });
    assert.equal(verifyEvidence(writer.directory).manifest.status, 'incomplete_interview');
    assert.throws(() => writer.append('replaced_interview', {}), /sealed/);
    const path = join(writer.directory, 'events.jsonl');
    chmodSync(path, 0o600);
    writeFileSync(path, readFileSync(path, 'utf8').replace('confused', 'delighted'));
    assert.throws(() => verifyEvidence(writer.directory), /mismatch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('evidence cannot live in source and structured ratings are validated', () => {
  assert.throws(() => new EvidenceWriter(process.cwd(), process.cwd()), /outside/);
  assert.throws(() => parseInterview('{"clarity":6}'), /Malformed/);
  assert.equal(parseInterview(JSON.stringify({ clarity: 2, enjoyment: 3, confusion: ['stakes'], observedDefects: [], playAgain: false, reason: 'Too short' })).clarity, 2);
});
