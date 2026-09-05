import assert from "node:assert/strict";
import test from "node:test";
import {
  PackedModel,
  type PackedChoice,
} from "../src/verification/packed-model.js";
import {
  PackedGraphLimitError,
  PackedReachabilityError,
  packedReachability,
} from "../src/verification/packed-reachability.js";

const CHAIN_MAX = 16_385;
const CHAIN_STATE_COUNT = CHAIN_MAX + 3;
const CHAIN_EDGE_COUNT = CHAIN_MAX + 2;

const CHAIN_SCENARIO = {
  version: 1,
  initialScene: "counter",
  initialResources: { counter: 0 },
  initialFacts: [],
  scenes: [
    {
      id: "counter",
      title: "Counter",
      text: [{ text: "The counter advances one mark at a time." }],
    },
    {
      id: "finish-hub",
      title: "Finish",
      text: [{ text: "The counter has reached its final mark." }],
    },
  ],
  choices: [
    {
      id: "advance-counter",
      scene: "counter",
      label: "Advance one mark",
      description: "Advance the counter by one.",
      when: [{ type: "resourceAtMost", resource: "counter", value: CHAIN_MAX - 1 }],
      effects: [
        { type: "adjustResource", resource: "counter", delta: 1 },
        { type: "goTo", scene: "counter" },
      ],
    },
    {
      id: "enter-finish",
      scene: "counter",
      label: "Enter the finish",
      description: "Enter once the final mark is reached.",
      when: [{ type: "resourceAtLeast", resource: "counter", value: CHAIN_MAX }],
      effects: [{ type: "goTo", scene: "finish-hub" }],
    },
    {
      id: "close-finish",
      scene: "finish-hub",
      label: "Close the sequence",
      description: "Record the completed sequence.",
      effects: [],
      outcome: { status: "completed", summary: "The counter sequence is complete." },
    },
  ],
} as const;

const DIAMOND_SCENARIO = {
  version: 1,
  initialScene: "start",
  initialResources: { token: 0 },
  initialFacts: [],
  scenes: [
    {
      id: "start",
      title: "Start",
      text: [{ text: "Several roads leave the starting point." }],
    },
    {
      id: "diamond",
      title: "Diamond",
      text: [{ text: "The road divides and loops back on itself." }],
    },
    {
      id: "trap",
      title: "Trap",
      text: [{ text: "Every exit from this room is barred." }],
    },
    {
      id: "stranded",
      title: "Stranded",
      text: [{ text: "Only departure remains." }],
    },
    {
      id: "complete-hub",
      title: "Completion",
      text: [{ text: "The successful route reaches its close." }],
    },
  ],
  choices: [
    {
      id: "left-diamond",
      scene: "start",
      label: "Take the left road",
      description: "Reach the split.",
      effects: [{ type: "goTo", scene: "diamond" }],
    },
    {
      id: "right-diamond",
      scene: "start",
      label: "Take the right road",
      description: "Reach the same split by another road.",
      effects: [{ type: "goTo", scene: "diamond" }],
    },
    {
      id: "to-trap",
      scene: "start",
      label: "Enter the barred room",
      description: "Enter a room with no usable exit.",
      effects: [{ type: "goTo", scene: "trap" }],
    },
    {
      id: "to-stranded",
      scene: "start",
      label: "Take the stranded road",
      description: "Take a road that can only end in departure.",
      effects: [{ type: "goTo", scene: "stranded" }],
    },
    {
      id: "start-dead",
      scene: "start",
      label: "Walk into the dark",
      description: "Accept the dangerous road.",
      effects: [],
      outcome: { status: "dead", summary: "The starting road ends in darkness." },
    },
    {
      id: "start-depart",
      scene: "start",
      label: "Leave at the start",
      description: "Leave before choosing a road.",
      effects: [],
      outcome: { status: "departed", summary: "The journey is left at the start." },
    },
    {
      id: "cycle-diamond",
      scene: "diamond",
      label: "Circle the split",
      description: "Return to the split.",
      effects: [{ type: "goTo", scene: "diamond" }],
    },
    {
      id: "diamond-dead",
      scene: "diamond",
      label: "Choose the fatal branch",
      description: "Take the branch that kills the traveler.",
      effects: [],
      outcome: { status: "dead", summary: "The split ends in darkness." },
    },
    {
      id: "diamond-depart",
      scene: "diamond",
      label: "Leave the split",
      description: "Leave from the split.",
      effects: [],
      outcome: { status: "departed", summary: "The split is left behind." },
    },
    {
      id: "diamond-complete",
      scene: "diamond",
      label: "Take the completing branch",
      description: "Reach the completion room.",
      effects: [{ type: "goTo", scene: "complete-hub" }],
    },
    {
      id: "trap-blocked",
      scene: "trap",
      label: "Try the barred exit",
      description: "Try an exit that is unavailable without a token.",
      when: [{ type: "resourceAtLeast", resource: "token", value: 1 }],
      effects: [{ type: "goTo", scene: "trap" }],
    },
    {
      id: "stranded-depart",
      scene: "stranded",
      label: "Depart the stranded road",
      description: "End the road by departing.",
      effects: [],
      outcome: { status: "departed", summary: "The stranded road is abandoned." },
    },
    {
      id: "complete",
      scene: "complete-hub",
      label: "Complete the journey",
      description: "Record the completed journey.",
      effects: [],
      outcome: { status: "completed", summary: "The diamond journey is complete." },
    },
  ],
} as const;

