import { choose, observe, start, stateHash, type GameState, type Observation } from "./index.js";
import { SCENARIO } from "./content.js";
import { createFutureInfluenceAnalyzer, type FutureInfluenceAnalysis } from "./future-influence.js";
import {
  assertParametersPreserved, bindParameters, instantiateText, parameterizeText,
  type ConservedFields, type ProjectionValues,
} from "./conserved-projection.js";

/**
 * An opt-in audit of concrete active cores with exact, conserved parameters.
 * See docs/CONSERVED_PARAMETER_AUDIT.md for its proof and explicit limits.
 * Families are not concrete states or full observation equivalence classes.
 */
export interface FamilyScenarioAudit {
  readonly exhaustive: true;
  readonly representation: "conserved-parameters";
  readonly families: number;
  readonly transitions: number;
  readonly authoredScenes: number;
  readonly authoredChoices: number;
  readonly reachableScenes: readonly string[];
  readonly unreachableScenes: readonly string[];
  readonly unreachableChoices: readonly string[];
  readonly deadEnds: readonly (readonly string[])[];
  readonly noCompletionPaths: readonly { scene: string; path: readonly string[] }[];
  readonly maxChoices: number;
  readonly representativeMaxProjectionWords: number;
  readonly projectionWordsExhaustive: false;
  readonly choiceWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly endingWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly mergedVisits: number;
  readonly congruenceSuccessors: number;
  readonly witnessReplayChecks: number;
}

interface Evaluation {
  readonly state: GameState;
  readonly analysis: FutureInfluenceAnalysis;
  readonly parameters: ConservedFields;
  readonly bindings: ProjectionValues;
  readonly key: string;
  readonly template: string;
  readonly view: Observation;
}

interface Family {
  readonly state: GameState;
  readonly parentIndex: number;
  readonly choiceFromParent?: string;
}

interface RepresentativeMemo {
  readonly evaluation: Evaluation;
  readonly steps: Map<string, Evaluation>;
}

// Queue entries remain authoritative. This finite LRU only retains immutable
// representative work long enough to avoid repeating it during collisions.
const REPRESENTATIVE_CACHE_LIMIT = 1024;

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pathTo(queue: readonly Family[], index: number): string[] {
  const path: string[] = [];
  while (index !== 0) {
    const entry = queue[index];
    if (entry === undefined || entry.parentIndex < 0 || entry.choiceFromParent === undefined) {
      throw new Error("Family audit predecessor chain is incomplete");
    }
    path.push(entry.choiceFromParent);
    index = entry.parentIndex;
  }
  return path.reverse();
}

function activeFields(analysis: FutureInfluenceAnalysis): ConservedFields {
  return { resources: analysis.activeResources, flags: analysis.activeFlags };
}

function parameterFields(analysis: FutureInfluenceAnalysis): ConservedFields {
  return { resources: analysis.conservedResources, flags: analysis.conservedFlags };
}

function assertSubset(after: readonly string[], before: readonly string[], label: string): void {
  const available = new Set(before);
  for (const name of after) {
    if (!available.has(name)) throw new Error(`Family audit ${label} became active: ${name}`);
  }
}

/** Every incoming parameter retains its own value, even if no later text reads it. */
function assertHandoff(before: Evaluation, after: Evaluation): void {
  assertParametersPreserved(before.state, after.state, before.parameters);
  assertSubset(after.analysis.activeResources, before.analysis.activeResources, "resource");
  assertSubset(after.analysis.activeFlags, before.analysis.activeFlags, "flag");
  assertSubset(
    after.parameters.flags,
    [...before.analysis.activeFlags, ...before.parameters.flags],
    "previously irrelevant flag",
  );
}

/** Compare only newly conserved bindings; existing parameters may differ exactly. */
function assertNewBindings(left: Evaluation, right: Evaluation, incoming: ConservedFields): void {
  const resources = new Set(incoming.resources);
  const flags = new Set(incoming.flags);
  const newlyConserved: ConservedFields = {
    resources: left.parameters.resources.filter(name => !resources.has(name)),
    flags: left.parameters.flags.filter(name => !flags.has(name)),
  };
  if (!same(bindParameters(left.state, newlyConserved), bindParameters(right.state, newlyConserved))) {
    throw new Error("Family audit newly conserved successor bindings diverged");
  }
}

function wordCount(view: Observation): number {
  const words = [view.title, ...view.text, ...view.facts,
    ...view.choices.flatMap(choice => [choice.label, choice.description])].join(" ").trim();
  return words.length === 0 ? 0 : words.split(/\s+/).length;
}

