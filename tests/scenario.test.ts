import assert from 'node:assert/strict';
import test from 'node:test';
import { auditScenario } from '../src/engine/audit.js';

test('every authored scene and choice is reachable; every legal transition preserves state invariants', () => {
  const audit = auditScenario();
  assert.equal(audit.exhaustive, true);
  assert.deepEqual(audit.unreachableScenes, []);
  assert.deepEqual(audit.unreachableChoices, []);
  assert.deepEqual(audit.deadEnds, []);
  assert.deepEqual(audit.noCompletionPaths, [], 'every unfinished state must retain a route to a completed resolution');
});
