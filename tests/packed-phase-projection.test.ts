import assert from "node:assert/strict";
import test from "node:test";
import { analyzeFutureReads } from "../src/engine/audit.js";
import type { Condition, Scenario } from "../src/engine/content.js";
import { PackedModel } from "./helpers/packed/packed-model.js";
import { PackedPhaseProjection } from "./helpers/packed/packed-phase-projection.js";
import { packedReachability } from "./helpers/packed/packed-reachability.js";

const PHASE_GRAPH = {
  version: 1,
  initialScene: "start",
  initialResources: { supplies: 0, water: 0 },
  initialFacts: [],
  scenes: [
    {
      id: "start",
      title: "Start",
      text: [{ text: "The road divides at the old gate." }],
    },
    {
      id: "hub",
      title: "Hub",
      text: [{ text: "The hub is quiet." }],
    },
    {
      id: "reader",
      title: "Reader",
      text: [
        { text: "The reader waits." },
        { text: "The late mark is visible.", when: [{ type: "flag", flag: "late-mark", value: true }] },
      ],
    },
    {
      id: "resource-room",
      title: "Resource Room",
      text: [
        { text: "The room is open." },
        { text: "The resource mark is visible.", when: [{ type: "flag", flag: "resource-mark", value: true }] },
      ],
    },
  ],
  choices: [
    {
      id: "stock-up",
      scene: "start",
      label: "Stock up",
      description: "Set aside one supply and return to the gate.",
      effects: [
        { type: "setResource", resource: "supplies", value: 1 },
        { type: "goTo", scene: "start" },
      ],
    },
    {
      id: "mark-noise",
      scene: "start",
      label: "Leave a marker",
      description: "Leave an unread internal marker before entering.",
      effects: [
        { type: "setFlag", flag: "noise-marker", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "arm-phase",
      scene: "start",
      label: "Arm the phase",
      description: "Set the one-way phase before entering the hub.",
      effects: [
        { type: "setFlag", flag: "phase-gate", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "arm-both-phases",
      scene: "start",
      label: "Arm both phases",
      description: "Set both one-way phases before entering the hub.",
      effects: [
        { type: "setFlag", flag: "phase-gate", value: true },
        { type: "setFlag", flag: "second-phase", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "enter-hub",
      scene: "start",
      label: "Enter the hub",
      description: "Enter without changing the phase.",
      effects: [{ type: "goTo", scene: "hub" }],
    },
    {
      id: "take-resource-route",
      scene: "start",
      label: "Use the supply",
      description: "Spend one supply to take the resource route.",
      when: [{ type: "resourceAtLeast", resource: "supplies", value: 1 }],
      effects: [{ type: "goTo", scene: "resource-room" }],
    },
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the gate",
      description: "Complete the gate route.",
      effects: [],
      outcome: { status: "completed", summary: "The gate route is complete." },
    },
    {
      id: "leave-reader",
      scene: "hub",
      label: "Read the late mark",
      description: "Leave the hub while the phase gate is still clear.",
      when: [
        { type: "flag", flag: "phase-gate", value: false },
        { type: "flag", flag: "second-phase", value: false },
      ],
      effects: [{ type: "goTo", scene: "reader" }],
    },
    {
      id: "promote-second-phase",
      scene: "hub",
      label: "Promote the second phase",
      description: "Set the second one-way phase while the first is armed.",
      when: [{ type: "flag", flag: "phase-gate", value: true }],
      effects: [
        { type: "setFlag", flag: "second-phase", value: true },
        { type: "goTo", scene: "hub" },
      ],
    },
    {
      id: "finish-hub",
      scene: "hub",
      label: "Finish at the hub",
      description: "Complete the hub route.",
      effects: [],
      outcome: { status: "completed", summary: "The hub route is complete." },
    },
    {
      id: "finish-reader",
      scene: "reader",
      label: "Finish at the reader",
      description: "Complete the reader route.",
      effects: [{ type: "setFlag", flag: "late-mark", value: true }],
      outcome: { status: "completed", summary: "The reader route is complete." },
    },
    {
      id: "finish-resource",
      scene: "resource-room",
      label: "Finish in the resource room",
      description: "Complete the resource route.",
      effects: [{ type: "setFlag", flag: "resource-mark", value: true }],
      outcome: { status: "completed", summary: "The resource route is complete." },
    },
  ],
} as const;

const RESETTABLE_GRAPH = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 0 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "Choose a phase." }] },
    { id: "reader", title: "Reader", text: [{ text: "The reader records the current phase." }] },
  ],
  choices: [
    {
      id: "arm-reader",
      scene: "start",
      label: "Arm the reader",
      description: "Set the resettable phase before entering.",
      effects: [
        { type: "setFlag", flag: "reader-phase", value: true },
        { type: "goTo", scene: "reader" },
      ],
    },
    {
      id: "plain-reader",
      scene: "start",
      label: "Enter plainly",
      description: "Enter while the resettable phase is clear.",
      effects: [{ type: "goTo", scene: "reader" }],
    },
    {
      id: "finish-armed",
      scene: "reader",
      label: "Finish armed",
      description: "Finish while the phase is set.",
      when: [{ type: "flag", flag: "reader-phase", value: true }],
      effects: [],
      outcome: { status: "completed", summary: "The reader route is complete." },
    },
    {
      id: "reset-reader",
      scene: "reader",
      label: "Reset the reader",
      description: "Clear the phase and remain at the reader.",
      when: [{ type: "flag", flag: "reader-phase", value: true }],
      effects: [
        { type: "setFlag", flag: "reader-phase", value: false },
        { type: "goTo", scene: "reader" },
      ],
    },
    {
      id: "finish-plain",
      scene: "reader",
      label: "Finish clear",
      description: "Finish while the phase is clear.",
      when: [{ type: "flag", flag: "reader-phase", value: false }],
      effects: [],
      outcome: { status: "completed", summary: "The reader route is complete." },
    },
    {
      id: "rearm-reader",
      scene: "reader",
      label: "Rearm the reader",
      description: "Set the phase again and remain at the reader.",
      when: [{ type: "flag", flag: "reader-phase", value: false }],
      effects: [
        { type: "setFlag", flag: "reader-phase", value: true },
        { type: "goTo", scene: "reader" },
      ],
    },
  ],
} as const;