/**
 * Traverse only genuine engine states reached from start(1). Analysis uses
 * the same validated, immutable SCENARIO as the engine. There is no supplied
 * initial valuation, alternate runtime, widening, or mutable scenario factory.
 * This does not replace auditScenario or the release gate by itself.
 */
export function auditScenarioFamilies(maxFamilies = 250_000): FamilyScenarioAudit {
  if (!Number.isSafeInteger(maxFamilies) || maxFamilies < 1) throw new Error("Invalid family audit limit");
  const analyze = createFutureInfluenceAnalyzer(SCENARIO);
  const scenesById = new Map(SCENARIO.scenes.map(scene => [scene.id, scene]));
  const resourceNames = Object.keys(SCENARIO.initialResources).sort();

  const evaluate = (state: GameState): Evaluation => {
    const analysis = analyze(state);
    const parameters = parameterFields(analysis);
    // Capture and validate exact values BEFORE building a residual template.
    const bindings = bindParameters(state, parameters);
    const active = bindParameters(state, activeFields(analysis));
    const view = observe(state);
    const scene = scenesById.get(state.scene);
    if (scene === undefined || view.sceneId !== state.scene || view.status !== state.status
      || view.revision !== state.revision || view.title !== scene.title) {
      throw new Error("Family audit scene/lifecycle projection diverged");
    }
    const text = parameterizeText(scene, state, parameters);
    if (!same(instantiateText(text, bindings), view.text)) {
      throw new Error("Family audit exact parameter substitution diverged from observed text");
    }
    const displayed = { ...active.resources, ...bindings.resources };
    if (!same(Object.keys(displayed).sort(), resourceNames)
      || !same(Object.keys(view.resources).sort(), resourceNames)
      || resourceNames.some(name => displayed[name] !== view.resources[name])) {
      throw new Error("Family audit exact resource projection diverged");
    }
    if (state.status !== "playing") {
      if (view.choices.length !== 0 || view.receipt === undefined
        || view.receipt.kind !== state.status || view.receipt.revision !== state.revision
        || view.receipt.stateHash !== stateHash(state)) {
        throw new Error("Family audit invalid terminal projection");
      }
    }
    return {
      state, analysis, parameters, bindings, view,
      template: JSON.stringify(text),
      key: JSON.stringify({
        scene: state.scene, status: state.status,
        ending: state.receipt === undefined ? null : [state.receipt.kind, state.receipt.summary],
        active, parameters,
        justifiers: analysis.pruningJustifiers,
      }),
    };
  };

  const step = (before: Evaluation, choiceId: string): Evaluation => {
    const hash = stateHash(before.state);
    const next = choose(before.state, choiceId, before.view.revision);
    if (stateHash(before.state) !== hash) throw new Error(`Action mutated its input: ${choiceId}`);
    if (next.revision !== before.state.revision + 1 || !Number.isSafeInteger(next.revision)) {
      throw new Error(`Action did not safely advance revision: ${choiceId}`);
    }
    if (Object.values(next.resources).some(value => !Number.isSafeInteger(value) || value < 0)) {
      throw new Error(`Invalid resource balance: ${choiceId}`);
    }
    const after = evaluate(next);
    assertHandoff(before, after);
    return after;
  };

  const assertEquivalent = (left: Evaluation, right: Evaluation): void => {
    if (left.key !== right.key || !same(left.analysis, right.analysis)
      || left.template !== right.template || !same(left.view.choices, right.view.choices)) {
      throw new Error("Family audit collision has divergent cores, declarations, text templates or choices");
    }
  };

  const initial = evaluate(start(1));
  const queue: Family[] = [{ state: initial.state, parentIndex: -1 }];
  const indices = new Map([[initial.key, 0]]);
  const representativeCache = new Map<number, RepresentativeMemo>([
    [0, { evaluation: initial, steps: new Map<string, Evaluation>() }],
  ]);

  const representative = (index: number): Evaluation => {
    const cached = representativeCache.get(index);
    if (cached !== undefined) {
      // Refresh the entry in the finite LRU. The queue is still the source of
      // truth if an entry was evicted.
      representativeCache.delete(index);
      representativeCache.set(index, cached);
      return cached.evaluation;
    }
    const family = queue[index];
    if (family === undefined) throw new Error(`Family audit representative is missing: ${index}`);
    const entry: RepresentativeMemo = { evaluation: evaluate(family.state), steps: new Map() };
    representativeCache.set(index, entry);
    if (representativeCache.size > REPRESENTATIVE_CACHE_LIMIT) {
      const oldest = representativeCache.keys().next().value;
      if (oldest !== undefined) representativeCache.delete(oldest);
    }
    return entry.evaluation;
  };

  const representativeStep = (index: number, choiceId: string): Evaluation => {
    const current = representative(index);
    const entry = representativeCache.get(index);
    if (entry === undefined) throw new Error(`Family audit representative cache entry is missing: ${index}`);
    const cached = entry.steps.get(choiceId);
    if (cached !== undefined) return cached;
    const next = step(current, choiceId);
    entry.steps.set(choiceId, next);
    return next;
  };

  const parents: number[][] = [[]];
  const completed = new Set<number>();
  const scenes = new Set<string>();
  const choices = new Map<string, string[]>();
  const endings = new Map<string, string[]>();
  const witnessHashes = new Map<string, string>();
  const deadEnds: string[][] = [];
  let transitions = 0;
  let mergedVisits = 0;
  let congruenceSuccessors = 0;
  let maxChoices = 0;
  let representativeMaxProjectionWords = 0;

  for (let index = 0; index < queue.length; index++) {
    const current = representative(index);
    const view = current.view;
    scenes.add(view.sceneId);
    maxChoices = Math.max(maxChoices, view.choices.length);
    representativeMaxProjectionWords = Math.max(representativeMaxProjectionWords, wordCount(view));
    if (view.status !== "playing") {
      if (view.status === "completed") completed.add(index);
      continue;
    }
    if (view.choices.length === 0) deadEnds.push(pathTo(queue, index));
    for (const choice of view.choices) {
      const next = representativeStep(index, choice.id);
      transitions++;
      if (!choices.has(choice.id)) {
        choices.set(choice.id, [...pathTo(queue, index), choice.id]);
        witnessHashes.set(choice.id, stateHash(next.state));
      }
      // Ending identity can merge across authored actions. Retain a witness
      // for each actual terminal action before merging its resulting family.
      if (next.state.status !== "playing" && !endings.has(choice.id)) {
        endings.set(choice.id, [...pathTo(queue, index), choice.id]);
      }
      const existing = indices.get(next.key);
      if (existing === undefined) {
        if (indices.size >= maxFamilies) {
          throw new Error(`Audit exceeded ${maxFamilies} conserved-parameter families; exhaustive coverage is not established`);
        }
        indices.set(next.key, queue.length);
        queue.push({ state: next.state, parentIndex: index, choiceFromParent: choice.id });
        parents.push([index]);
      } else {
        mergedVisits++;
        parents[existing]!.push(index);
        const existingRepresentative = representative(existing);
        assertEquivalent(existingRepresentative, next);
        for (const successorChoice of existingRepresentative.view.choices) {
          const left = representativeStep(existing, successorChoice.id);
          const right = step(next, successorChoice.id);
          congruenceSuccessors++;
          assertEquivalent(left, right);
          assertNewBindings(left, right, existingRepresentative.parameters);
        }
      }
    }
  }

  // Equal active cores have a common legal completion path for all bindings.
  // Departures, deaths and the global end operation do not seed this traversal.
  const backwards = [...completed];
  for (let index = 0; index < backwards.length; index++) {
    for (const parent of parents[backwards[index]!]!) {
      if (!completed.has(parent)) {
        completed.add(parent);
        backwards.push(parent);
      }
    }
  }

  let witnessReplayChecks = 0;
  for (const [id, path] of choices) {
    let state = start(1);
    for (const action of path) state = choose(state, action, state.revision);
    if (path.at(-1) !== id || stateHash(state) !== witnessHashes.get(id)) {
      throw new Error(`Family audit witness does not replay exactly: ${id}`);
    }
    if (endings.has(id) && state.status === "playing") {
      throw new Error(`Family audit ending witness is not terminal: ${id}`);
    }
    witnessReplayChecks++;
  }

  return {
    exhaustive: true, representation: "conserved-parameters",
    families: indices.size, transitions,
    authoredScenes: SCENARIO.scenes.length, authoredChoices: SCENARIO.choices.length,
    reachableScenes: [...scenes].sort(),
    unreachableScenes: SCENARIO.scenes.map(scene => scene.id).filter(id => !scenes.has(id)),
    unreachableChoices: SCENARIO.choices.map(choice => choice.id).filter(id => !choices.has(id)),
    deadEnds,
    noCompletionPaths: queue.flatMap((entry, index) => entry.state.status === "playing" && !completed.has(index)
      ? [{ scene: entry.state.scene, path: pathTo(queue, index) }] : []),
    maxChoices, representativeMaxProjectionWords, projectionWordsExhaustive: false,
    choiceWitnesses: Object.fromEntries(choices), endingWitnesses: Object.fromEntries(endings),
    mergedVisits, congruenceSuccessors, witnessReplayChecks,
  };
}
