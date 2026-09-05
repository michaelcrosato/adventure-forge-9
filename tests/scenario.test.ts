import assert from 'node:assert/strict';
import test from 'node:test';
import { auditScenario } from '../src/engine/audit.js';

test('every authored scene and choice is reachable; every legal transition preserves state invariants', (context) => {
  const audit = auditScenario();
  context.diagnostic(JSON.stringify({states: audit.states, transitions: audit.transitions,
    mergedStates: audit.mergedStates, congruenceSuccessors: audit.congruenceSuccessors,
    authoredScenes: audit.authoredScenes, authoredChoices: audit.authoredChoices,
    maxChoices: audit.maxChoices, representativeProjectionWords: audit.representativeMaxProjectionWords}));
  assert.equal(audit.exhaustive, true);
  assert.deepEqual(audit.unreachableScenes, []);
  assert.deepEqual(audit.unreachableChoices, []);
  assert.deepEqual(audit.deadEnds, []);
  assert.deepEqual(audit.noCompletionPaths, [], 'every unfinished state must retain a route to a completed resolution');
});
