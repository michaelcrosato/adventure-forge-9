import assert from "node:assert/strict";
import test from "node:test";
import { validateScenario, type Scenario } from "../src/engine/content.js";
import {
  SymbolicModel,
  symbolicReachability,
  type SemanticState,
  type SymbolicReachability,
  type SymbolicReachabilityOptions,
} from "../src/verification/symbolic-model.js";

const RAW_FIXTURE = {
  version: 1,
  initialScene: "start",
  initialResources: { energy: 1 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "Two paths enter the same hub." }] },
    { id: "hub", title: "Hub", text: [{ text: "The reserve can be opened or drained." }] },
    { id: "loop", title: "Loop", text: [{ text: "The loop can reset or finish." }] },
  ],
  choices: [
    {
      id: "enter-left",
      scene: "start",
      label: "Enter by the left path",
      description: "Take the left path into the hub.",
      when: [{ type: "flag", flag: "opened", value: false }],
      effects: [{ type: "setFlag", flag: "opened", value: true }, { type: "goTo", scene: "hub" }],
    },
    {
      id: "enter-right",
      scene: "start",
      label: "Enter by the right path",
      description: "Take the right path into the hub.",
      when: [{ type: "flag", flag: "opened", value: false }],
      effects: [{ type: "setFlag", flag: "opened", value: true }, { type: "goTo", scene: "hub" }],
    },
    {
      id: "open-gate",
      scene: "hub",
      label: "Open the gate",
      description: "Spend the reserve to open the gate.",
      when: [
        { type: "flag", flag: "opened", value: true },
        { type: "flag", flag: "armed", value: false },
        { type: "resourceAtLeast", resource: "energy", value: 1 },
      ],
      effects: [
        { type: "adjustResource", resource: "energy", delta: -1 },
        { type: "setFlag", flag: "armed", value: true },
        { type: "goTo", scene: "loop" },
      ],
    },
    {
      id: "drain-reserve",
      scene: "hub",
      label: "Drain the reserve",
      description: "Spend the reserve without opening the gate.",
      when: [
        { type: "flag", flag: "opened", value: true },
        { type: "flag", flag: "armed", value: false },
        { type: "resourceAtLeast", resource: "energy", value: 1 },
      ],
      effects: [
        { type: "adjustResource", resource: "energy", delta: -1 },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "reset-loop",
      scene: "loop",
      label: "Reset the loop",
      description: "Restore the reserve and return to the hub.",
      when: [
        { type: "flag", flag: "armed", value: true },
        { type: "resourceAtMost", resource: "energy", value: 0 },
      ],
      effects: [
        { type: "setResource", resource: "energy", value: 1 },
        { type: "setFlag", flag: "armed", value: false },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "finish-loop",
      scene: "loop",
      label: "Finish the loop",
      description: "Finish while the gate is armed.",
      when: [
        { type: "flag", flag: "armed", value: true },
        { type: "resourceAtMost", resource: "energy", value: 0 },
      ],
      effects: [],
      outcome: { status: "completed", summary: "The gate holds." },
    },
    {
      id: "leave-empty-hub",
      scene: "hub",
      label: "Leave the drained hub",
      description: "Leave after the reserve is gone.",
      when: [
        { type: "flag", flag: "opened", value: true },
        { type: "flag", flag: "armed", value: false },
        { type: "resourceAtMost", resource: "energy", value: 0 },
      ],
      effects: [],
      outcome: { status: "departed", summary: "The drained hub is left behind." },
    },
  ],
} as const;

const SCENARIO: Scenario = validateScenario(RAW_FIXTURE);
const BOUNDS = { energy: 1 } as const;
const REVERSED_FIELDS = [
  "flag:opened",
  "flag:armed",
  "resource:energy",
  "ending",
  "status",
  "scene",
] as const;

type ExpectedKey = "start" | "hub-full" | "loop" | "hub-empty" | "completed" | "departed";

const EXPECTED: Readonly<Record<ExpectedKey, SemanticState>> = {
  start: { scene: "start", status: "playing", ending: 0, resources: { energy: 1 }, flags: { armed: false, opened: false } },
  "hub-full": { scene: "hub", status: "playing", ending: 0, resources: { energy: 1 }, flags: { armed: false, opened: true } },
  loop: { scene: "loop", status: "playing", ending: 0, resources: { energy: 0 }, flags: { armed: true, opened: true } },
  "hub-empty": { scene: "hub", status: "playing", ending: 0, resources: { energy: 0 }, flags: { armed: false, opened: true } },
  completed: { scene: "loop", status: "completed", ending: 1, resources: { energy: 0 }, flags: { armed: true, opened: true } },
  departed: { scene: "hub", status: "departed", ending: 2, resources: { energy: 0 }, flags: { armed: false, opened: true } },
};

const EXPECTED_KEYS = Object.keys(EXPECTED) as ExpectedKey[];
const FRONTIERS: readonly (readonly ExpectedKey[])[] = [
  ["start"],
  ["hub-full"],
  ["loop", "hub-empty"],
  ["completed", "departed"],
];
const EDGES: readonly { readonly from: ExpectedKey; readonly to: ExpectedKey; readonly choiceId: string }[] = [
  { from: "start", to: "hub-full", choiceId: "enter-left" },
  { from: "start", to: "hub-full", choiceId: "enter-right" },
  { from: "hub-full", to: "loop", choiceId: "open-gate" },
  { from: "hub-full", to: "hub-empty", choiceId: "drain-reserve" },
  { from: "loop", to: "hub-full", choiceId: "reset-loop" },
  { from: "loop", to: "completed", choiceId: "finish-loop" },
  { from: "hub-empty", to: "departed", choiceId: "leave-empty-hub" },
];
const CHOICE_IDS = EDGES.map(edge => edge.choiceId);

function union(model: SymbolicModel, keys: readonly ExpectedKey[]): number {
  return keys.reduce((formula, key) => model.bdd.or(formula, model.encode(EXPECTED[key])), 0);
}

function assertFormula(model: SymbolicModel, actual: number, keys: readonly ExpectedKey[], label: string): void {
  assert.equal(model.bdd.xor(actual, union(model, keys)), 0, `${label} matches the explicit state set`);
}

function formulaMembers(model: SymbolicModel, formula: number): ExpectedKey[] {
  return EXPECTED_KEYS.filter(key => model.bdd.and(formula, model.encode(EXPECTED[key])) !== 0);
}

function follow(path: readonly string[]): ExpectedKey {
  let current: ExpectedKey = "start";
  for (const choiceId of path) {
    const edge = EDGES.find(candidate => candidate.from === current && candidate.choiceId === choiceId);
    assert.ok(edge, `independent fixture accepts ${choiceId} from ${current}`);
    current = edge.to;
  }
  return current;
}

function witnessSnapshot(result: SymbolicReachability): Readonly<Record<string, unknown>> {
  const copy = (paths: Readonly<Record<string, readonly string[]>>) =>
    Object.fromEntries(Object.entries(paths).sort(([left], [right]) => left.localeCompare(right)).map(([id, path]) => [id, [...path]]));
  return {
    sceneWitnesses: copy(result.sceneWitnesses),
    choiceWitnesses: copy(result.choiceWitnesses),
    endingWitnesses: copy(result.endingWitnesses),
  };
}

function resultSignature(model: SymbolicModel, result: SymbolicReachability): Readonly<Record<string, unknown>> {
  return {
    reachable: formulaMembers(model, result.reachable),
    completable: formulaMembers(model, result.completable),
    deadEnds: formulaMembers(model, result.deadEnds),
    noCompletion: formulaMembers(model, result.noCompletion),
    frontiers: result.frontiers.map(frontier => formulaMembers(model, frontier)),
    unreachableScenes: [...result.unreachableScenes],
    unreachableChoices: [...result.unreachableChoices],
    witnesses: witnessSnapshot(result),
  };
}

function assertResult(model: SymbolicModel, result: SymbolicReachability, label: string): void {
  assert.equal(result.exhaustive, true, `${label} reaches a fixed point`);
  assertFormula(model, result.reachable, EXPECTED_KEYS, `${label} reachable`);
  assertFormula(model, result.completable, ["start", "hub-full", "loop", "completed"], `${label} completable`);
  assertFormula(model, result.deadEnds, [], `${label} dead ends`);
  assertFormula(model, result.noCompletion, ["hub-empty"], `${label} no-completion`);
  assert.equal(result.reachableCount, 6n, `${label} reachable count`);
  assert.equal(result.frontiers.length, FRONTIERS.length, `${label} frontier depth`);
  for (const [index, expected] of FRONTIERS.entries()) {
    assertFormula(model, result.frontiers[index]!, expected, `${label} frontier ${index}`);
  }

  assert.deepEqual(result.unreachableScenes, [], `${label} has no unreachable fixture scene`);
  assert.deepEqual(result.unreachableChoices, [], `${label} has no unreachable fixture choice`);
  assert.deepEqual(Object.keys(result.sceneWitnesses).sort(), ["hub", "loop", "start"], `${label} scene witness keys`);
  assert.deepEqual(Object.keys(result.choiceWitnesses).sort(), [...CHOICE_IDS].sort(), `${label} choice witness keys`);
  assert.deepEqual(Object.keys(result.endingWitnesses).sort(), ["finish-loop", "leave-empty-hub"], `${label} ending witness keys`);

  for (const [sceneId, path] of Object.entries(result.sceneWitnesses)) {
    const finalKey = follow(path);
    assert.equal(EXPECTED[finalKey].scene, sceneId, `${label} scene witness ${sceneId} follows the fixture`);
  }
  for (const [choiceId, path] of Object.entries(result.choiceWitnesses)) {
    assert.equal(path.at(-1), choiceId, `${label} choice witness ends with ${choiceId}`);
    follow(path);
  }
  for (const [choiceId, path] of Object.entries(result.endingWitnesses)) {
    assert.equal(path.at(-1), choiceId, `${label} ending witness ends with ${choiceId}`);
    follow(path);
  }
}

function makeModel(order: "interleaved" | "blocked", fieldOrder: readonly string[] | undefined, transitionMode: "relational" | "partitioned"): SymbolicModel {
  return new SymbolicModel(SCENARIO, BOUNDS, {
    order,
    fieldOrder,
    transitionMode,
    nodeLimit: 100_000,
    cacheLimit: 10_000,
  });
}

function run(
  order: "interleaved" | "blocked",
  fieldOrder: readonly string[] | undefined,
  transitionMode: "relational" | "partitioned",
  accumulationMode: "unmasked" | "masked",
  options: Omit<SymbolicReachabilityOptions, "accumulationMode"> = {},
): { readonly model: SymbolicModel; readonly result: SymbolicReachability } {
  const model = makeModel(order, fieldOrder, transitionMode);
  const result = symbolicReachability(model, 32, undefined, { ...options, accumulationMode });
  return { model, result };
}

test("masked accumulation matches the independent cycle/reset graph in every layout and transition mode", () => {
  for (const order of ["interleaved", "blocked"] as const) {
    for (const fieldOrder of [undefined, REVERSED_FIELDS] as const) {
      for (const transitionMode of ["relational", "partitioned"] as const) {
        const label = `${order}/${fieldOrder === undefined ? "default-fields" : "reversed-fields"}/${transitionMode}`;
        const baseline = run(order, fieldOrder, transitionMode, "unmasked");
        const masked = run(order, fieldOrder, transitionMode, "masked");
        assertResult(baseline.model, baseline.result, `${label}/unmasked`);
        assertResult(masked.model, masked.result, `${label}/masked`);
        assert.deepEqual(resultSignature(masked.model, masked.result), resultSignature(baseline.model, baseline.result), `${label} masked result matches baseline`);
      }
    }
  }
});

test("masked accumulation preserves witnesses and state sets through threshold-one compaction", () => {
  for (const order of ["interleaved", "blocked"] as const) {
    for (const fieldOrder of [undefined, REVERSED_FIELDS] as const) {
      for (const transitionMode of ["relational", "partitioned"] as const) {
        const label = `${order}/${fieldOrder === undefined ? "default-fields" : "reversed-fields"}/${transitionMode}`;
        const ordinary = run(order, fieldOrder, transitionMode, "masked");
        const compacted = run(order, fieldOrder, transitionMode, "masked", { compactAtNodes: 1 });
        assertResult(ordinary.model, ordinary.result, `${label}/ordinary`);
        assertResult(compacted.result.model, compacted.result, `${label}/compacted`);
        assert.ok(compacted.result.compactions > 0, `${label} performs forced compaction`);
        assert.equal(compacted.result.model.transitionMode, transitionMode, `${label} preserves transition mode after compaction`);
        assert.deepEqual(compacted.result.model.fieldOrder, ordinary.model.fieldOrder, `${label} preserves field order after compaction`);
        assert.deepEqual(resultSignature(compacted.result.model, compacted.result), resultSignature(ordinary.model, ordinary.result), `${label} compact result matches ordinary result`);
      }
    }
  }
});

test("symbolic reachability rejects invalid accumulation modes before allocating traversal nodes", () => {
  const model = makeModel("interleaved", undefined, "relational");
  const before = model.bdd.stats();
  for (const accumulationMode of ["invented", "", null, false, 0, {}, []]) {
    assert.throws(
      () => symbolicReachability(model, 32, undefined, { accumulationMode } as unknown as SymbolicReachabilityOptions),
      /accumulation mode/i,
    );
    assert.deepEqual(model.bdd.stats(), before);
  }
});

test("symbolic reachability snapshots a getter-backed accumulation mode once", () => {
  const model = makeModel("blocked", REVERSED_FIELDS, "partitioned");
  let reads = 0;
  const options: SymbolicReachabilityOptions = {
    compactAtNodes: 1,
    get accumulationMode() {
      if (++reads !== 1) throw new Error("Accumulation option was reread");
      return "masked" as const;
    },
  };
  const result = symbolicReachability(model, 32, undefined, options);
  assert.equal(reads, 1);
  assertResult(result.model, result, "snapshotted masked mode");
});
