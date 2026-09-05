import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILD_ID,
  choose,
  observe,
  replay,
  restore,
  save,
  start,
  stateHash,
  type GameState,
} from "../src/engine/index.js";
import { FACT_LABELS } from "../src/content/scenario.js";
import {
  SCENARIO,
  type Choice,
  type Condition,
} from "../src/engine/content.js";
import { AUTHORED_WITNESS_PROVENANCE, AUTHORED_WITNESSES } from "./authored-witnesses.js";

type WitnessKind = "scene" | "choice" | "ending";
type WitnessMap = Readonly<Record<string, readonly string[]>>;

interface AuthoredWitnessCatalog {
  readonly scene: WitnessMap;
  readonly choice: WitnessMap;
  readonly ending: WitnessMap;
}

const CATALOG: AuthoredWitnessCatalog = AUTHORED_WITNESSES;
const PROVENANCE = AUTHORED_WITNESS_PROVENANCE;
const SEED = 1;
const CHOICES = new Map(SCENARIO.choices.map((choice) => [choice.id, choice] as const));
const SCENES = new Map(SCENARIO.scenes.map((scene) => [scene.id, scene] as const));
const CLOCKS = new Map((SCENARIO.clocks ?? []).map((clock) => [clock.id, clock] as const));

interface Counters {
  paths: number;
  actions: number;
  checkpoints: number;
  legalChecks: number;
  textChecks: number;
  factsChecks: number;
  journalChecks: number;
  rawEffectChecks: number;
  receiptChecks: number;
  replayChecks: number;
  endpointChecks: number;
}

function emptyCounters(): Counters {
  return {
    paths: 0,
    actions: 0,
    checkpoints: 0,
    legalChecks: 0,
    textChecks: 0,
    factsChecks: 0,
    journalChecks: 0,
    rawEffectChecks: 0,
    receiptChecks: 0,
    replayChecks: 0,
    endpointChecks: 0,
  };
}

function conditionMatches(condition: Condition, state: Pick<GameState, "flags" | "resources">): boolean {
  if (condition.type === "flag") return (state.flags[condition.flag] ?? false) === condition.value;
  if (condition.type === "resourceAtLeast") return (state.resources[condition.resource] ?? 0) >= condition.value;
  if (condition.type === "resourceAtMost") return (state.resources[condition.resource] ?? 0) <= condition.value;
  return assertNever(condition);
}

function conditionsMatch(conditions: readonly Condition[] | undefined, state: Pick<GameState, "flags" | "resources">): boolean {
  return (conditions ?? []).every((condition) => conditionMatches(condition, state));
}

function assertNever(value: never): never {
  throw new Error(`Unknown authored vocabulary: ${JSON.stringify(value)}`);
}

function expectedJournal(state: GameState): readonly { choice: string; from: string; to: string }[] {
  let sceneId = SCENARIO.initialScene;
  return state.history.map((action) => {
    const authored = CHOICES.get(action.choiceId);
    const from = SCENES.get(sceneId);
    assert.ok(from, `journal source scene ${sceneId} exists`);
    for (const effect of authored?.effects ?? []) {
      if (effect.type === "goTo") sceneId = effect.scene;
    }
    const to = SCENES.get(sceneId);
    assert.ok(to, `journal destination scene ${sceneId} exists`);
    return { choice: authored?.label ?? "End journey", from: from!.title, to: to!.title };
  });
}

