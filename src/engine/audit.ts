import { choose, observe, start, stateHash, type GameState } from './index.js';
import { SCENARIO } from './content.js';

/**
 * Conditions/effects can inspect only scenes, flags and resource balances.
 * Facts affect the projection; receipts distinguish endings. History, revision
 * and build hashes do not affect legality, so navigation loops can be collapsed.
 * Revisit this key whenever the closed content vocabulary gains new state.
 */
function semanticKey(state: GameState): string {
  return JSON.stringify({
    scene: state.scene,
    resources: Object.entries(state.resources).sort(([a], [b]) => a.localeCompare(b)),
    flags: Object.entries(state.flags).filter(([, value]) => value).sort(([a], [b]) => a.localeCompare(b)),
    facts: [...state.knownFacts].sort(),
    status: state.status,
    ending: state.receipt?.summary,
  });
}

export function auditScenario(maxStates = 10000) {
  if (!Number.isSafeInteger(maxStates) || maxStates < 1) throw new Error('Invalid audit state limit');
  const initial = start(1);
  const queue = [initial];
  const seen = new Set([semanticKey(initial)]);
  const indices = new Map([[semanticKey(initial), 0]]);
  const parents: number[][] = [[]];
  const completionReachable = new Set<number>();
  const scenes = new Set<string>();
  const choices = new Map<string, string[]>();
  const endings = new Map<string, string[]>();
  const deadEnds: string[][] = [];
  let transitions = 0;
  let maxChoices = 0;
  let maxProjectionWords = 0;
  for (let index = 0; index < queue.length; index++) {
    const state = queue[index]!;
    const view = observe(state);
    scenes.add(view.sceneId);
    maxChoices = Math.max(maxChoices, view.choices.length);
    const words = [view.title, ...view.text, ...view.facts, ...view.choices.flatMap(choice => [choice.label, choice.description])].join(' ').trim().split(/\s+/).length;
    maxProjectionWords = Math.max(maxProjectionWords, words);
    const path = state.history.map(action => action.choiceId);
    if (view.status !== 'playing') {
      if (view.status === 'completed') completionReachable.add(index);
      if (view.choices.length !== 0 || !view.receipt || view.receipt.stateHash !== stateHash(state)) throw new Error('Invalid terminal projection');
      endings.set(path.at(-1)!, endings.get(path.at(-1)!) ?? path);
      continue;
    }
    if (view.choices.length === 0) deadEnds.push(path);
    const before = stateHash(state);
    for (const choice of view.choices) {
      const next = choose(state, choice.id, view.revision);
      transitions++;
      if (stateHash(state) !== before) throw new Error(`Action mutated its input: ${choice.id}`);
      if (next.revision !== state.revision + 1) throw new Error(`Action did not advance revision: ${choice.id}`);
      if (Object.values(next.resources).some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error(`Invalid resource balance: ${choice.id}`);
      choices.set(choice.id, choices.get(choice.id) ?? [...path, choice.id]);
      const key = semanticKey(next);
      if (!seen.has(key)) {
        if (seen.size >= maxStates) throw new Error(`Audit exceeded ${maxStates} semantic states; exhaustive coverage is not established`);
        seen.add(key);
        indices.set(key, queue.length);
        parents.push([]);
        queue.push(next);
      }
      parents[indices.get(key)!]!.push(index);
    }
  }
  const backwards = [...completionReachable];
  for (let index = 0; index < backwards.length; index++) {
    for (const parent of parents[backwards[index]!]!) {
      if (!completionReachable.has(parent)) {
        completionReachable.add(parent);
        backwards.push(parent);
      }
    }
  }
  return {
    exhaustive: true as const,
    states: seen.size,
    transitions,
    authoredScenes: SCENARIO.scenes.length,
    authoredChoices: SCENARIO.choices.length,
    reachableScenes: [...scenes].sort(),
    unreachableScenes: SCENARIO.scenes.map(scene => scene.id).filter(id => !scenes.has(id)),
    unreachableChoices: SCENARIO.choices.map(choice => choice.id).filter(id => !choices.has(id)),
    deadEnds,
    noCompletionPaths: queue.flatMap((state, index) => state.status === 'playing' && !completionReachable.has(index)
      ? [{ scene: state.scene, path: state.history.map(action => action.choiceId) }] : []),
    maxChoices,
    maxProjectionWords,
    choiceWitnesses: Object.fromEntries(choices),
    endingWitnesses: Object.fromEntries(endings),
  };
}
