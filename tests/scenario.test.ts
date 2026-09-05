import assert from 'node:assert/strict';
import test from 'node:test';
import { auditScenarioFamilies } from '../src/engine/family-audit.js';
import { SCENARIO } from '../src/engine/content.js';

test('every authored scene and choice is reachable; every legal transition preserves state invariants', (context) => {
  const audit = auditScenarioFamilies();
  context.diagnostic(JSON.stringify({representation: audit.representation, families: audit.families, transitions: audit.transitions,
    mergedVisits: audit.mergedVisits, congruenceSuccessors: audit.congruenceSuccessors,
    authoredScenes: audit.authoredScenes, authoredChoices: audit.authoredChoices,
    maxChoices: audit.maxChoices, representativeProjectionWords: audit.representativeMaxProjectionWords,
    choiceWitnesses: Object.keys(audit.choiceWitnesses).length, endingWitnesses: Object.keys(audit.endingWitnesses).length,
    witnessReplayChecks: audit.witnessReplayChecks}));
  assert.equal(audit.exhaustive, true);
  assert.equal(audit.representation, 'conserved-parameters');
  assert.equal(audit.witnessReplayChecks, audit.authoredChoices);
  assert.deepEqual(Object.keys(audit.endingWitnesses).sort(),
    SCENARIO.choices.filter(choice => choice.outcome !== undefined).map(choice => choice.id).sort());
  assert.deepEqual(audit.unreachableScenes, []);
  assert.deepEqual(audit.unreachableChoices, []);
  assert.deepEqual(audit.deadEnds, []);
  assert.deepEqual(audit.noCompletionPaths, [], 'every unfinished family must retain a completed route for each valid conserved binding');
});