function assertObservation(state: GameState, counters: Counters, label: string): ReturnType<typeof observe> {
  const view = observe(state);
  const expectedKeys = ["choices", "facts", "journal", "resources", "revision", "sceneId", "status", "text", "title"];
  if (state.status !== "playing") expectedKeys.push("receipt");
  assert.deepEqual(Object.keys(view).sort(), expectedKeys.sort(), `${label} observation fields`);
  for (const hidden of ["seed", "flags", "history", "knownFacts", "buildId"]) {
    assert.equal(hidden in view, false, `${label} hides ${hidden}`);
  }

  const scene = SCENES.get(state.scene);
  assert.ok(scene, `${label} scene exists`);
  const legal = state.status === "playing"
    ? SCENARIO.choices.filter((choice) => choice.scene === state.scene && conditionsMatch(choice.when, state))
    : [];
  assert.deepEqual(view.choices.map((choice) => choice.id), legal.map((choice) => choice.id), `${label} legal choice catalog`);
  for (const option of view.choices) {
    const choice = CHOICES.get(option.id);
    assert.ok(choice, `${label} option ${option.id} is authored`);
    assert.deepEqual(option, {
      id: choice!.id,
      label: choice!.label,
      description: choice!.description,
    }, `${label} option ${option.id} metadata`);
  }
  counters.legalChecks++;

  assert.deepEqual(
    view.text,
    scene!.text.filter((line) => conditionsMatch(line.when, state)).map((line) => line.text),
    `${label} conditional text`,
  );
  counters.textChecks++;

  assert.deepEqual(
    view.facts,
    state.knownFacts.map((fact) => Object.hasOwn(FACT_LABELS, fact) ? FACT_LABELS[fact as keyof typeof FACT_LABELS] : fact),
    `${label} fact labels`,
  );
  counters.factsChecks++;
  assert.deepEqual(view.journal, expectedJournal(state), `${label} public journey journal`);
  assert.equal(view.journal.length, state.history.length, `${label} journal length`);
  for (const entry of view.journal) assert.deepEqual(Object.keys(entry).sort(), ["choice", "from", "to"]);
  counters.journalChecks++;
  assert.equal(view.revision, state.revision, `${label} revision metadata`);
  assert.equal(view.sceneId, state.scene, `${label} scene metadata`);
  assert.equal(view.status, state.status, `${label} status metadata`);
  assert.equal(view.title, scene!.title, `${label} title metadata`);
  assert.deepEqual(view.resources, state.resources, `${label} resource projection`);
  if (state.receipt === undefined) assert.equal("receipt" in view, false, `${label} playing state has no receipt`);
  else assert.deepEqual(view.receipt, state.receipt, `${label} receipt projection`);
  return view;
}

function assertCheckpoint(state: GameState, counters: Counters, label: string): void {
  assert.equal(Object.isFrozen(state), true, `${label} engine state is immutable`);
  const serialized = save(state);
  assert.equal(typeof serialized, "string", `${label} save is a string`);
  assert.ok(serialized.length > 0, `${label} save is nonempty`);
  const hash = stateHash(state);
  const view = assertObservation(state, counters, label);
  const restored = restore(serialized);
  assert.deepEqual(restored, state, `${label} restore preserves the complete state`);
  assert.equal(save(restored), serialized, `${label} save is stable after restore`);
  assert.equal(stateHash(restored), hash, `${label} restored hash`);
  assert.deepEqual(observe(restored), view, `${label} restored observation`);
  assert.equal(Object.isFrozen(restored), true, `${label} restored state is immutable`);
  counters.checkpoints++;
}

function applyRawEffects(state: GameState, choice: Choice): Pick<GameState, "scene" | "resources" | "flags" | "knownFacts"> {
  const resources = { ...state.resources };
  const flags = { ...state.flags };
  const knownFacts = [...state.knownFacts];
  let scene = state.scene;
  for (const [effectIndex, effect] of choice.effects.entries()) {
    switch (effect.type) {
      case "setFlag":
        flags[effect.flag] = effect.value;
        break;
      case "setResource":
        resources[effect.resource] = effect.value;
        break;
      case "adjustResource":
        resources[effect.resource] = (resources[effect.resource] ?? 0) + effect.delta;
        break;
      case "advanceClock": {
        const clock = CLOCKS.get(effect.clock);
        assert.ok(clock, `effect ${choice.id}[${effectIndex}] clock exists`);
        const current = resources[clock!.resource];
        assert.ok(current !== undefined, `effect ${choice.id}[${effectIndex}] clock resource exists`);
        resources[clock!.resource] = effect.delta >= clock!.max - current! ? clock!.max : current! + effect.delta;
        break;
      }
      case "addFact":
        if (!knownFacts.includes(effect.fact)) knownFacts.push(effect.fact);
        break;
      case "goTo":
        scene = effect.scene;
        break;
      default:
        assertNever(effect as never);
    }
    for (const [resource, value] of Object.entries(resources)) {
      assert.ok(Number.isSafeInteger(value) && value >= 0, `${choice.id}[${effectIndex}] keeps ${resource} safe`);
      const clock = [...CLOCKS.values()].find((candidate) => candidate.resource === resource);
      if (clock !== undefined) assert.ok(value <= clock.max, `${choice.id}[${effectIndex}] keeps ${resource} within its clock bound`);
    }
  }
  return { scene, resources, flags, knownFacts };
}

