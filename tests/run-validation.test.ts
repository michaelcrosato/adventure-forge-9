import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BUILD_ID, start, end, observe, stateHash } from '../src/engine/index.js';
import { EvidenceWriter, sourceSnapshot, snapshotIdentity } from '../src/playtest/evidence.js';
import { validateRun } from '../src/playtest/validate.js';

/** Synthetic protocol fixtures are deleted after each test and never count as live play. */
function fixture(mode: 'valid' | 'wrong-player' | 'wrong-action' | 'interrupted' | 'duplicate-player') {
  const root = mkdtempSync(join(tmpdir(), 'af9-protocol-fixture-'));
  const writer = new EvidenceWriter(process.cwd(), root);
  const state = start(1);
  const snapshot = sourceSnapshot(process.cwd());
  writer.write('setup.json', { kind: 'mechanical-fixture', seed: 1, buildId: BUILD_ID, sourceId: snapshotIdentity(snapshot), initialStateHash: stateHash(state) });
  writer.write('source.json', snapshot);
  writer.append('player_initialized', { threadId: 'synthetic-player' });
  writer.append('observation', { threadId: 'synthetic-player', observation: observe(state), stateHash: stateHash(state) });
  writer.append('player_response', { threadId: 'synthetic-player', phase: 'play', raw: JSON.stringify({ choiceId: mode === 'wrong-action' ? 'rescue-people' : '__end__' }) });
  const finished = end(state, 0);
  writer.append('action', { choiceId: '__end__', expectedRevision: 0, previousHash: stateHash(state), stateHash: stateHash(finished) });
  writer.append('observation', { threadId: 'synthetic-player', observation: observe(finished), stateHash: stateHash(finished) });
  if (mode === 'duplicate-player') writer.append('player_initialized', { threadId: 'replacement' });
  if (mode === 'interrupted') writer.seal('incomplete_interview', { reason: 'synthetic transport interruption' });
  else {
    const receipt = observe(finished).receipt;
    const threadId = mode === 'wrong-player' ? 'replacement' : 'synthetic-player';
    const freeResponse = 'Synthetic fixture answer, not an authentic interview.';
    const extracted = { clarity: 3, enjoyment: 2, confusion: [], observedDefects: [], playAgain: false, reason: 'Synthetic fixture' };
    const structuredResponse = JSON.stringify(extracted);
    writer.append('player_response', { threadId, phase: 'free_interview', raw: freeResponse });
    writer.append('player_response', { threadId, phase: 'structured_interview', raw: structuredResponse });
    writer.write('provider.json', { authMode: 'chatgpt', isolation: { verified: true }, synthetic: true });
    writer.write('exit.json', { threadId, receipt });
    writer.write('interview.json', { threadId, receipt, freeResponse, structuredResponse, extracted });
    writer.seal('completed', { synthetic: true });
  }
  return { directory: writer.directory, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('protocol replay validates synthetic evidence without granting live acceptance', () => {
  const valid = fixture('valid');
  const interrupted = fixture('interrupted');
  try {
    assert.deepEqual(validateRun(valid.directory), { integrity: true, replay: true, liveAccepted: false, actions: 1 });
    assert.equal(validateRun(interrupted.directory).liveAccepted, false);
  } finally { valid.cleanup(); interrupted.cleanup(); }
});

test('substituted interview, action, or conversation cannot pass validation', () => {
  for (const mode of ['wrong-player', 'wrong-action', 'duplicate-player'] as const) {
    const record = fixture(mode);
    try { assert.throws(() => validateRun(record.directory), /session mismatch|original player response|Duplicate/); }
    finally { record.cleanup(); }
  }
});