const TERMINAL_GRAPH = {
  version: 1,
  initialScene: "finish",
  initialResources: { water: 0 },
  initialFacts: [],
  scenes: [
    {
      id: "finish",
      title: "Finish",
      text: [
        { text: "The work is ready." },
        { text: "The terminal mark is visible.", when: [{ type: "flag", flag: "terminal-mark", value: true }] },
      ],
  },
  ],
  choices: [
    {
      id: "finish-with-mark",
      scene: "finish",
      label: "Finish with the mark",
      description: "Set the mark as the work closes.",
      effects: [{ type: "setFlag", flag: "terminal-mark", value: true }],
      outcome: { status: "completed", summary: "The work is complete." },
    },
    {
      id: "finish-without-mark",
      scene: "finish",
      label: "Finish without the mark",
      description: "Close the work without the mark.",
      effects: [],
      outcome: { status: "completed", summary: "The work is complete." },
    },
    {
      id: "die-at-finish",
      scene: "finish",
      label: "Abandon the work",
      description: "End the work unsuccessfully.",
      effects: [],
      outcome: { status: "dead", summary: "The work is lost." },
    },
  ],
} as const;

const DEAD_GRAPH = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 0 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "Choose a route." }] },
    { id: "trap", title: "Trap", text: [{ text: "There is no affordable exit." }] },
    { id: "loop", title: "Loop", text: [{ text: "The loop has no completed route." }] },
  ],
  choices: [
    {
      id: "mark-unread",
      scene: "start",
      label: "Leave an unread mark",
      description: "Set a flag the future never reads.",
      effects: [
        { type: "setFlag", flag: "unread-marker", value: true },
        { type: "goTo", scene: "start" },
      ],
    },
    {
      id: "enter-trap",
      scene: "start",
      label: "Enter the trap",
      description: "Take the route with no affordable exit.",
      effects: [{ type: "goTo", scene: "trap" }],
    },
    {
      id: "enter-loop",
      scene: "start",
      label: "Enter the loop",
      description: "Take the route that never completes.",
      effects: [{ type: "goTo", scene: "loop" }],
    },
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the start",
      description: "Complete the start route.",
      effects: [],
      outcome: { status: "completed", summary: "The start route is complete." },
    },
    {
      id: "die-start",
      scene: "start",
      label: "End in failure",
      description: "End the route unsuccessfully.",
      effects: [],
      outcome: { status: "dead", summary: "The route is lost." },
    },
    {
      id: "repeat-loop",
      scene: "loop",
      label: "Repeat the loop",
      description: "Remain in the unfinished loop.",
      effects: [{ type: "goTo", scene: "loop" }],
    },
    {
      id: "depart-loop",
      scene: "loop",
      label: "Depart the loop",
      description: "Leave without completing the route.",
      effects: [],
      outcome: { status: "departed", summary: "The loop is left behind." },
    },
    {
      id: "blocked-trap-exit",
      scene: "trap",
      label: "Take the blocked exit",
      description: "An exit requiring one water remains unavailable.",
      when: [{ type: "resourceAtLeast", resource: "water", value: 1 }],
      effects: [],
      outcome: { status: "completed", summary: "The trap is escaped." },
    },
  ],
} as const;