function assertTerminalOutcome(state: GameState, choice: Choice, label: string, counters: Counters): void {
  if (choice.outcome === undefined) {
    assert.equal(state.status, "playing", `${label} nonterminal status`);
    assert.equal(state.receipt, undefined, `${label} nonterminal receipt`);
    return;
  }
  assert.equal(state.status, choice.outcome.status, `${label} terminal status`);
  assert.deepEqual(state.receipt, {
    kind: choice.outcome.status,
    summary: choice.outcome.summary,
    revision: state.revision,
    stateHash: stateHash(state),
  }, `${label} terminal receipt`);
  counters.receiptChecks++;
}

function assertEndpoint(kind: WitnessKind, id: string, path: readonly string[], state: GameState, label: string, counters: Counters): void {
  const view = observe(state);
  if (kind === "scene") {
    assert.equal(state.scene, id, `${label} scene endpoint`);
    assert.equal(state.status, "playing", `${label} scene witness remains playable`);
  } else {
    assert.equal(state.history.at(-1)?.choiceId, id, `${label} action endpoint`);
    if (kind === "ending") {
      const choice = CHOICES.get(id);
      assert.ok(choice?.outcome, `${label} ending target is terminal`);
      assert.notEqual(state.status, "playing", `${label} ending is terminal`);
      assert.equal(state.receipt?.kind, choice!.outcome!.status, `${label} ending receipt status`);
    }
  }
  assert.equal(view.sceneId, state.scene, `${label} endpoint scene projection`);
  assert.equal(view.status, state.status, `${label} endpoint status projection`);
  assert.equal(view.revision, state.revision, `${label} endpoint revision projection`);
  if (state.receipt !== undefined) assert.equal(stateHash(state), state.receipt.stateHash, `${label} endpoint receipt hash`);
  assert.ok(path.length === state.revision, `${label} path/revision identity`);
  counters.endpointChecks++;
}

