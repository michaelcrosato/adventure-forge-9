import assert from "node:assert/strict";
import test from "node:test";
import { validateScenario } from "../src/engine/content.js";

type RecordValue = Record<string, unknown>;

function scenario(overrides: RecordValue = {}): RecordValue {
  return {
    version: 1,
    initialScene: "start",
    initialResources: { supplies: 0, ticks: 0 },
    initialFacts: [],
    scenes: [
      { id: "start", title: "Start", text: [{ text: "The clock is quiet." }] },
      { id: "done", title: "Done", text: [{ text: "The journey is done." }] },
    ],
    choices: [
      {
        id: "go",
        scene: "start",
        label: "Go",
        description: "Go on.",
        effects: [{ type: "goTo", scene: "done" }],
      },
      {
        id: "close",
        scene: "done",
        label: "Close",
        description: "Close the journey.",
        effects: [],
        outcome: { status: "completed", summary: "Done." },
      },
    ],
    ...overrides,
  };
}

function withStartChoice(patch: RecordValue): RecordValue {
  const base = scenario();
  const choices = base.choices as RecordValue[];
  return {
    ...base,
    choices: [{ ...choices[0], ...patch }, choices[1]],
  };
}

function withStartText(line: RecordValue): RecordValue {
  const base = scenario();
  const scenes = base.scenes as RecordValue[];
  return {
    ...base,
    scenes: [{ ...scenes[0], text: [line] }, scenes[1]],
  };
}

function assertUnknownMembership(fixture: RecordValue, expected: RegExp): void {
  assert.throws(() => validateScenario(fixture), (error: unknown) => {
    if (!(error instanceof Error)) return false;
    assert.match(error.message, expected);
    // A vocabulary/parser failure must not satisfy this regression by accident.
    assert.doesNotMatch(error.message, /unknown property|unknown condition type|unknown effect type/);
    return true;
  });
}

test("ordinary resourceAtLeast and resource writers reject inherited constructor", () => {
  assertUnknownMembership(
    withStartChoice({ when: [{ type: "resourceAtLeast", resource: "constructor", value: 0 }] }),
    /scenario\.choices\[0\]\.when: unknown resource "constructor"/,
  );
  assertUnknownMembership(
    withStartChoice({ effects: [{ type: "setResource", resource: "constructor", value: 1 }, { type: "goTo", scene: "done" }] }),
    /scenario\.choices\[0\]\.effects: unknown resource "constructor"/,
  );
  assertUnknownMembership(
    withStartChoice({ effects: [{ type: "adjustResource", resource: "constructor", delta: 1 }, { type: "goTo", scene: "done" }] }),
    /scenario\.choices\[0\]\.effects: unknown resource "constructor"/,
  );
});

test("a resource named constructor can be adjusted when it is an authored property", () => {
  const base = scenario();
  const choices = base.choices as RecordValue[];
  const parsed = validateScenario({
    ...base,
    initialResources: { constructor: 0 },
    choices: [
      {
        ...choices[0],
        effects: [
          { type: "adjustResource", resource: "constructor", delta: 1 },
          { type: "goTo", scene: "done" },
        ],
      },
      choices[1],
    ],
  });

  assert.equal(Object.hasOwn(parsed.initialResources, "constructor"), true);
  assert.equal(parsed.initialResources.constructor, 0);
  assert.deepEqual(parsed.choices[0]?.effects, [
    { type: "adjustResource", resource: "constructor", delta: 1 },
    { type: "goTo", scene: "done" },
  ]);
});