interface FullEdge {
  readonly from: bigint;
  readonly choiceId: string;
  readonly to: bigint;
}

interface FullGraph {
  readonly states: readonly bigint[];
  readonly edges: readonly FullEdge[];
}

function fullCode(code: bigint): string {
  return code.toString(16);
}

function enumerateFull(model: PackedModel): FullGraph {
  const states: bigint[] = [model.initial];
  const seen = new Set<string>([fullCode(model.initial)]);
  const edges: FullEdge[] = [];
  for (let index = 0; index < states.length; index++) {
    const from = states[index]!;
    for (const choice of model.choicesAt(from)) {
      const transition = model.transition(from, choice);
      if (transition.kind === "fault") throw new Error(`unexpected arithmetic fault for ${choice.id}`);
      if (transition.kind === "disabled") continue;
      edges.push(Object.freeze({ from, choiceId: choice.id, to: transition.state }));
      if (!seen.has(fullCode(transition.state))) {
        seen.add(fullCode(transition.state));
        states.push(transition.state);
      }
    }
  }
  return Object.freeze({ states: Object.freeze(states), edges: Object.freeze(edges) });
}

function phaseResult(model: PackedModel) {
  return packedReachability(model, {
    stateScope: "phase-future-flags",
    stateLimit: 1_000,
    edgeLimit: 5_000,
  });
}

function flagsRead(conditions: readonly Condition[] | undefined): Set<string> {
  const result = new Set<string>();
  for (const condition of conditions ?? []) {
    if (condition.type === "flag") result.add(condition.flag);
  }
  return result;
}

function independentMonotoneFlags(scenario: Scenario): ReadonlySet<string> {
  const writes = new Map<string, Set<boolean>>();
  for (const choice of scenario.choices) {
    for (const effect of choice.effects) {
      if (effect.type !== "setFlag") continue;
      const values = writes.get(effect.flag);
      if (values === undefined) writes.set(effect.flag, new Set([effect.value]));
      else values.add(effect.value);
    }
  }
  return new Set([...writes]
    .filter(([, values]) => [...values].every((value) => value === true))
    .map(([flag]) => flag));
}