const OVERFLOW_SCENARIO = {
  version: 1,
  initialScene: "overflow-start",
  initialResources: {
    fuel: Number.MAX_SAFE_INTEGER,
    reserve: 1,
  },
  initialFacts: [],
  scenes: [
    {
      id: "overflow-start",
      title: "Overflow",
      text: [{ text: "The fuel gauge is at its safe-integer ceiling." }],
    },
    {
      id: "overflow-sink",
      title: "Reset",
      text: [{ text: "The gauge was reset safely." }],
    },
  ],
  choices: [
    {
      id: "overflow-first",
      scene: "overflow-start",
      label: "Attempt the overfill",
      description: "The first effect exceeds the safe integer ceiling.",
      when: [
        { type: "resourceAtLeast", resource: "fuel", value: Number.MAX_SAFE_INTEGER },
        { type: "resourceAtLeast", resource: "reserve", value: 1 },
      ],
      effects: [
        { type: "adjustResource", resource: "fuel", delta: 1 },
        { type: "adjustResource", resource: "reserve", delta: -1 },
        { type: "goTo", scene: "overflow-sink" },
      ],
    },
    {
      id: "reset-fuel",
      scene: "overflow-start",
      label: "Reset the gauge",
      description: "Reset the gauge before leaving.",
      when: [{ type: "resourceAtLeast", resource: "fuel", value: Number.MAX_SAFE_INTEGER }],
      effects: [
        { type: "setResource", resource: "fuel", value: 0 },
        { type: "goTo", scene: "overflow-sink" },
      ],
    },
    {
      id: "finish-reset",
      scene: "overflow-sink",
      label: "Finish after the reset",
      description: "Record the safe reset.",
      effects: [],
      outcome: { status: "completed", summary: "The gauge was reset safely." },
    },
  ],
} as const;

const CLOCK_SCENARIO = {
  version: 1,
  initialScene: "clock-start",
  initialResources: { tide: 2 },
  initialFacts: [],
  clocks: [{ id: "tide-clock", resource: "tide", max: 3 }],
  scenes: [
    {
      id: "clock-start",
      title: "Clock",
      text: [{ text: "The tide is nearly at its cap." }],
    },
    {
      id: "clock-finish",
      title: "Clock finish",
      text: [{ text: "The tide reached its cap." }],
    },
  ],
  choices: [
    {
      id: "advance-tide",
      scene: "clock-start",
      label: "Advance the tide",
      description: "Advance twice; the bounded clock saturates.",
      effects: [
        { type: "advanceClock", clock: "tide-clock", delta: 2 },
        { type: "goTo", scene: "clock-finish" },
      ],
    },
    {
      id: "finish-tide",
      scene: "clock-finish",
      label: "Finish at the tide cap",
      description: "Record the capped tide.",
      effects: [],
      outcome: { status: "completed", summary: "The tide reached its cap." },
    },
  ],
} as const;

function modelFor(scenario: unknown): PackedModel {
  return new PackedModel(scenario);
}

function choiceFor(model: PackedModel, id: string): PackedChoice {
  const choice = model.choices.find(candidate => candidate.id === id);
  if (choice === undefined) throw new Error("Missing packed choice " + id);
  return choice;
}

