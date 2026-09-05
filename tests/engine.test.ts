import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILD_ID, IllegalChoiceError, SaveFormatError, StaleRevisionError,
  choose, end, observe, replay, restore, save, start, stateHash, type GameState,
} from "../src/engine/index.js";
import { RAW_SCENARIO } from "../src/content/scenario.js";
import { validateScenario } from "../src/engine/content.js";
import { RESOLUTION_WITNESSES, walk } from "./witnesses.js";

test("same seed and actions produce the same state and hash", () => {
  const actions = RESOLUTION_WITNESSES.share.map((choiceId, expectedRevision) => ({ choiceId, expectedRevision }));
  const first = replay(19, actions);
  assert.deepEqual(first, replay(19, actions));
  assert.equal(stateHash(first), stateHash(replay(19, actions)));
  assert.notEqual(stateHash(first), stateHash(replay(20, actions)));
  assert.match(BUILD_ID, /^af9-[0-9a-f]{24}$/);
});

test("public projection excludes hidden state and preserves only authored public journal labels", () => {
  const observation = observe(start(4));
  assert.deepEqual(Object.keys(observation).sort(), ["choices", "facts", "journal", "resources", "revision", "sceneId", "status", "text", "title"]);
  for (const field of ["seed", "flags", "history", "buildId", "knownFacts"]) assert.equal(field in observation, false, field);
  assert.ok(observation.facts.every(fact => fact.includes(' ')), 'facts must be readable phrases');
  assert.deepEqual(observation.journal, []);
  const visited = walk(['visit-clinic']);
  const view = observe(visited);
  assert.equal(view.journal.length, 1);
  assert.deepEqual(Object.keys(view.journal[0]!).sort(), ['choice', 'from', 'to']);
  assert.equal(view.journal[0]!.choice, observation.choices.find(choice => choice.id === 'visit-clinic')!.label);
  assert.equal(view.journal[0]!.from, observation.title);
  assert.equal(view.journal[0]!.to, view.title);
  assert.deepEqual(observe(restore(save(visited))), view);
});

test("repair/share, council control, and evacuation have distinct changed returns and completed receipts", () => {
  const shared = walk(RESOLUTION_WITNESSES.share);
  const council = walk(RESOLUTION_WITNESSES.council);
  const evacuated = walk(RESOLUTION_WITNESSES.evacuate);
  for (const state of [shared, council, evacuated]) {
    assert.equal(state.status, 'completed');
    assert.equal(state.receipt?.kind, 'completed');
    assert.equal(state.receipt?.revision, state.revision);
    assert.equal(state.receipt?.stateHash, stateHash(state));
    assert.deepEqual(observe(state).choices, []);
    assert.equal(state.history.some(action => action.choiceId.startsWith('release-') || action.choiceId === 'signal-evacuation'), true);
  }
  assert.equal(shared.flags['shared-water'], true);
  assert.equal(shared.resources.water, 2);
  assert.equal(shared.resources.supplies, 0);
  assert.equal(shared.resources.medicine, 0, 'both intake and fever-ward doses are used');
  assert.equal(shared.resources.tools, 0, 'the repair kit is installed');
  assert.match(shared.receipt!.summary, /clinic|Ilyra/i);
  assert.equal(council.flags['council-control'], true);
  assert.equal(council.resources.water, 1);
  assert.ok(council.resources.debt! > shared.resources.debt!);
  assert.match(council.receipt!.summary, /charter|ration/i);
  assert.equal(evacuated.flags['evacuation-plan'], true);
  assert.equal(evacuated.resources.evacuees, 8);
  assert.equal(evacuated.resources.water, 0);
  assert.ok(evacuated.resources.risk! > shared.resources.risk!);
  assert.match(evacuated.receipt!.summary, /families|flood/i);
  const returned = walk(RESOLUTION_WITNESSES.share.slice(0, -2));
  assert.equal(returned.scene, RAW_SCENARIO.initialScene);
  assert.notDeepEqual(observe(returned).text, observe(start()).text);
  assert.equal(observe(returned).choices.some(choice => choice.id === 'visit-clinic'), false, 'return must not permit preparation farming');
});