function independentRetainedFlags(scenario: Scenario, state: ReturnType<PackedModel["decode"]>): readonly string[] {
  const scenesById = new Map(scenario.scenes.map((scene) => [scene.id, scene] as const));
  const choicesByScene = new Map<string, Scenario["choices"]>();
  for (const choice of scenario.choices) {
    const prior = choicesByScene.get(choice.scene);
    choicesByScene.set(choice.scene, prior === undefined ? [choice] : [...prior, choice]);
  }
  if (state.status !== "playing") {
    const scene = scenesById.get(state.scene);
    assert.ok(scene !== undefined);
    const result = new Set<string>();
    for (const line of scene!.text) for (const flag of flagsRead(line.when)) result.add(flag);
    return [...result].sort();
  }

  const monotone = independentMonotoneFlags(scenario);
  const reachable = new Set<string>([state.scene]);
  const pending = [state.scene];
  const retained = new Set<string>();
  for (let index = 0; index < pending.length; index++) {
    const sceneId = pending[index]!;
    const scene = scenesById.get(sceneId);
    assert.ok(scene !== undefined);
    for (const line of scene!.text) for (const flag of flagsRead(line.when)) retained.add(flag);
    for (const choice of choicesByScene.get(sceneId) ?? []) {
      const pruningFlags = (choice.when ?? []).filter((condition) => condition.type === "flag"
        && condition.value === false
        && monotone.has(condition.flag)
        && state.flags[condition.flag] === true)
        .map((condition) => condition.type === "flag" ? condition.flag : "");
      if (pruningFlags.length > 0) {
        // A pruned choice must retain every monotone false-gate in its
        // condition. A currently false sibling can become true in the next
        // legal action; retaining it prevents successor-mask expansion.
        for (const condition of choice.when ?? []) {
          if (condition.type === "flag" && condition.value === false && monotone.has(condition.flag)) {
            retained.add(condition.flag);
          }
        }
        continue;
      }
      for (const flag of flagsRead(choice.when)) retained.add(flag);
      for (const effect of choice.effects) {
        if (effect.type === "goTo" && !reachable.has(effect.scene)) {
          reachable.add(effect.scene);
          pending.push(effect.scene);
        }
      }
    }
  }
  return [...retained].sort();
}

function oracleKey(model: PackedModel, code: bigint): string {
  const state = model.decode(code);
  const retained = independentRetainedFlags(model.scenario, state);
  return JSON.stringify({
    retained,
    scene: state.scene,
    status: state.status,
    ending: state.ending,
    resources: model.resources.map((resource) => [resource, state.resources[resource]]),
    flags: retained.map((flag) => [flag, state.flags[flag] === true]),
  });
}

function partition(codes: readonly bigint[], keyOf: (code: bigint) => string): readonly (readonly string[])[] {
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const key = keyOf(code);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [fullCode(code)]);
    else group.push(fullCode(code));
  }
  return [...groups.values()]
    .map((group) => Object.freeze([...group].sort()))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function choiceById(model: PackedModel, id: string) {
  const choice = model.choices.find((candidate) => candidate.id === id);
  assert.ok(choice !== undefined, `unknown fixture choice ${id}`);
  return choice!;
}

function replayPath(model: PackedModel, path: readonly string[]): bigint {
  let code = model.initial;
  for (const id of path) {
    const transition = model.transition(code, choiceById(model, id));
    assert.equal(transition.kind, "success", `witness choice ${id} was not successful`);
    if (transition.kind !== "success") throw new Error("unreachable assertion");
    code = transition.state;
  }
  return code;
}

function findState(
  model: PackedModel,
  graph: FullGraph,
  predicate: (state: ReturnType<PackedModel["decode"]>) => boolean,
): bigint {
  const code = graph.states.find((candidate) => predicate(model.decode(candidate)));
  assert.ok(code !== undefined, "expected fixture state was not reached");
  return code!;
}