function successState(model: PackedModel, code: bigint, id: string): bigint {
  const transition = model.transition(code, choiceFor(model, id));
  if (transition.kind !== "success") {
    throw new Error("Expected successful transition for " + id + ", got " + transition.kind);
  }
  return transition.state;
}

function expectLimit(action: () => unknown, kind: "state" | "edge", limit: number): void {
  assert.throws(
    action,
    error => error instanceof PackedGraphLimitError
      && error.kind === kind
      && error.limit === limit,
  );
}

test("packed reachability crosses a 16,384-entry chunk with exact reverse completion", () => {
  const model = modelFor(CHAIN_SCENARIO);
  const result = packedReachability(model, {
    stateLimit: CHAIN_STATE_COUNT,
    edgeLimit: CHAIN_EDGE_COUNT,
  });

  assert.equal(result.exhaustive, true);
  assert.equal(result.stateCount, CHAIN_STATE_COUNT);
  assert.equal(result.transitionCount, CHAIN_EDGE_COUNT);
  assert.equal(result.completableCount, CHAIN_STATE_COUNT);
  assert.equal(result.deadEndCount, 0);
  assert.equal(result.noCompletionCount, 0);
  assert.equal(result.frontiers.length, CHAIN_STATE_COUNT);
  assert.deepEqual(result.frontiers[0], [0, 1]);
  assert.deepEqual(result.frontiers[16_383], [16_383, 16_384]);
  assert.deepEqual(result.frontiers[16_384], [16_384, 16_385]);
  assert.deepEqual(result.frontiers[CHAIN_STATE_COUNT - 1], [CHAIN_STATE_COUNT - 1, CHAIN_STATE_COUNT]);

  for (let index = 0; index < result.frontiers.length; index++) {
    const frontier = result.frontiers[index]!;
    if (frontier[0] !== index || frontier[1] !== index + 1) {
      throw new Error("unexpected singleton frontier at " + index + ": " + JSON.stringify(frontier));
    }
  }
  for (const code of result.states) assert.equal(result.isCompletable(code), true);

  assert.deepEqual(result.sceneWitnesses.counter, []);
  assert.equal(result.sceneWitnesses["finish-hub"]?.length, CHAIN_MAX + 1);
  assert.equal(result.choiceWitnesses["advance-counter"]?.length, 1);
  assert.equal(result.choiceWitnesses["enter-finish"]?.length, CHAIN_MAX + 1);
  assert.equal(result.choiceWitnesses["close-finish"]?.length, CHAIN_MAX + 2);
  assert.deepEqual(
    result.endingWitnesses["close-finish"],
    result.choiceWitnesses["close-finish"],
  );
  assert.equal(result.isNoCompletion(model.initial), false);
  assert.deepEqual(model.location(result.states[result.states.length - 1]!), {
    scene: "finish-hub",
    status: "completed",
    ending: 1,
  });
});

