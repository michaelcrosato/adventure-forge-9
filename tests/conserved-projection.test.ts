import assert from "node:assert/strict";
import test from "node:test";
import { SCENARIO, type Condition, type Scene } from "../src/engine/content.js";
import { observe } from "../src/engine/index.js";
import { assertParametersPreserved, bindParameters, instantiateText, parameterizeText } from "../src/engine/conserved-projection.js";
import { councilSealedCoercedResolved, sharedLowResolved, step } from "./reedway-witnesses.js";

const scene: Scene = {
  id: "test-shore", title: "Shore", text: [
    { text: "The shore is open." },
    { text: "The reserve is plentiful.", when: [{ type: "resourceAtLeast", resource: "water", value: 2 }] },
    { text: "The reserve is low.", when: [{ type: "resourceAtMost", resource: "water", value: 1 }] },
    { text: "The mark remains visible.", when: [{ type: "flag", flag: "mark", value: true }] },
    { text: "The active work is complete.", when: [{ type: "flag", flag: "done", value: true }] },
  ],
};
const fields = { resources: ["water"], flags: ["mark"] } as const;

test("one text family preserves different exact resource balances and historical marks", () => {
  const low = { resources: { water: 0 }, flags: { mark: false, done: false } };
  const high = { resources: { water: 4 }, flags: { mark: true, done: false } };
  const lowTemplate = parameterizeText(scene, low, fields);
  const highTemplate = parameterizeText(scene, high, fields);
  assert.deepEqual(lowTemplate, highTemplate);
  const lowBindings = bindParameters(low, fields);
  const highBindings = bindParameters(high, fields);
  assert.equal(lowBindings.resources.water, 0);
  assert.equal(highBindings.resources.water, 4);
  assert.deepEqual(instantiateText(lowTemplate, lowBindings), ["The shore is open.", "The reserve is low."]);
  assert.deepEqual(instantiateText(highTemplate, highBindings), ["The shore is open.", "The reserve is plentiful.", "The mark remains visible."]);
  assert.notDeepEqual(parameterizeText(scene, { ...low, flags: { ...low.flags, done: true } }, fields), lowTemplate);
});

test("a violated conservation claim is rejected without substituting a threshold bucket", () => {
  const before = { resources: { water: 4 }, flags: { mark: true, done: false } };
  assert.doesNotThrow(() => assertParametersPreserved(before, { ...before, flags: { ...before.flags, done: true } }, fields));
  assert.throws(() => assertParametersPreserved(before, { ...before, resources: { water: 3 } }, fields), /Conserved resource changed/);
  assert.throws(() => assertParametersPreserved(before, { ...before, flags: { mark: false } }, fields), /Conserved flag changed/);
  assert.throws(() => bindParameters({ ...before, resources: {} }, fields), /valid resource binding/);
  assert.throws(() => instantiateText(parameterizeText(scene, before, fields), { resources: { water: 4 }, flags: {} }), /Missing conserved flag binding/);
});

test("absent flags normalize to false and inherited properties cannot supply bindings", () => {
  const before = { resources: { water: 1 }, flags: {} };
  const after = { resources: { water: 1 }, flags: { mark: false } };
  assert.doesNotThrow(() => assertParametersPreserved(before, after, fields));
  assert.equal(bindParameters({ ...before, flags: Object.create({ mark: true }) }, fields).flags.mark, false);
  assert.throws(() => bindParameters({ resources: Object.create({ water: 1 }), flags: {} }, fields), /valid resource binding/);
});

test("unknown text vocabulary fails even behind a false concrete condition", () => {
  const invalid: Scene = { ...scene, text: [{ text: "Hidden.", when: [
    { type: "flag", flag: "done", value: true },
    { type: "future-condition" } as unknown as Condition,
  ] }] };
  assert.throws(() => parameterizeText(invalid, { resources: { water: 1 }, flags: { done: false } }, fields), /unknown condition/);
});

test("parameter substitution matches actual changed-hub observations and travel preserves bindings", () => {
  const parameters = {
    resources: ["archive-evidence", "evacuees"],
    flags: ["shared-water", "council-control", "evacuation-plan", "archive-verdict-exposed", "archive-verdict-sealed", "archive-witness-coerced", "blackglass-nessa-aid", "blackglass-council-favor"],
  };
  for (const state of [sharedLowResolved(), councilSealedCoercedResolved()]) {
    const currentScene = SCENARIO.scenes.find(value => value.id === state.scene)!;
    const bindings = bindParameters(state, parameters);
    assert.deepEqual(instantiateText(parameterizeText(currentScene, state, parameters), bindings), observe(state).text);
    const next = step(state, "explore-reedway-from-blackglass");
    assertParametersPreserved(state, next, parameters);
    assert.deepEqual(bindParameters(next, parameters), bindings);
  }
});