test("clock declarations and resourceAtMost choice/text conditions are supported", () => {
  const base = scenario();
  const scenes = base.scenes as RecordValue[];
  const choices = base.choices as RecordValue[];
  const parsed = validateScenario({
    ...base,
    clocks: [{ id: "deadline", resource: "ticks", max: 2 }],
    scenes: [
      {
        ...scenes[0],
        text: [{ text: "The clock still has room.", when: [{ type: "resourceAtMost", resource: "ticks", value: 1 }] }],
      },
      scenes[1],
    ],
    choices: [
      { ...choices[0], when: [{ type: "resourceAtMost", resource: "ticks", value: 1 }] },
      choices[1],
    ],
  }) as unknown as RecordValue;

  assert.deepEqual(parsed.clocks, [{ id: "deadline", resource: "ticks", max: 2 }]);
  const parsedScene = (parsed.scenes as RecordValue[])[0]!;
  const parsedLine = (parsedScene.text as RecordValue[])[0]!;
  assert.deepEqual((parsedLine.when as RecordValue[])[0], { type: "resourceAtMost", resource: "ticks", value: 1 });
  assert.deepEqual(((parsed.choices as RecordValue[])[0]!.when as RecordValue[])[0], {
    type: "resourceAtMost",
    resource: "ticks",
    value: 1,
  });
});

test("constructor is rejected as an unknown resource in clock and resourceAtMost membership", () => {
  assertUnknownMembership(
    scenario({ clocks: [{ id: "deadline", resource: "constructor", max: 1 }] }),
    /scenario\.clocks\[0\]\.resource: unknown resource "constructor"/,
  );
  assertUnknownMembership(
    withStartChoice({ when: [{ type: "resourceAtMost", resource: "constructor", value: 0 }] }),
    /scenario\.choices\[0\]\.when: unknown resource "constructor"/,
  );
  assertUnknownMembership(
    withStartText({ text: "The clock is bounded.", when: [{ type: "resourceAtMost", resource: "constructor", value: 0 }] }),
    /scenario\.scenes\[0\]\.text\[0\]\.when: unknown resource "constructor"/,
  );
});

test("constructor is rejected as an unknown fact instead of matching FACT_LABELS.prototype", () => {
  assertUnknownMembership(
    scenario({ initialFacts: ["constructor"] }),
    /scenario: missing player-facing label for fact "constructor"/,
  );
  assertUnknownMembership(
    withStartChoice({ effects: [{ type: "addFact", fact: "constructor" }, { type: "goTo", scene: "done" }] }),
    /scenario: missing player-facing label for fact "constructor"/,
  );
});

test("inherited optional when, outcome, and clocks do not enter parsed content", () => {
  const base = scenario();
  const keys = ["when", "outcome", "clocks"] as const;
  const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(Object.prototype, key)] as const));
  try {
    Object.defineProperty(Object.prototype, "when", {
      configurable: true,
      enumerable: false,
      value: [{ type: "resourceAtLeast", resource: "supplies", value: 0 }],
      writable: true,
    });
    Object.defineProperty(Object.prototype, "outcome", {
      configurable: true,
      enumerable: false,
      value: { status: "completed", summary: "inherited outcome" },
      writable: true,
    });
    Object.defineProperty(Object.prototype, "clocks", {
      configurable: true,
      enumerable: false,
      value: [{ id: "deadline", resource: "supplies", max: 0 }],
      writable: true,
    });

    const parsed = validateScenario(base);
    assert.equal(parsed.clocks, undefined);
    assert.equal(parsed.scenes[0]!.text[0]!.when, undefined);
    assert.equal(parsed.choices[0]!.when, undefined);
    assert.equal(parsed.choices[0]!.outcome, undefined);
    assert.equal(Object.keys(parsed).includes("clocks"), false);
    assert.equal(Object.keys(parsed.scenes[0]!.text[0]!).includes("when"), false);
    assert.equal(Object.keys(parsed.choices[0]!).includes("when"), false);
    assert.equal(Object.keys(parsed.choices[0]!).includes("outcome"), false);
  } finally {
    const objectPrototype = Object.prototype as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors.get(key);
      if (descriptor === undefined) delete objectPrototype[key];
      else Object.defineProperty(Object.prototype, key, descriptor);
    }
  }
});