test("packed graph keeps duplicate edges, cycles, terminal kinds, and independent witnesses", () => {
  const model = modelFor(DIAMOND_SCENARIO);
  const result = packedReachability(model, { stateLimit: 11, edgeLimit: 12 });

  assert.equal(result.stateCount, 11);
  assert.equal(result.transitionCount, 12);
  assert.equal(result.completableCount, 4);
  assert.equal(result.deadEndCount, 1);
  assert.equal(result.noCompletionCount, 2);
  assert.deepEqual(result.unreachableScenes, []);
  assert.deepEqual(result.unreachableChoices, ["trap-blocked"]);
  assert.deepEqual(
    [...Object.keys(result.endingWitnesses)].sort(),
    [
      "complete",
      "diamond-dead",
      "diamond-depart",
      "start-dead",
      "start-depart",
      "stranded-depart",
    ],
  );

  const leftState = model.transition(model.initial, choiceFor(model, "left-diamond"));
  const rightState = model.transition(model.initial, choiceFor(model, "right-diamond"));
  assert.equal(leftState.kind, "success");
  assert.equal(rightState.kind, "success");
  if (leftState.kind !== "success" || rightState.kind !== "success") throw new Error("diamond setup failed");
  assert.equal(leftState.state, rightState.state, "duplicate choices should share one state");
  assert.notDeepEqual(result.choiceWitnesses["left-diamond"], result.choiceWitnesses["right-diamond"]);
  assert.deepEqual(result.choiceWitnesses["left-diamond"], ["left-diamond"]);
  assert.deepEqual(result.choiceWitnesses["right-diamond"], ["right-diamond"]);

  const cycled = model.transition(leftState.state, choiceFor(model, "cycle-diamond"));
  assert.equal(cycled.kind, "success");
  if (cycled.kind !== "success") throw new Error("cycle transition failed");
  assert.equal(cycled.state, leftState.state, "cycle should return to the same packed state");

  const trap = result.states.find(code => model.location(code).scene === "trap");
  const stranded = result.states.find(code => model.location(code).scene === "stranded");
  const completed = result.states.find(code => model.location(code).status === "completed");
  assert.ok(trap !== undefined);
  assert.ok(stranded !== undefined);
  assert.ok(completed !== undefined);
  assert.equal(result.isDeadEnd(trap), true);
  assert.equal(result.isNoCompletion(trap), true);
  assert.equal(result.isNoCompletion(stranded), true);
  assert.equal(result.isCompletable(stranded), false);
  assert.equal(result.isCompletable(completed), true);
  assert.deepEqual(result.deadEndWitness, ["to-trap"]);
  assert.deepEqual(result.noCompletionWitness, ["to-trap"]);

  const terminal = result.states.find(code => model.location(code).status !== "playing");
  assert.ok(terminal !== undefined);
  assert.deepEqual(model.choicesAt(terminal), []);
  assert.equal(result.sceneWitnesses["complete-hub"]?.length, 2);
  assert.equal(result.choiceWitnesses.complete?.length, 3);

  const foreign = modelFor(DIAMOND_SCENARIO);
  assert.throws(
    () => model.transition(model.initial, foreign.choices[0]!),
    /different model/,
  );
});

test("packed limits fail closed, option access is single-read, and observer errors do not return success", () => {
  const model = modelFor(DIAMOND_SCENARIO);
  const exact = packedReachability(model, { stateLimit: 11, edgeLimit: 12 });
  assert.equal(exact.stateCount, 11);
  assert.equal(exact.transitionCount, 12);
  expectLimit(() => packedReachability(model, { stateLimit: 10, edgeLimit: 12 }), "state", 10);
  expectLimit(() => packedReachability(model, { stateLimit: 11, edgeLimit: 11 }), "edge", 11);

  let stateReads = 0;
  let edgeReads = 0;
  const getterOptions = {
    get stateLimit(): number {
      stateReads++;
      if (stateReads > 1) throw new Error("stateLimit was read twice");
      return 11;
    },
    get edgeLimit(): number {
      edgeReads++;
      if (edgeReads > 1) throw new Error("edgeLimit was read twice");
      return 12;
    },
  };
  assert.equal(packedReachability(model, getterOptions).stateCount, 11);
  assert.equal(stateReads, 1);
  assert.equal(edgeReads, 1);

  const invalidStateValues: readonly unknown[] = [
    null,
    [],
    {},
    0,
    -1,
    1.5,
    Infinity,
    0x1_0000_0000,
    "11",
  ];
  for (const value of invalidStateValues) {
    assert.throws(
      () => packedReachability(model, { stateLimit: value } as never),
      /Invalid packed state limit/,
      "invalid state limit " + String(value) + " must be rejected",
    );
  }
  for (const value of invalidStateValues) {
    assert.throws(
      () => packedReachability(model, { edgeLimit: value } as never),
      /Invalid packed edge limit/,
      "invalid edge limit " + String(value) + " must be rejected",
    );
  }
  assert.throws(() => packedReachability(model, null as never), /Invalid packed reachability options/);
  assert.throws(() => packedReachability(model, [] as never), /Invalid packed reachability options/);
  assert.throws(() => packedReachability(model, {}, "observer" as never), /Invalid packed progress observer/);

  const stop = new Error("stop after progress");
  let observed = false;
  assert.throws(
    () => packedReachability(model, {}, () => {
      observed = true;
      throw stop;
    }),
    error => error === stop,
  );
  assert.equal(observed, true);
});