function assertWitnesses(model: PackedModel, result: ReturnType<typeof phaseResult>, graph: FullGraph): void {
  const sceneIds = new Set(graph.states.map((code) => model.location(code).scene));
  const choiceIds = new Set(graph.edges.map((edge) => edge.choiceId));
  const endingIds = new Set(graph.edges
    .filter((edge) => model.choices.find((choice) => choice.id === edge.choiceId)?.terminal)
    .map((edge) => edge.choiceId));
  assert.deepEqual(Object.keys(result.sceneWitnesses).sort(), [...sceneIds].sort());
  assert.deepEqual(Object.keys(result.choiceWitnesses).sort(), [...choiceIds].sort());
  assert.deepEqual(Object.keys(result.endingWitnesses).sort(), [...endingIds].sort());
  for (const [scene, path] of Object.entries(result.sceneWitnesses)) {
    const code = replayPath(model, path);
    assert.equal(model.location(code).scene, scene);
    assert.equal(result.isReachable(code), true);
  }
  for (const [choice, path] of Object.entries(result.choiceWitnesses)) {
    assert.equal(path.at(-1), choice);
    const code = replayPath(model, path);
    assert.equal(result.isReachable(code), true);
  }
  for (const [choice, path] of Object.entries(result.endingWitnesses)) {
    assert.equal(path.at(-1), choice);
    const code = replayPath(model, path);
    assert.notEqual(model.location(code).status, "playing");
    assert.equal(result.isReachable(code), true);
  }
}

function assertProjectedBehavior(
  model: PackedModel,
  projection: PackedPhaseProjection,
  result: ReturnType<typeof phaseResult>,
  graph: FullGraph,
): void {
  const expectedPartition = partition(graph.states, (code) => oracleKey(model, code));
  const actualPartition = partition(graph.states, (code) => projection.key(code));
  assert.deepEqual(actualPartition, expectedPartition, "phase projection differs from the independent oracle");

  const expectedKeys = new Set(graph.states.map((code) => oracleKey(model, code)));
  const representatives = new Map<string, bigint>();
  for (const code of result.states) {
    const key = oracleKey(model, code);
    assert.equal(representatives.has(key), false, "duplicate phase representative");
    representatives.set(key, code);
  }
  assert.deepEqual(new Set(representatives.keys()), expectedKeys);
  assert.equal(result.stateCount, expectedKeys.size);

  const behaviors = new Map<string, { choices: Set<string> | undefined; targets: Map<string, string> }>();
  for (const code of graph.states) {
    const key = oracleKey(model, code);
    let behavior = behaviors.get(key);
    if (behavior === undefined) {
      behavior = { choices: undefined, targets: new Map() };
      behaviors.set(key, behavior);
    }
    const currentChoices = new Set<string>();
    for (const choice of model.choicesAt(code)) {
      const transition = model.transition(code, choice);
      if (transition.kind === "fault") throw new Error(`unexpected fault for ${choice.id}`);
      if (transition.kind === "disabled") continue;
      currentChoices.add(choice.id);
      const target = oracleKey(model, transition.state);
      const prior = behavior.targets.get(choice.id);
      if (prior === undefined) behavior.targets.set(choice.id, target);
      else assert.equal(prior, target, `successor class differs for ${key}/${choice.id}`);
    }
    if (behavior.choices === undefined) behavior.choices = currentChoices;
    else assert.deepEqual(currentChoices, behavior.choices, `legal choices differ for ${key}`);
  }

  let representativeTransitions = 0;
  for (const [key, behavior] of behaviors) {
    const representative = representatives.get(key);
    assert.ok(representative !== undefined);
    const actualChoices = new Set<string>();
    for (const choice of model.choicesAt(representative!)) {
      const transition = model.transition(representative!, choice);
      if (transition.kind === "fault") throw new Error(`representative fault for ${choice.id}`);
      if (transition.kind === "disabled") continue;
      actualChoices.add(choice.id);
      representativeTransitions++;
      assert.equal(oracleKey(model, transition.state), behavior.targets.get(choice.id));
    }
    assert.ok(behavior.choices !== undefined);
    assert.deepEqual(actualChoices, behavior.choices, `representative choices differ for ${key}`);
  }
  assert.equal(result.transitionCount, representativeTransitions);

  const completed = new Set(graph.states
    .filter((code) => model.location(code).status === "completed")
    .map(fullCode));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) {
      if (completed.has(fullCode(edge.to)) && !completed.has(fullCode(edge.from))) {
        completed.add(fullCode(edge.from));
        changed = true;
      }
    }
  }
  const outgoing = new Set(graph.edges.map((edge) => fullCode(edge.from)));
  const classCompletion = new Set<string>();
  const classDead = new Set<string>();
  const classNoCompletion = new Set<string>();
  for (const code of graph.states) {
    const identity = fullCode(code);
    const state = model.decode(code);
    const key = oracleKey(model, code);
    const deadEnd = state.status === "playing" && !outgoing.has(identity);
    const noCompletion = state.status === "playing" && !completed.has(identity);
    if (completed.has(identity)) classCompletion.add(key);
    if (deadEnd) classDead.add(key);
    if (noCompletion) classNoCompletion.add(key);
    assert.equal(result.isReachable(code), true);
    assert.equal(result.isCompletable(code), completed.has(identity));
    assert.equal(result.isDeadEnd(code), deadEnd);
    assert.equal(result.isNoCompletion(code), noCompletion);
  }
  assert.equal(result.completableCount, classCompletion.size);
  assert.equal(result.deadEndCount, classDead.size);
  assert.equal(result.noCompletionCount, classNoCompletion.size);
  assertWitnesses(model, result, graph);
}