test('preparation changes evacuation outcomes and a prior council seal does not trap the clinic detour', () => {
  const base = ['find-nessa', 'work-without-tools'];
  const resolution = ['read-stolen-order', 'open-evacuation-route', 'signal-evacuation', 'organize-high-ground-evacuation'];
  const unmarked = walk([...base, 'follow-canal', ...resolution, 'lead-unmarked-evacuation']);
  const scouted = walk([...base, 'pay-scouts', ...resolution, 'lead-evacuation']);
  assert.equal(unmarked.resources.evacuees, 7);
  assert.equal(scouted.resources.evacuees, 8);
  assert.equal(scouted.resources.supplies! + 1, unmarked.resources.supplies);
  const detour = walk(['hear-council', 'take-council-seal', 'ask-clinic-before-leaving', 'make-clinic-promise', 'continue-with-council-seal']);
  assert.equal(detour.scene, 'workshop');
  assert.equal(detour.resources.debt, 1, 'revisiting council must not charge for a second seal');
  assert.equal(observe(detour).choices.some(choice => choice.id === 'ask-clinic-before-leaving'), false);
  const councilReturn = walk(['visit-clinic', 'make-clinic-promise', 'take-council-seal', 'borrow-repair-tools', 'follow-canal', 'read-stolen-order', 'give-red-sluice-to-council', 'release-council-water', 'report-council-rationing']);
  const exemption = choose(councilReturn, 'win-clinic-exemption', councilReturn.revision);
  assert.equal(exemption.status, 'completed');
  assert.equal(exemption.resources.debt, councilReturn.resources.debt! - 1);
  assert.equal(exemption.resources.medicine, councilReturn.resources.medicine! - 1);
  assert.equal(exemption.resources.supplies, councilReturn.resources.supplies! - 1);
});

test("the warned flooded tunnel is fatal and voluntary departure preserves consequences", () => {
  const atGate = walk(['find-nessa', 'work-without-tools', 'follow-canal', 'force-sluice-gate']);
  const warning = observe(atGate).choices.find(choice => choice.id === 'take-flooded-tunnel');
  assert.ok(warning);
  assert.match(warning.description, /die|death|fatal|survive|drown/i);
  const dead = choose(atGate, 'take-flooded-tunnel', atGate.revision);
  assert.equal(dead.status, 'dead');
  assert.equal(dead.receipt?.kind, 'dead');
  const departed = end(atGate, atGate.revision);
  assert.equal(departed.status, 'departed');
  assert.deepEqual(departed.resources, atGate.resources);
  assert.deepEqual(departed.knownFacts, atGate.knownFacts);
});

test("stale and illegal actions throw without changing the input", () => {
  const state = start();
  const before = stateHash(state);
  assert.throws(() => choose(state, 'visit-clinic', 1), StaleRevisionError);
  assert.throws(() => choose(state, 'unknown-choice', 0), IllegalChoiceError);
  assert.equal(stateHash(state), before);
  const visited = choose(state, 'visit-clinic', 0);
  const after = stateHash(visited);
  assert.throws(() => choose(visited, 'visit-clinic', 1), IllegalChoiceError);
  assert.equal(stateHash(visited), after);
  assert.throws(() => end(visited, 0), StaleRevisionError);
});

test("save, restore, replay, end, and tamper detection preserve witnesses", () => {
  const state = walk(RESOLUTION_WITNESSES.share.slice(0, 5), 8);
  const serialized = save(state);
  assert.deepEqual(restore(serialized), state);
  const actions = state.history.map(action => ({ choiceId: action.choiceId, expectedRevision: action.fromRevision }));
  assert.deepEqual(replay(8, actions), state);
  const departed = end(state, state.revision);
  assert.deepEqual(replay(8, [...actions, { choiceId: '__end__', expectedRevision: state.revision }]), departed);
  const tampered = JSON.parse(serialized) as { payload: Record<string, unknown>; hash: string };
  const resources = tampered.payload.resources as Record<string, number>;
  resources.supplies = resources.supplies! + 1;
  assert.throws(() => restore(JSON.stringify(tampered)), SaveFormatError);
  tampered.hash = stateHash(tampered.payload as unknown as GameState);
  assert.throws(() => restore(JSON.stringify(tampered)), SaveFormatError, 'a rehashed invented checkpoint is still invalid');
  assert.throws(() => restore('not-json'), SaveFormatError);
});

test("content validation rejects unknown behavior and cumulative resource underflow", () => {
  const malformed = {
    ...RAW_SCENARIO,
    choices: RAW_SCENARIO.choices.map((choice, index) => index === 0 ? { ...choice, effects: [{ type: 'runArbitraryCode' }, ...choice.effects] } : choice),
  };
  assert.throws(() => validateScenario(malformed), /unknown effect type/);
  const resource = Object.keys(RAW_SCENARIO.initialResources)[0]!;
  const underflow = {
    ...RAW_SCENARIO,
    choices: RAW_SCENARIO.choices.map((choice, index) => index === 0 ? {
      ...choice,
      when: [{ type: 'resourceAtLeast', resource, value: 1 }],
      effects: [
        { type: 'adjustResource', resource, delta: -1 },
        { type: 'adjustResource', resource, delta: -1 },
        { type: 'goTo', scene: RAW_SCENARIO.initialScene },
      ],
    } : choice),
  };
  assert.throws(() => validateScenario(underflow), /could become negative/);
});