test("packed transitions preserve high-bit values, first cross-resource overflow, and later reset", () => {
  const model = modelFor(OVERFLOW_SCENARIO);
  const initial = model.decode(model.initial);
  assert.equal(initial.resources.fuel, Number.MAX_SAFE_INTEGER);
  assert.equal(model.encode(initial), model.initial);

  const overflow = model.transition(model.initial, choiceFor(model, "overflow-first"));
  assert.deepEqual(overflow, {
    kind: "fault",
    reason: "arithmetic-error",
    effectIndex: 0,
    resource: "fuel",
  });

  const reset = model.transition(model.initial, choiceFor(model, "reset-fuel"));
  assert.equal(reset.kind, "success");
  if (reset.kind !== "success") throw new Error("reset transition failed");
  assert.equal(model.decode(reset.state).resources.fuel, 0);
  assert.equal(model.location(reset.state).scene, "overflow-sink");
  const finished = successState(model, reset.state, "finish-reset");
  assert.equal(model.location(finished).status, "completed");

  assert.throws(
    () => model.location(model.initial | (1n << BigInt(model.bitCount))),
    /outside the model width/,
  );
});

test("packed clocks saturate at their declared maximum", () => {
  const model = modelFor(CLOCK_SCENARIO);
  const advanced = successState(model, model.initial, "advance-tide");
  assert.equal(model.decode(advanced).resources.tide, 3);
  const completed = successState(model, advanced, "finish-tide");
  assert.deepEqual(model.location(completed), {
    scene: "clock-finish",
    status: "completed",
    ending: 1,
  });
});

test("packed state inputs snapshot getters and reject invalid lifecycle and clock domains", () => {
  const model = new PackedModel(CLOCK_SCENARIO);
  const original = model.decode(model.initial);
  const reads = new Map<string, number>();
  const once = <T>(key: string, value: T): T => {
    reads.set(key, (reads.get(key) ?? 0) + 1);
    assert.equal(reads.get(key), 1, `${key} is read only once`);
    return value;
  };
  const resources = { get tide() { return once("tide", 2); } };
  const state = {
    get scene() { return once("scene", original.scene); },
    get status() { return once("status", original.status); },
    get ending() { return once("ending", original.ending); },
    get resources() { return once("resources", resources); },
    get flags() { return once("flags", {}); },
  };
  assert.equal(model.encode(state), model.initial);
  assert.equal(reads.size, 6);
  assert.equal(Object.isFrozen(model), true);
  assert.throws(() => model.encode({ ...original, ending: 1 }), /playing state/);
  assert.throws(() => model.encode({ ...original, status: "completed" }), /invalid ending/);
  assert.throws(() => model.encode({ ...original, resources: { tide: 4 } }), /clock maximum/);
  assert.throws(() => model.encode({ ...original, resources: {} }), /Missing packed resource/);
  for (const code of [-1n, 1, null, 1n << BigInt(model.bitCount)]) {
    assert.throws(() => model.decode(code as bigint));
  }
  // Construct a legal ordinary-resource encoding with the identical layout;
  // the clock model must reject its out-of-clock-domain code when decoding.
  const ordinary = new PackedModel({ ...CLOCK_SCENARIO, clocks: undefined,
    choices: CLOCK_SCENARIO.choices.map(choice => choice.id === "advance-tide"
      ? { ...choice, effects: [{ type: "adjustResource", resource: "tide", delta: 2 }, { type: "goTo", scene: "clock-finish" }] }
      : choice) });
  assert.throws(() => model.decode(ordinary.encode({ ...original, resources: { tide: 4 } })), /clock maximum/);
});

test("packed faults preserve cross-resource authored order and cannot be repaired by a later reset", () => {
  const raw = {
    ...OVERFLOW_SCENARIO,
    initialResources: { alpha: Number.MAX_SAFE_INTEGER, zeta: Number.MAX_SAFE_INTEGER },
    choices: [{
      id: "overflow-zeta-first", scene: "overflow-start", label: "Attempt two overfills", description: "The first authored effect fails.",
      effects: [
        { type: "adjustResource", resource: "zeta", delta: 1 },
        { type: "adjustResource", resource: "alpha", delta: 1 },
        { type: "setResource", resource: "zeta", value: 0 },
        { type: "goTo", scene: "overflow-sink" },
      ],
    }, OVERFLOW_SCENARIO.choices[2]],
  };
  const model = new PackedModel(raw);
  assert.deepEqual(model.transition(model.initial, model.choices[0]!), {
    kind: "fault", reason: "arithmetic-error", effectIndex: 0, resource: "zeta",
  });
  assert.throws(() => packedReachability(model), error => error instanceof PackedReachabilityError
    && error.resource === "zeta" && error.effectIndex === 0 && error.reason === "arithmetic-error"
    && error.path.length === 1 && error.path[0] === "overflow-zeta-first");
});