function expectedAbsoluteMask(model: PackedModel, flags: readonly string[]): bigint {
  const offset = model.bitCount - model.flags.length;
  return flags.reduce((mask, flag) => {
    const index = model.flags.indexOf(flag);
    assert.ok(index >= 0, `unknown expected flag ${flag}`);
    return mask | (1n << BigInt(offset + index));
  }, 0n);
}

test("packed phase projection preserves gate justifiers and merges unread history", () => {
  const model = new PackedModel(PHASE_GRAPH);
  const graph = enumerateFull(model);
  const projection = new PackedPhaseProjection(model);
  const result = phaseResult(model);

  assert.equal(result.stateScope, "phase-future-flags");
  assert.equal(projection.prunedChoiceRetention, "all-monotone-false-gates");
  assertProjectedBehavior(model, projection, result, graph);
  assert.ok(result.collisionCount > 0, "fixture must exercise a nonidentical phase collision");
  assert.ok(result.congruenceCheckCount > 0, "fixture must run collision congruence checks");
  assert.ok(result.congruenceTransitionCount > 0, "fixture must compare collision transitions");

  const start = model.initial;
  const expectedStartFlags = independentRetainedFlags(model.scenario, model.decode(start));
  assert.ok(expectedStartFlags.includes("phase-gate"));
  assert.ok(expectedStartFlags.includes("second-phase"));
  assert.ok(expectedStartFlags.includes("late-mark"));
  assert.ok(expectedStartFlags.includes("resource-mark"), "resource-disabled routes remain conservative");
  assert.deepEqual(projection.retainedFlags(start), expectedStartFlags);
  assert.equal(projection.retainedMask(start), expectedAbsoluteMask(model, expectedStartFlags));

  const markedHub = replayPath(model, ["mark-noise"]);
  const quietHub = replayPath(model, ["enter-hub"]);
  assert.equal(projection.key(markedHub), projection.key(quietHub));
  assert.equal(projection.normalized(markedHub), projection.normalized(quietHub));
  assert.deepEqual(projection.retainedFlags(markedHub), independentRetainedFlags(model.scenario, model.decode(markedHub)));

  const armedHub = replayPath(model, ["arm-phase"]);
  assert.doesNotThrow(() => projection.assertHandoff(start, armedHub));
  const armedFlags = independentRetainedFlags(model.scenario, model.decode(armedHub));
  assert.ok(armedFlags.includes("phase-gate"), "the true false-gate justifier is retained");
  assert.ok(armedFlags.includes("second-phase"), "a false sibling of a pruned gate is retained for handoff stability");
  assert.deepEqual(projection.retainedFlags(armedHub), armedFlags);

  const promotedHub = replayPath(model, ["arm-phase", "promote-second-phase"]);
  assert.deepEqual(projection.retainedFlags(promotedHub), armedFlags);
  assert.doesNotThrow(() => projection.assertHandoff(armedHub, promotedHub));

  const fullyArmedHub = replayPath(model, ["arm-both-phases"]);
  const fullyArmedFlags = independentRetainedFlags(model.scenario, model.decode(fullyArmedHub));
  assert.ok(fullyArmedFlags.includes("phase-gate"));
  assert.ok(fullyArmedFlags.includes("second-phase"), "every true pruning justifier is retained");
  assert.deepEqual(projection.retainedFlags(fullyArmedHub), fullyArmedFlags);
  assert.doesNotThrow(() => projection.assertHandoff(start, fullyArmedHub));

  const reader = model.encode({
    ...model.decode(model.initial),
    scene: "reader",
    flags: { ...model.decode(model.initial).flags, "phase-gate": true },
  });
  assert.throws(() => projection.assertHandoff(armedHub, reader), "a new retained flag cannot appear across a handoff");

  const richerResources = model.encode({
    ...model.decode(start),
    resources: { supplies: 1, water: 4 },
  });
  assert.notEqual(projection.normalized(start), projection.normalized(richerResources));
  assert.notEqual(projection.key(start), projection.key(richerResources));
  assert.deepEqual(model.decode(projection.normalized(richerResources)).resources, { supplies: 1, water: 4 });

  for (const edge of graph.edges) {
    assert.doesNotThrow(() => projection.assertHandoff(edge.from, edge.to), `handoff failed for ${edge.choiceId}`);
  }
  assert.throws(() => projection.normalized(1n << BigInt(model.bitCount)));
  assert.throws(() => projection.key(1n << BigInt(model.bitCount)));
  assert.throws(() => projection.retainedMask(1n << BigInt(model.bitCount)));
  assert.throws(() => projection.retainedFlags(1n << BigInt(model.bitCount)));
});