function replayWitness(kind: WitnessKind, id: string, path: readonly string[], counters: Counters): void {
  let state = start(SEED);
  const initialSnapshot = structuredClone(state) as GameState;
  assertCheckpoint(state, counters, `${kind}:${id}:initial`);
  assert.deepEqual(state, initialSnapshot, `${kind}:${id} initial state is not mutated by checks`);

  for (const [index, choiceId] of path.entries()) {
    assert.equal(state.status, "playing", `${kind}:${id} action ${index} starts while playing`);
    assert.equal(state.revision, index, `${kind}:${id} action ${index} revision`);
    assert.deepEqual(state.history.map((action) => action.choiceId), path.slice(0, index), `${kind}:${id} prefix history`);
    const view = assertObservation(state, counters, `${kind}:${id}:before-${index}`);
    const choice = CHOICES.get(choiceId);
    assert.ok(choice, `${kind}:${id} action ${choiceId} is authored`);
    assert.equal(choice!.scene, state.scene, `${kind}:${id} action ${choiceId} scene`);
    assert.ok(view.choices.some((option) => option.id === choiceId), `${kind}:${id} action ${choiceId} is legal`);
    assert.ok(conditionsMatch(choice!.when, state), `${kind}:${id} action ${choiceId} conditions`);
    const oldState = structuredClone(state) as GameState;
    const oldSave = save(state);
    const oldHash = stateHash(state);
    const oldObservation = observe(state);
    const raw = applyRawEffects(state, choice!);
    const next = choose(state, choiceId, state.revision);
    assert.deepEqual(state, oldState, `${kind}:${id} action ${choiceId} leaves old state unchanged`);
    assert.equal(save(state), oldSave, `${kind}:${id} action ${choiceId} leaves old save unchanged`);
    assert.equal(stateHash(state), oldHash, `${kind}:${id} action ${choiceId} leaves old hash unchanged`);
    assert.deepEqual(observe(state), oldObservation, `${kind}:${id} action ${choiceId} leaves old observation unchanged`);
    assert.deepEqual(
      { scene: next.scene, resources: next.resources, flags: next.flags, knownFacts: next.knownFacts },
      raw,
      `${kind}:${id} action ${choiceId} applies authored effects in order`,
    );
    counters.rawEffectChecks++;
    assert.equal(next.revision, index + 1, `${kind}:${id} action ${choiceId} increments revision`);
    assert.deepEqual(next.history, [
      ...oldState.history,
      { choiceId, fromRevision: index, toRevision: index + 1 },
    ], `${kind}:${id} action ${choiceId} records history`);
    assertTerminalOutcome(next, choice!, `${kind}:${id} action ${choiceId}`, counters);
    state = next;
    assertCheckpoint(state, counters, `${kind}:${id}:after-${index + 1}`);
    counters.actions++;
  }

  assert.deepEqual(state.history.map((action) => action.choiceId), path, `${kind}:${id} complete history`);
  const replayed = replay(SEED, state.history.map((action) => ({
    choiceId: action.choiceId,
    expectedRevision: action.fromRevision,
  })));
  assert.deepEqual(replayed, state, `${kind}:${id} full replay state`);
  assert.equal(stateHash(replayed), stateHash(state), `${kind}:${id} full replay hash`);
  assert.deepEqual(observe(replayed), observe(state), `${kind}:${id} full replay observation`);
  counters.replayChecks++;
  assertEndpoint(kind, id, path, state, `${kind}:${id}`, counters);
  counters.paths++;
}

function assertCatalogShape(): void {
  for (const kind of ["scene", "choice", "ending"] as const) {
    assert.ok(CATALOG[kind] !== null && typeof CATALOG[kind] === "object", `${kind} witness map is present`);
  }
  const expected = {
    scene: SCENARIO.scenes.map((scene) => scene.id),
    choice: SCENARIO.choices.map((choice) => choice.id),
    ending: SCENARIO.choices.filter((choice) => choice.outcome !== undefined).map((choice) => choice.id),
  } satisfies Record<WitnessKind, readonly string[]>;
  for (const kind of ["scene", "choice", "ending"] as const) {
    assert.deepEqual(Object.keys(CATALOG[kind]).sort(), [...expected[kind]].sort(), `${kind} witness target set matches current authored data`);
    for (const [id, path] of Object.entries(CATALOG[kind])) {
      assert.ok(Array.isArray(path), `${kind}:${id} witness is an action path`);
      assert.ok(path.every((choiceId) => typeof choiceId === "string" && choiceId.length > 0), `${kind}:${id} witness IDs are strings`);
    }
  }
  const expectedTotal = Object.values(expected).reduce((total, ids) => total + ids.length, 0);
  const actualTotal = Object.keys(CATALOG.scene).length + Object.keys(CATALOG.choice).length + Object.keys(CATALOG.ending).length;
  assert.equal(actualTotal, expectedTotal, "the authored endpoint catalog covers every current target exactly once");
}

test("all authored scene, choice, and ending witnesses replay through the public engine", () => {
  const started = performance.now();
  assertCatalogShape();
  const counters = emptyCounters();
  for (const kind of ["scene", "choice", "ending"] as const) {
    for (const [id, path] of Object.entries(CATALOG[kind])) replayWitness(kind, id, path, counters);
  }

  assert.equal(BUILD_ID.length > 0, true, "current engine build identity is available");
  console.log(JSON.stringify({
    authoredEndpointCoverage: {
      engineBuildId: BUILD_ID,
      witnessProvenance: PROVENANCE,
      pathCounts: { scene: Object.keys(CATALOG.scene).length, choice: Object.keys(CATALOG.choice).length, ending: Object.keys(CATALOG.ending).length },
      counters,
      elapsedMs: performance.now() - started,
      scope: "explicit authored endpoint witnesses; not a universal state-space reachability proof",
    },
  }));
});