test("packed tuples retain more than 64 flags and own constructor-named fields", () => {
  const names = ["constructor", ...Array.from({ length: 73 }, (_, index) => `mark-${index}`)];
  const expected = Object.fromEntries(names.map((name, index) => [name, index % 2 === 0]));
  const raw = {
    version: 1, initialScene: "start", initialResources: { constructor: 1 }, initialFacts: [],
    scenes: [{ id: "start", title: "Start", text: [{ text: "Many independent marks." }] },
      { id: "finish", title: "Finish", text: [{ text: "The final mark is visible.", when: [{ type: "flag", flag: names[72], value: true }] }] }],
    choices: [{ id: "constructor", scene: "start", label: "Write the marks", description: "Record all marks.",
      effects: [...names.map(flag => ({ type: "setFlag", flag, value: expected[flag] })),
        { type: "adjustResource", resource: "constructor", delta: 1 }, { type: "goTo", scene: "finish" }] },
      { id: "close", scene: "finish", label: "Close", description: "Complete the marked journey.",
        when: [{ type: "flag", flag: names[72], value: true }], effects: [], outcome: { status: "completed", summary: "Marked." } }],
  };
  const model = new PackedModel(raw);
  const code = successState(model, model.initial, "constructor");
  assert.equal(model.flags.length, 74);
  assert.deepEqual(model.decode(code).flags, expected);
  assert.equal(model.decode(code).resources.constructor, 2);
  assert.equal(model.encode(model.decode(code)), code);
  const result = packedReachability(model);
  assert.equal(result.stateCount, 3);
  assert.equal(result.completableCount, 3);
  assert.deepEqual(result.choiceWitnesses.constructor, ["constructor"]);
});

/*
 * This graph deliberately gives the packed tuple two ordinary resources. The
 * two 53-bit resource slots put the first flag at bit 111. Thus the plain,
 * high-marker, and other-marker hub states have the same low 64 bits while
 * remaining different full BigInts. The two high-marker choices reconverge to
 * one exact state, and the hub loop exercises a retained self-edge.
 */