test("packed phase projection never prunes a resettable flag and preserves its restoration", () => {
  const model = new PackedModel(RESETTABLE_GRAPH);
  const graph = enumerateFull(model);
  const projection = new PackedPhaseProjection(model);
  const result = phaseResult(model);

  assertProjectedBehavior(model, projection, result, graph);
  const readerFalse = findState(model, graph, (state) => state.scene === "reader"
    && state.status === "playing"
    && state.flags["reader-phase"] === false);
  const readerTrue = findState(model, graph, (state) => state.scene === "reader"
    && state.status === "playing"
    && state.flags["reader-phase"] === true);
  assert.ok(projection.retainedFlags(readerFalse).includes("reader-phase"));
  assert.ok(projection.retainedFlags(readerTrue).includes("reader-phase"));
  assert.notEqual(projection.normalized(readerFalse), projection.normalized(readerTrue));
  assert.notEqual(projection.key(readerFalse), projection.key(readerTrue));
  assert.equal(result.isReachable(readerFalse), true);
  assert.equal(result.isReachable(readerTrue), true);
  assert.equal(result.endingWitnesses["finish-armed"]?.at(-1), "finish-armed");
  assert.equal(result.endingWitnesses["finish-plain"]?.at(-1), "finish-plain");
  assert.doesNotThrow(() => projection.assertHandoff(readerTrue, replayPath(model, ["arm-reader", "reset-reader"])));
  assert.doesNotThrow(() => projection.assertHandoff(readerFalse, replayPath(model, ["plain-reader", "rearm-reader"])));
});

