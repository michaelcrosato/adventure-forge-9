import assert from "node:assert/strict";
import test from "node:test";
import { SymbolicModel, type SemanticState } from "../src/verification/symbolic-model.js";

const PARTITION_SCENARIO = {
  version: 1,
  initialScene: "start",
  initialResources: { fuel: 2, tide: 0 },
  initialFacts: [],
  clocks: [{ id: "phase-clock", resource: "tide", max: 2 }],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The crossing begins." }] },
    { id: "mid", title: "Mid", text: [{ text: "The far bank waits." }] },
  ],
  choices: [
    {
      id: "reset-route",
      scene: "start",
      label: "Reset and cross",
      description: "Set the fuel aside and cross the changing tide.",
      effects: [
        { type: "setResource", resource: "fuel", value: 0 },
        { type: "advanceClock", clock: "phase-clock", delta: 1 },
        { type: "setFlag", flag: "ready", value: true },
        { type: "goTo", scene: "mid" },
      ],
    },
    {
      id: "finish",
      scene: "mid",
      label: "Finish the crossing",
      description: "Close the crossing once the marker is ready.",
      when: [{ type: "flag", flag: "ready", value: true }],
      effects: [],
      outcome: { status: "completed", summary: "The crossing is complete." },
    },
  ],
} as const;

const BOUNDS = { fuel: 2, tide: 2 } as const;

function models(): readonly [SymbolicModel, SymbolicModel] {
  return [
    new SymbolicModel(PARTITION_SCENARIO, BOUNDS, { transitionMode: "relational", nodeLimit: 100_000, cacheLimit: 20_000 }),
    new SymbolicModel(PARTITION_SCENARIO, BOUNDS, { transitionMode: "partitioned", nodeLimit: 100_000, cacheLimit: 20_000 }),
  ];
}

function state(
  scene: string,
  resources: { fuel: number; tide: number },
  ready: boolean,
  status: SemanticState["status"] = "playing",
  ending = 0,
): SemanticState {
  return { scene, status, ending, resources, flags: { ready } };
}

function choice(model: SymbolicModel, id: string) {
  const result = model.choices.find(option => option.id === id);
  assert.ok(result, `choice ${id} is present`);
  return result;
}

function imageState(model: SymbolicModel, source: SemanticState, choiceId: string): SemanticState | undefined {
  const image = model.image(model.encode(source), choice(model, choiceId));
  if (image === 0) return undefined;
  assert.equal(model.bdd.count(image, model.currentVariables), 1n, "a singleton source has a singleton image");
  return model.decode(model.bdd.satisfyingAssignment(image)!);
}

function preimageKeys(model: SymbolicModel, target: SemanticState, choiceId: string): readonly string[] {
  const preimage = model.preimage(model.encode(target), choice(model, choiceId));
  const candidates: SemanticState[] = [];
  for (const scene of ["start", "mid"] as const) {
    for (let fuel = 0; fuel <= 2; fuel++) {
      for (let tide = 0; tide <= 2; tide++) {
        for (const ready of [false, true]) {
          const candidate = state(scene, { fuel, tide }, ready);
          if (model.bdd.and(preimage, model.encode(candidate)) !== 0) candidates.push(candidate);
        }
      }
    }
  }
  return candidates.map(value => JSON.stringify(value)).sort();
}

test("partitioned image and preimage match relational reset, clock, and terminal transitions", () => {
  const [relational, partitioned] = models();
  assert.equal(partitioned.transitionMode, "partitioned");
  assert.equal(partitioned.fresh().transitionMode, "partitioned");

  for (let fuel = 0; fuel <= 2; fuel++) {
    for (let tide = 0; tide <= 2; tide++) {
      for (const ready of [false, true]) {
        const source = state("start", { fuel, tide }, ready);
        assert.deepEqual(
          imageState(partitioned, source, "reset-route"),
          imageState(relational, source, "reset-route"),
          `reset image parity for fuel=${fuel}, tide=${tide}, ready=${ready}`,
        );
      }
    }
  }

  for (const tide of [1, 2] as const) {
    const target = state("mid", { fuel: 0, tide }, true);
    assert.deepEqual(
      preimageKeys(partitioned, target, "reset-route"),
      preimageKeys(relational, target, "reset-route"),
      `reset preimage parity at tide=${tide}`,
    );
  }

  const terminalSource = state("mid", { fuel: 1, tide: 2 }, true);
  assert.deepEqual(
    imageState(partitioned, terminalSource, "finish"),
    imageState(relational, terminalSource, "finish"),
    "terminal status and ending factors preserve lifecycle parity",
  );
  const terminalTarget = state("mid", { fuel: 1, tide: 2 }, true, "completed", 1);
  assert.deepEqual(
    preimageKeys(partitioned, terminalTarget, "finish"),
    preimageKeys(relational, terminalTarget, "finish"),
    "terminal preimage parity preserves the authored receipt identity",
  );
});

test("partitioned mode validates options, ownership, and current-only inputs", () => {
  assert.throws(
    () => new SymbolicModel(PARTITION_SCENARIO, BOUNDS, { transitionMode: "unexpected" as "relational" }),
    /Unknown symbolic transition mode/,
  );

  const [, model] = models();
  const [, foreign] = models();
  const reset = choice(model, "reset-route");
  const foreignReset = choice(foreign, "reset-route");
  assert.throws(() => model.image(model.initial, foreignReset), /different model/);
  assert.throws(() => model.preimage(model.initial, foreignReset), /different model/);

  const nextVariable = model.bdd.variable(model.nextVariables[0]!);
  assert.throws(() => model.image(nextVariable, reset), /current-only predicate/);
  assert.throws(() => model.preimage(nextVariable, reset), /current-only predicate/);
  assert.throws(() => model.image(999_999, reset), /Invalid BDD handle/);
});