const HIGH_BIT_RECONVERGENCE_SCENARIO = {
  version: 1,
  initialScene: "start",
  initialResources: { alpha: 0, omega: 0 },
  initialFacts: [],
  scenes: [
    {
      id: "start",
      title: "Start",
      text: [{ text: "Three paths reach the same hub with different high bits." }],
    },
    {
      id: "hub",
      title: "Hub",
      text: [{ text: "The exact high-bit marker controls which close is legal." }],
    },
  ],
  choices: [
    {
      id: "plain-to-hub",
      scene: "start",
      label: "Take the plain path",
      description: "Reach the hub without setting a marker.",
      effects: [{ type: "goTo", scene: "hub" }],
    },
    {
      id: "high-to-hub-a",
      scene: "start",
      label: "Take marked path A",
      description: "Set the high marker before reaching the hub.",
      effects: [
        { type: "setFlag", flag: "high-marker", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "high-to-hub-b",
      scene: "start",
      label: "Take marked path B",
      description: "Set the same high marker by a second route.",
      effects: [
        { type: "setFlag", flag: "high-marker", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "other-to-hub",
      scene: "start",
      label: "Take the other marked path",
      description: "Set a different high marker before reaching the hub.",
      effects: [
        { type: "setFlag", flag: "other-marker", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "loop-hub",
      scene: "hub",
      label: "Recheck the hub",
      description: "Stay at the hub and preserve the exact tuple.",
      effects: [{ type: "goTo", scene: "hub" }],
    },
    {
      id: "finish-plain",
      scene: "hub",
      label: "Close the plain route",
      description: "Close only when neither marker is set.",
      when: [
        { type: "flag", flag: "high-marker", value: false },
        { type: "flag", flag: "other-marker", value: false },
      ],
      effects: [],
      outcome: { status: "completed", summary: "Plain route closed." },
    },
    {
      id: "finish-high",
      scene: "hub",
      label: "Close the high route",
      description: "Close only with the high marker.",
      when: [
        { type: "flag", flag: "high-marker", value: true },
        { type: "flag", flag: "other-marker", value: false },
      ],
      effects: [],
      outcome: { status: "completed", summary: "High route closed." },
    },
    {
      id: "finish-other",
      scene: "hub",
      label: "Close the other route",
      description: "Close only with the other marker.",
      when: [
        { type: "flag", flag: "high-marker", value: false },
        { type: "flag", flag: "other-marker", value: true },
      ],
      effects: [],
      outcome: { status: "completed", summary: "Other route closed." },
    },
  ],
} as const;

test("packed graph indexes exact high-bit tuples, reconverges witnesses, and preserves invalid membership behavior", () => {
  const model = modelFor(HIGH_BIT_RECONVERGENCE_SCENARIO);
  assert.equal(model.flags.length, 2);
  assert.ok(model.bitCount > 64);

  const plain = successState(model, model.initial, "plain-to-hub");
  const highA = successState(model, model.initial, "high-to-hub-a");
  const highB = successState(model, model.initial, "high-to-hub-b");
  const other = successState(model, model.initial, "other-to-hub");
  const low64 = (1n << 64n) - 1n;

  // The three hub states are equal below bit 64 but distinct above it.
  assert.equal(plain & low64, highA & low64);
  assert.equal(plain & low64, other & low64);
  assert.notEqual(plain, highA);
  assert.notEqual(plain, other);
  assert.notEqual(highA, other);
  assert.ok((highA >> 64n) !== 0n);
  assert.ok((other >> 64n) !== 0n);

  // Two authored images must deduplicate to one state while retaining both
  // authored source witnesses.
  assert.equal(highA, highB);
  assert.deepEqual(
    model.transition(plain, choiceFor(model, "loop-hub")),
    { kind: "success", state: plain },
  );
  assert.deepEqual(
    model.transition(highA, choiceFor(model, "finish-plain")),
    { kind: "disabled" },
  );
  assert.equal(model.transition(plain, choiceFor(model, "finish-plain")).kind, "success");
  assert.equal(model.transition(highA, choiceFor(model, "finish-high")).kind, "success");
  assert.equal(model.transition(other, choiceFor(model, "finish-other")).kind, "success");
  assert.equal(model.transition(other, choiceFor(model, "finish-high")).kind, "disabled");

  const result = packedReachability(model, { stateLimit: 7, edgeLimit: 10 });
  assert.equal(result.stateCount, 7);
  assert.equal(result.transitionCount, 10);
  assert.equal(result.completableCount, 7);
  assert.equal(result.deadEndCount, 0);
  assert.equal(result.noCompletionCount, 0);
  assert.deepEqual(result.unreachableScenes, []);
  assert.deepEqual(result.unreachableChoices, []);
  assert.deepEqual(result.choiceWitnesses["high-to-hub-a"], ["high-to-hub-a"]);
  assert.deepEqual(result.choiceWitnesses["high-to-hub-b"], ["high-to-hub-b"]);
  assert.notDeepEqual(
    result.choiceWitnesses["high-to-hub-a"],
    result.choiceWitnesses["high-to-hub-b"],
  );
  assert.equal(result.sceneWitnesses.hub?.length, 1);
  assert.equal(result.isReachable(plain), true);
  assert.equal(result.isReachable(highA), true);
  assert.equal(result.isReachable(other), true);
  assert.equal(result.isCompletable(plain), true);
  assert.equal(result.isCompletable(highA), true);
  assert.equal(result.isCompletable(other), true);

  // Both high marker bits are a valid-width but unreachable tuple; exact
  // membership must not alias it with either reachable high-bit state.
  const bothMarkers = highA | (1n << 112n);
  assert.equal(result.isReachable(bothMarkers), false);
  assert.equal(result.isCompletable(bothMarkers), false);
  assert.equal(result.isDeadEnd(bothMarkers), false);
  assert.equal(result.isNoCompletion(bothMarkers), false);

  // Preserve Map<bigint> runtime behavior after changing the internal key to
  // canonical hexadecimal strings: wrong runtime types return false rather
  // than being coerced or throwing from .toString(16).
  for (const invalid of [1, highA.toString(16), Object(highA), null, undefined] as const) {
    assert.equal(result.isReachable(invalid as never), false);
    assert.equal(result.isCompletable(invalid as never), false);
    assert.equal(result.isDeadEnd(invalid as never), false);
    assert.equal(result.isNoCompletion(invalid as never), false);
  }
});