test("packed phase projection retains terminal text inputs and preserves non-completion classes", () => {
  const terminalModel = new PackedModel(TERMINAL_GRAPH);
  const terminalGraph = enumerateFull(terminalModel);
  const terminalProjection = new PackedPhaseProjection(terminalModel);
  const terminalResult = phaseResult(terminalModel);
  assertProjectedBehavior(terminalModel, terminalProjection, terminalResult, terminalGraph);

  const marked = replayPath(terminalModel, ["finish-with-mark"]);
  const plain = replayPath(terminalModel, ["finish-without-mark"]);
  assert.ok(terminalProjection.retainedFlags(marked).includes("terminal-mark"));
  assert.ok(terminalProjection.retainedFlags(plain).includes("terminal-mark"));
  assert.notEqual(terminalProjection.normalized(marked), terminalProjection.normalized(plain));
  assert.notEqual(terminalProjection.key(marked), terminalProjection.key(plain));
  const dead = replayPath(terminalModel, ["die-at-finish"]);
  assert.notEqual(terminalModel.location(marked).ending, terminalModel.location(dead).ending);
  assert.notEqual(terminalProjection.key(marked), terminalProjection.key(dead));

  const deadModel = new PackedModel(DEAD_GRAPH);
  const deadGraph = enumerateFull(deadModel);
  const deadProjection = new PackedPhaseProjection(deadModel);
  const deadResult = phaseResult(deadModel);
  assertProjectedBehavior(deadModel, deadProjection, deadResult, deadGraph);
  assert.equal(deadResult.deadEndCount, 1);
  assert.equal(deadResult.noCompletionCount, 2);
  assert.equal(deadResult.completableCount, 2);
  assert.deepEqual(deadResult.deadEndWitness, ["enter-trap"]);
  assert.deepEqual(deadResult.noCompletionWitness, ["enter-trap"]);
  assert.ok(deadResult.choiceWitnesses["mark-unread"]);
  assert.equal(deadResult.collisionCount > 0, true, "unread marker must merge with its clean counterpart");
});

test("packed phase projection conservatively extends the existing analyzer", () => {
  const model = new PackedModel(PHASE_GRAPH);
  const projection = new PackedPhaseProjection(model);
  const supplemental = analyzeFutureReads(model.scenario);
  for (const code of enumerateFull(model).states) {
    const retained = new Set(projection.retainedFlags(code));
    for (const flag of supplemental.retainedFlagsForState(model.decode(code))) {
      assert.ok(retained.has(flag), `the conservative projection lost ${flag}`);
    }
  }
  const armed = replayPath(model, ["arm-phase"]);
  assert.deepEqual(supplemental.retainedFlagsForState(model.decode(armed)), ["phase-gate"]);
  assert.deepEqual(projection.retainedFlags(armed), ["phase-gate", "second-phase"]);
  assert.ok(Object.isFrozen(projection));
  assert.ok(Object.isFrozen(projection.monotoneFlags));
  assert.ok(Object.isFrozen(projection.phaseFlagsByScene));
  assert.ok(Object.isFrozen(projection.terminalFlagsByScene));
  for (const flags of Object.values(projection.phaseFlagsByScene)) assert.ok(Object.isFrozen(flags));
  for (const flags of Object.values(projection.terminalFlagsByScene)) assert.ok(Object.isFrozen(flags));
  for (const scene of model.scenes) {
    assert.deepEqual(projection.retainedFlags(model.encode({
      scene,
      status: "playing",
      ending: 0,
      resources: { supplies: 0, water: 0 },
      flags: Object.fromEntries(model.flags.map((flag) => [flag, false])),
    })), supplemental.retainedFlagsForState({
      scene,
      status: "playing",
      flags: Object.fromEntries(model.flags.map((flag) => [flag, false])),
    }));
  }
});
