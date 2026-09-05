import assert from "node:assert/strict";
import test from "node:test";
import { SymbolicModel, type SymbolicOptions } from "../src/verification/symbolic-model.js";

const SCENARIO = {
  version: 1,
  initialScene: "start",
  initialResources: { fuel: 1, water: 0 },
  initialFacts: [],
  scenes: [
    {
      id: "start",
      title: "Start",
      text: [
        { text: "The ferry waits." },
        { text: "The lantern is ready.", when: [{ type: "flag", flag: "ready", value: true }] },
      ],
    },
    {
      id: "finish",
      title: "Finish",
      text: [{ text: "The crossing is complete." }],
    },
  ],
  choices: [
    {
      id: "prepare",
      scene: "start",
      label: "Prepare the ferry",
      description: "Spend the fuel and set the lantern.",
      when: [
        { type: "flag", flag: "ready", value: false },
        { type: "resourceAtLeast", resource: "fuel", value: 1 },
      ],
      effects: [
        { type: "setResource", resource: "fuel", value: 0 },
        { type: "setFlag", flag: "ready", value: true },
        { type: "goTo", scene: "finish" },
      ],
    },
    {
      id: "complete",
      scene: "finish",
      label: "Complete the crossing",
      description: "Close the log.",
      when: [{ type: "flag", flag: "ready", value: true }],
      effects: [],
      outcome: { status: "completed", summary: "The crossing is complete." },
    },
  ],
} as const;

const BOUNDS = Object.freeze({ fuel: 1, water: 1 });
const DEFAULT_FIELD_ORDER = [
  "scene",
  "status",
  "ending",
  "resource:fuel",
  "resource:water",
  "flag:ready",
] as const;

function makeModel(options: SymbolicOptions = {}): SymbolicModel {
  return new SymbolicModel(SCENARIO, BOUNDS, {
    nodeLimit: 20_000,
    cacheLimit: 2_000,
    ...options,
  });
}

function decoded(model: SymbolicModel, root: number) {
  const assignment = model.bdd.satisfyingAssignment(root);
  assert.ok(assignment !== undefined);
  return model.decode(assignment);
}

test("fieldOrder reorders bit assignment while preserving the exact model", () => {
  const defaultModel = makeModel();
  const requested = [...DEFAULT_FIELD_ORDER].reverse();
  const reordered = makeModel({ fieldOrder: requested });

  assert.deepEqual(defaultModel.fieldOrder, DEFAULT_FIELD_ORDER);
  assert.deepEqual(reordered.fieldOrder, requested);
  assert.ok(Object.isFrozen(defaultModel.fieldOrder));
  assert.ok(Object.isFrozen(reordered.fieldOrder));
  assert.notEqual(reordered.initial, defaultModel.initial, "field order should change encoded bit positions");
  assert.equal(
    reordered.bdd.count(reordered.validDomain, reordered.currentVariables),
    defaultModel.bdd.count(defaultModel.validDomain, defaultModel.currentVariables),
  );

  const defaultNext = defaultModel.image(defaultModel.initial, defaultModel.choices[0]!);
  const reorderedNext = reordered.image(reordered.initial, reordered.choices[0]!);
  assert.deepEqual(decoded(reordered, reordered.initial), decoded(defaultModel, defaultModel.initial));
  assert.deepEqual(decoded(reordered, reorderedNext), decoded(defaultModel, defaultNext));
});

test("fieldOrder is snapshotted for fresh generations and rejects malformed permutations", () => {
  const requested = [...DEFAULT_FIELD_ORDER].reverse();
  const model = makeModel({ fieldOrder: requested });
  const snapshot = [...model.fieldOrder];
  requested[0] = "scene";
  requested.reverse();

  const fresh = model.fresh();
  assert.deepEqual(model.fieldOrder, snapshot);
  assert.deepEqual(fresh.fieldOrder, snapshot);
  assert.deepEqual(fresh.currentVariables, model.currentVariables);
  assert.throws(() => (model.fieldOrder as string[]).push("scene"), TypeError);

  const duplicate = [...DEFAULT_FIELD_ORDER.slice(0, -1), DEFAULT_FIELD_ORDER[0]];
  const sparse = [...DEFAULT_FIELD_ORDER];
  delete sparse[2];
  const malformed: unknown[] = [
    null,
    "scene",
    DEFAULT_FIELD_ORDER.slice(0, -1),
    [...DEFAULT_FIELD_ORDER, "flag:ready"],
    [...DEFAULT_FIELD_ORDER.slice(0, -1), "flag:unknown"],
    duplicate,
    sparse,
    [...DEFAULT_FIELD_ORDER.slice(0, -1), undefined],
  ];
  for (const fieldOrder of malformed) {
    assert.throws(
      () => makeModel({ fieldOrder: fieldOrder as readonly string[] }),
      /fieldOrder/i,
      `malformed fieldOrder should be rejected: ${String(fieldOrder)}`,
    );
  }
});

test("fieldOrder works with the blocked variable layout as well", () => {
  const defaultModel = makeModel({ order: "blocked" });
  const reordered = makeModel({ order: "blocked", fieldOrder: [...DEFAULT_FIELD_ORDER].reverse() });
  const defaultNext = defaultModel.image(defaultModel.initial, defaultModel.choices[0]!);
  const reorderedNext = reordered.image(reordered.initial, reordered.choices[0]!);

  assert.deepEqual(decoded(reordered, reordered.initial), decoded(defaultModel, defaultModel.initial));
  assert.deepEqual(decoded(reordered, reorderedNext), decoded(defaultModel, defaultNext));
});
