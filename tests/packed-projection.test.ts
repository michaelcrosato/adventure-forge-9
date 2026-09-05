import assert from "node:assert/strict";
import test from "node:test";
import { validateScenario, type Condition, type Scenario } from "../src/engine/content.js";
import { PackedModel } from "../src/verification/packed-model.js";
import { PackedControlProjection } from "../src/verification/packed-projection.js";
import { packedReachability, type PackedReachability } from "../src/verification/packed-reachability.js";

type FlagRecord =
  | ReadonlyMap<string, readonly string[]>
  | Readonly<Record<string, readonly string[]>>;

interface FullEdge {
  readonly from: bigint;
  readonly choiceId: string;
  readonly to: bigint;
}

interface FullGraph {
  readonly states: readonly bigint[];
  readonly edges: readonly FullEdge[];
}

const UNREAD_RECONVERGENCE = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 0 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "Two roads reach the same workroom." }] },
    { id: "workroom", title: "Workroom", text: [{ text: "The workroom has one final task." }] },
  ],
  choices: [
    {
      id: "mark-history",
      scene: "start",
      label: "Mark the ledger",
      description: "Leave an internal marker before entering.",
      effects: [
        { type: "setFlag", flag: "history-marker", value: true },
        { type: "goTo", scene: "workroom" },
      ],
    },
    {
      id: "enter-quietly",
      scene: "start",
      label: "Enter quietly",
      description: "Enter without leaving the marker.",
      effects: [{ type: "goTo", scene: "workroom" }],
    },
    {
      id: "finish-workroom",
      scene: "workroom",
      label: "Finish the work",
      description: "Close the workroom task.",
      effects: [],
      outcome: { status: "completed", summary: "The workroom task is complete." },
    },
  ],
} as const;

const RESETTABLE_READER = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 0 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "Choose how to approach the reader." }] },
    { id: "reader", title: "Reader", text: [{ text: "The reader waits for a phase decision." }] },
  ],
  choices: [
    {
      id: "arm-reader",
      scene: "start",
      label: "Arm the reader",
      description: "Set the phase before entering.",
      effects: [
        { type: "setFlag", flag: "reader-phase", value: true },
        { type: "goTo", scene: "reader" },
      ],
    },
    {
      id: "plain-reader",
      scene: "start",
      label: "Enter plainly",
      description: "Enter before setting the phase.",
      effects: [{ type: "goTo", scene: "reader" }],
    },
    {
      id: "finish-armed",
      scene: "reader",
      label: "Finish while armed",
      description: "Finish with the phase set.",
      when: [{ type: "flag", flag: "reader-phase", value: true }],
      effects: [],
      outcome: { status: "completed", summary: "The reader task is complete." },
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
      label: "Finish plainly",
      description: "Finish with the phase clear.",
      when: [{ type: "flag", flag: "reader-phase", value: false }],
      effects: [],
      outcome: { status: "completed", summary: "The reader task is complete." },
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

const TERMINAL_TEXT = {
  version: 1,
  initialScene: "finish",
  initialResources: { water: 0 },
  initialFacts: [],
  scenes: [
    {
      id: "finish",
      title: "Finish",
      text: [
        { text: "The work is ready to close." },
        {
          text: "The terminal mark is visible.",
          when: [{ type: "flag", flag: "terminal-mark", value: true }],
        },
      ],
    },
  ],
  choices: [
    {
      id: "finish-with-mark",
      scene: "finish",
      label: "Close with the mark",
      description: "Set the terminal mark as you close.",
      effects: [{ type: "setFlag", flag: "terminal-mark", value: true }],
      outcome: { status: "completed", summary: "The same work is complete." },
    },
    {
      id: "finish-without-mark",
      scene: "finish",
      label: "Close without the mark",
      description: "Close without setting the terminal mark.",
      effects: [],
      outcome: { status: "completed", summary: "The same work is complete." },
    },
  ],
} as const;

const CONDITIONAL_AND_UNREACHABLE = {
  version: 1,
  initialScene: "start",
  initialResources: { water: 0 },
  initialFacts: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The gate controls several routes." }] },
    {
      id: "branch",
      title: "Branch",
      text: [
        { text: "The branch is open." },
        { text: "The branch marker is visible.", when: [{ type: "flag", flag: "branch-marker", value: true }] },
      ],
    },
    { id: "local", title: "Local", text: [{ text: "The local route is quiet." }] },
    {
      id: "hidden",
      title: "Hidden",
      text: [
        { text: "The hidden route is never entered." },
        { text: "The hidden marker is visible.", when: [{ type: "flag", flag: "hidden-marker", value: true }] },
      ],
    },
  ],
  choices: [
    {
      id: "open-gate",
      scene: "start",
      label: "Open the gate",
      description: "Open the gate and remain at the start.",
      when: [{ type: "flag", flag: "gate-open", value: false }],
      effects: [
        { type: "setFlag", flag: "gate-open", value: true },
        { type: "goTo", scene: "start" },
      ],
    },
    {
      id: "loop-start",
      scene: "start",
      label: "Check the open gate",
      description: "Return to the start through the open gate.",
      when: [{ type: "flag", flag: "gate-open", value: true }],
      effects: [{ type: "goTo", scene: "start" }],
    },
    {
      id: "enter-branch",
      scene: "start",
      label: "Enter the conditional branch",
      description: "Take the branch after opening the gate.",
      when: [{ type: "flag", flag: "gate-open", value: true }],
      effects: [
        { type: "setFlag", flag: "branch-marker", value: true },
        { type: "goTo", scene: "branch" },
      ],
    },
    {
      id: "enter-local",
      scene: "start",
      label: "Take the local route",
      description: "Take the local route after opening the gate.",
      when: [{ type: "flag", flag: "gate-open", value: true }],
      effects: [{ type: "goTo", scene: "local" }],
    },
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at the gate",
      description: "End the route at the gate.",
      effects: [],
      outcome: { status: "completed", summary: "The gate route is complete." },
    },
    {
      id: "finish-branch",
      scene: "branch",
      label: "Finish the branch",
      description: "Close the branch route.",
      when: [{ type: "flag", flag: "branch-marker", value: true }],
      effects: [],
      outcome: { status: "completed", summary: "The branch route is complete." },
    },
    {
      id: "finish-local",
      scene: "local",
      label: "Finish the local route",
      description: "Close the local route.",
      effects: [],
      outcome: { status: "completed", summary: "The local route is complete." },
    },
    {
      id: "arm-hidden",
      scene: "hidden",
      label: "Arm the hidden marker",
      description: "Set a marker in the unreachable route.",
      when: [{ type: "flag", flag: "hidden-marker", value: false }],
      effects: [
        { type: "setFlag", flag: "hidden-marker", value: true },
        { type: "goTo", scene: "hidden" },
      ],
    },
    {
      id: "finish-hidden",
      scene: "hidden",
      label: "Finish the hidden route",
      description: "Close the unreachable route.",
      when: [{ type: "flag", flag: "hidden-marker", value: true }],
      effects: [],
      outcome: { status: "completed", summary: "The hidden route is complete." },
    },
  ],
} as const;

function fullCodeKey(code: bigint): string {
  return code.toString(16);
}

function enumerateFull(model: PackedModel): FullGraph {
  const states: bigint[] = [model.initial];
  const seen = new Map<string, number>([[fullCodeKey(model.initial), 0]]);
  const edges: FullEdge[] = [];
  for (let index = 0; index < states.length; index++) {
    const from = states[index]!;
    for (const choice of model.choicesAt(from)) {
      const transition = model.transition(from, choice);
      if (transition.kind === "disabled") continue;
      if (transition.kind === "fault") throw new Error("unexpected arithmetic fault for " + choice.id);
      const to = transition.state;
      edges.push(Object.freeze({ from, choiceId: choice.id, to }));
      const key = fullCodeKey(to);
      if (!seen.has(key)) {
        seen.set(key, states.length);
        states.push(to);
      }
    }
  }
  return Object.freeze({ states: Object.freeze(states), edges: Object.freeze(edges) });
}

function resultFor(
  model: PackedModel,
  stateScope: "all-flags" | "static-future-flags",
): PackedReachability {
  return packedReachability(model, { stateScope, stateLimit: 1000, edgeLimit: 5000 });
}

function flagList(record: FlagRecord, scene: string): readonly string[] {
  if (record instanceof Map) return record.get(scene) ?? [];
  return (record as Readonly<Record<string, readonly string[]>>)[scene] ?? [];
}

interface OracleMasks {
  readonly playing: ReadonlyMap<string, ReadonlySet<string>>;
  readonly terminal: ReadonlyMap<string, ReadonlySet<string>>;
}

function flagsRead(conditions: readonly Condition[] | undefined): Set<string> {
  const result = new Set<string>();
  for (const condition of conditions ?? []) {
    if (condition.type === "flag") result.add(condition.flag);
  }
  return result;
}

function oracleMasks(scenario: Scenario): OracleMasks {
  const scenesById = new Map(scenario.scenes.map((scene) => [scene.id, scene] as const));
  const choicesByScene = new Map<string, readonly Scenario["choices"][number][]>();
  for (const choice of scenario.choices) {
    const prior = choicesByScene.get(choice.scene);
    choicesByScene.set(choice.scene, prior === undefined ? [choice] : [...prior, choice]);
  }
  const playing = new Map<string, ReadonlySet<string>>();
  const terminal = new Map<string, ReadonlySet<string>>();
  for (const scene of scenario.scenes) {
    const scenes = new Set<string>([scene.id]);
    const pending = [scene.id];
    const flags = new Set<string>();
    for (let index = 0; index < pending.length; index++) {
      const current = scenesById.get(pending[index]!);
      assert.ok(current !== undefined);
      for (const line of current!.text) {
        for (const flag of flagsRead(line.when)) flags.add(flag);
      }
      for (const choice of choicesByScene.get(current!.id) ?? []) {
        for (const flag of flagsRead(choice.when)) flags.add(flag);
        for (const effect of choice.effects) {
          if (effect.type === "goTo" && !scenes.has(effect.scene)) {
            scenes.add(effect.scene);
            pending.push(effect.scene);
          }
        }
      }
    }
    playing.set(scene.id, flags);
    const terminalFlags = new Set<string>();
    for (const line of scene.text) {
      for (const flag of flagsRead(line.when)) terminalFlags.add(flag);
    }
    terminal.set(scene.id, terminalFlags);
  }
  return { playing, terminal };
}

function oracleProjectedKey(model: PackedModel, masks: OracleMasks, code: bigint): string {
  const state = model.decode(code);
  const retained = state.status === "playing"
    ? masks.playing.get(state.scene)
    : masks.terminal.get(state.scene);
  assert.ok(retained !== undefined);
  return JSON.stringify({
    scene: state.scene,
    status: state.status,
    ending: state.ending,
    resources: model.resources.map((resource) => [resource, state.resources[resource]]),
    flags: [...retained!].sort().map((flag) => [flag, state.flags[flag] === true]),
  });
}

function partition(
  codes: readonly bigint[],
  keyOf: (code: bigint) => string,
): readonly (readonly string[])[] {
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const key = keyOf(code);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [fullCodeKey(code)]);
    else group.push(fullCodeKey(code));
  }
  return [...groups.values()]
    .map((group) => Object.freeze([...group].sort()))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function assertFullResult(result: PackedReachability, graph: FullGraph): void {
  assert.equal(result.stateScope, "all-flags");
  assert.equal(result.stateCount, graph.states.length);
  assert.equal(result.transitionCount, graph.edges.length);
  assert.deepEqual(
    new Set(result.states.map(fullCodeKey)),
    new Set(graph.states.map(fullCodeKey)),
  );
}

function assertProjectedBehavior(
  model: PackedModel,
  projection: PackedControlProjection,
  result: PackedReachability,
  graph: FullGraph,
): void {
  assert.equal(result.stateScope, "static-future-flags");
  const masks = oracleMasks(model.scenario);
  assert.deepEqual(
    partition(graph.states, (code) => projection.key(code)),
    partition(graph.states, (code) => oracleProjectedKey(model, masks, code)),
    "the implementation partition matches the independently derived static masks",
  );
  const fullClassKeys = new Set(graph.states.map((code) => projection.key(code)));
  const resultClassKeys = new Set(result.states.map((code) => projection.key(code)));
  assert.deepEqual(resultClassKeys, fullClassKeys);
  assert.equal(result.stateCount, resultClassKeys.size);

  const expectedByClass = new Map<string, {
    choices: Set<string> | undefined;
    targets: Map<string, string>;
  }>();
  for (const code of graph.states) {
    const classKey = projection.key(code);
    let classBehavior = expectedByClass.get(classKey);
    if (classBehavior === undefined) {
      classBehavior = { choices: undefined, targets: new Map() };
      expectedByClass.set(classKey, classBehavior);
    }
    const stateChoices = new Set<string>();
    for (const choice of model.choicesAt(code)) {
      const transition = model.transition(code, choice);
      if (transition.kind === "disabled") continue;
      if (transition.kind === "fault") throw new Error("unexpected arithmetic fault for " + choice.id);
      stateChoices.add(choice.id);
      const targetKey = projection.key(transition.state);
      const priorTarget = classBehavior.targets.get(choice.id);
      if (priorTarget !== undefined) {
        assert.equal(priorTarget, targetKey, "projected successor differs for " + classKey + "/" + choice.id);
      } else {
        classBehavior.targets.set(choice.id, targetKey);
      }
    }
    if (classBehavior.choices === undefined) classBehavior.choices = stateChoices;
    else assert.deepEqual(stateChoices, classBehavior.choices, "legal choices differ within projected class " + classKey);
  }

  const representatives = new Map<string, bigint>();
  for (const code of result.states) {
    const key = projection.key(code);
    assert.equal(representatives.has(key), false, "duplicate representative for " + key);
    representatives.set(key, code);
  }
  let representativeTransitions = 0;
  for (const [classKey, expected] of expectedByClass) {
    const representative = representatives.get(classKey);
    assert.ok(representative !== undefined, "missing representative for " + classKey);
    const actualChoices = new Set<string>();
    for (const choice of model.choicesAt(representative!)) {
      const transition = model.transition(representative!, choice);
      if (transition.kind === "disabled") continue;
      if (transition.kind === "fault") throw new Error("unexpected arithmetic fault for " + choice.id);
      representativeTransitions++;
      actualChoices.add(choice.id);
      assert.equal(projection.key(transition.state), expected.targets.get(choice.id));
    }
    assert.deepEqual(actualChoices, expected.choices, "legal choices differ for projected class " + classKey);
  }
  assert.equal(result.transitionCount, representativeTransitions);

  // Independently propagate completion over the full graph, then compare
  // every member and each projected set's cardinality with the quotient.
  const completed = new Set(graph.states.filter(code => model.location(code).status === "completed"));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.edges) if (completed.has(edge.to) && !completed.has(edge.from)) {
      completed.add(edge.from); changed = true;
    }
  }
  const sources = new Set(graph.edges.map(edge => edge.from));
  const deadKeys = new Set<string>(), unfinishedKeys = new Set<string>();
  for (const code of graph.states) {
    const playing = model.location(code).status === "playing";
    const deadEnd = playing && !sources.has(code);
    const noCompletion = playing && !completed.has(code);
    assert.equal(result.isCompletable(code), completed.has(code));
    assert.equal(result.isDeadEnd(code), deadEnd);
    assert.equal(result.isNoCompletion(code), noCompletion);
    if (deadEnd) deadKeys.add(oracleProjectedKey(model, masks, code));
    if (noCompletion) unfinishedKeys.add(oracleProjectedKey(model, masks, code));
  }
  assert.equal(result.completableCount, new Set([...completed].map(code => oracleProjectedKey(model, masks, code))).size);
  assert.equal(result.deadEndCount, deadKeys.size);
  assert.equal(result.noCompletionCount, unfinishedKeys.size);
}

function targetFor(model: PackedModel, code: bigint, choiceId: string): bigint {
  const choice = model.choices.find((candidate) => candidate.id === choiceId);
  assert.ok(choice !== undefined, "missing fixture choice " + choiceId);
  const transition = model.transition(code, choice!);
  assert.equal(transition.kind, "success");
  if (transition.kind !== "success") throw new Error("fixture choice " + choiceId + " did not succeed");
  return transition.state;
}

function findState(
  model: PackedModel,
  graph: FullGraph,
  predicate: (state: ReturnType<PackedModel["decode"]>) => boolean,
): bigint {
  const code = graph.states.find((candidate) => predicate(model.decode(candidate)));
  assert.ok(code !== undefined, "fixture state was not reached");
  return code!;
}

function visibleText(scenario: Scenario, model: PackedModel, code: bigint): readonly string[] {
  const state = model.decode(code);
  const scene = scenario.scenes.find((candidate) => candidate.id === state.scene);
  assert.ok(scene !== undefined, "missing scene " + state.scene);
  return scene!.text
    .filter((line) => (line.when ?? []).every((condition) => {
      if (condition.type !== "flag") throw new Error("text fixture unexpectedly uses a resource condition");
      return (state.flags[condition.flag] ?? false) === condition.value;
    }))
    .map((line) => line.text);
}

test("packed static future flag scope merges only unread writes and preserves independent class behavior", () => {
  const model = new PackedModel(UNREAD_RECONVERGENCE);
  const graph = enumerateFull(model);
  const projection = new PackedControlProjection(model);
  const allFlags = resultFor(model, "all-flags");
  const projected = resultFor(model, "static-future-flags");

  assertFullResult(allFlags, graph);
  assert.ok(projected.stateCount < allFlags.stateCount, "the unread marker should form one projected class");
  assertProjectedBehavior(model, projection, projected, graph);
  assert.deepEqual(flagList(projection.playingFlagsByScene, "start"), []);
  assert.deepEqual(flagList(projection.playingFlagsByScene, "workroom"), []);

  const quietHub = findState(model, graph, (state) => state.scene === "workroom"
    && state.status === "playing"
    && state.flags["history-marker"] === false);
  const markedHub = findState(model, graph, (state) => state.scene === "workroom"
    && state.status === "playing"
    && state.flags["history-marker"] === true);
  assert.equal(projection.normalized(quietHub), projection.normalized(markedHub));
  assert.equal(projected.isReachable(quietHub), true);
  assert.equal(projected.isReachable(markedHub), true);
  assert.equal(projected.isCompletable(quietHub), true);
  assert.equal(projected.isCompletable(markedHub), true);
});

test("packed later reader and resettable flag remain distinct while same-summary terminal witnesses survive merging", () => {
  const model = new PackedModel(RESETTABLE_READER);
  const graph = enumerateFull(model);
  const projection = new PackedControlProjection(model);
  const allFlags = resultFor(model, "all-flags");
  const projected = resultFor(model, "static-future-flags");

  assertFullResult(allFlags, graph);
  assertProjectedBehavior(model, projection, projected, graph);
  assert.ok(flagList(projection.playingFlagsByScene, "reader").includes("reader-phase"));

  const readerFalse = findState(model, graph, (state) => state.scene === "reader"
    && state.status === "playing"
    && state.flags["reader-phase"] === false);
  const readerTrue = findState(model, graph, (state) => state.scene === "reader"
    && state.status === "playing"
    && state.flags["reader-phase"] === true);
  assert.notEqual(projection.normalized(readerFalse), projection.normalized(readerTrue));
  assert.notEqual(projection.key(readerFalse), projection.key(readerTrue));
  assert.equal(targetFor(model, readerTrue, "reset-reader") !== readerTrue, true);
  assert.equal(model.decode(targetFor(model, readerTrue, "reset-reader")).flags["reader-phase"], false);
  assert.equal(model.decode(targetFor(model, readerFalse, "rearm-reader")).flags["reader-phase"], true);

  assert.equal(projected.endingWitnesses["finish-armed"]?.at(-1), "finish-armed");
  assert.equal(projected.endingWitnesses["finish-plain"]?.at(-1), "finish-plain");
});

test("packed terminal text flags stay in the terminal mask even when the ending pair is identical", () => {
  const model = new PackedModel(TERMINAL_TEXT);
  const graph = enumerateFull(model);
  const projection = new PackedControlProjection(model);
  const allFlags = resultFor(model, "all-flags");
  const projected = resultFor(model, "static-future-flags");

  assertFullResult(allFlags, graph);
  assertProjectedBehavior(model, projection, projected, graph);
  assert.ok(flagList(projection.terminalFlagsByScene, "finish").includes("terminal-mark"));

  const initial = model.initial;
  const plainTerminal = targetFor(model, initial, "finish-without-mark");
  const markedTerminal = targetFor(model, initial, "finish-with-mark");
  assert.equal(model.location(plainTerminal).ending, model.location(markedTerminal).ending);
  assert.notDeepEqual(
    visibleText(TERMINAL_TEXT as unknown as Scenario, model, plainTerminal),
    visibleText(TERMINAL_TEXT as unknown as Scenario, model, markedTerminal),
  );
  assert.notEqual(projection.normalized(plainTerminal), projection.normalized(markedTerminal));
  assert.notEqual(projection.key(plainTerminal), projection.key(markedTerminal));
});

test("packed conditional destinations use their own closure and unreachable scenes retain independent masks", () => {
  const model = new PackedModel(CONDITIONAL_AND_UNREACHABLE);
  const graph = enumerateFull(model);
  const projection = new PackedControlProjection(model);
  const allFlags = resultFor(model, "all-flags");
  const projected = resultFor(model, "static-future-flags");

  assertFullResult(allFlags, graph);
  assertProjectedBehavior(model, projection, projected, graph);
  assert.ok(graph.edges.some((edge) => edge.from === edge.to), "the fixture includes a backedge");
  assert.ok(projected.unreachableScenes.includes("hidden"));
  assert.ok(projected.unreachableChoices.includes("arm-hidden"));
  assert.ok(projected.unreachableChoices.includes("finish-hidden"));

  const startFlags = flagList(projection.playingFlagsByScene, "start");
  assert.ok(startFlags.includes("gate-open"));
  assert.ok(startFlags.includes("branch-marker"), "conditional destination reads are in the predecessor closure");
  assert.equal(startFlags.includes("hidden-marker"), false);
  assert.equal(flagList(projection.playingFlagsByScene, "local").includes("branch-marker"), false);
  assert.ok(flagList(projection.playingFlagsByScene, "hidden").includes("hidden-marker"));
  assert.ok(flagList(projection.terminalFlagsByScene, "branch").includes("branch-marker"));
  assert.ok(flagList(projection.terminalFlagsByScene, "hidden").includes("hidden-marker"));

  const hiddenFalse = model.encode({
    scene: "hidden",
    status: "playing",
    ending: 0,
    resources: { water: 0 },
    flags: { "hidden-marker": false },
  });
  const hiddenTrue = model.encode({
    scene: "hidden",
    status: "playing",
    ending: 0,
    resources: { water: 0 },
    flags: { "hidden-marker": true },
  });
  assert.notEqual(projection.key(hiddenFalse), projection.key(hiddenTrue));
});

test("packed scope defaults, option validation, getter access and malformed membership are explicit", () => {
  const model = new PackedModel(UNREAD_RECONVERGENCE);
  const graph = enumerateFull(model);
  const projection = new PackedControlProjection(model);
  let scopeReads = 0;
  const options = {
    get stateScope(): "static-future-flags" {
      scopeReads++;
      return "static-future-flags";
    },
    stateLimit: 1000,
    edgeLimit: 5000,
  };
  const projected = packedReachability(model, options);
  assert.equal(scopeReads, 1);
  assert.equal(projected.stateScope, "static-future-flags");
  assertFullResult(packedReachability(model), graph);
  assertFullResult(resultFor(model, "all-flags"), graph);

  assert.throws(
    () => packedReachability(model, null as never),
    /Invalid packed reachability options/,
  );
  assert.throws(
    () => packedReachability(model, { stateScope: null } as never),
    /Invalid packed state scope/,
  );
  assert.throws(
    () => packedReachability(model, { stateScope: "unknown" } as never),
    /Invalid packed state scope/,
  );

  const malformed = 1n << BigInt(model.bitCount);
  assert.throws(() => projection.normalized(malformed), /outside the model width/);
  assert.equal(projected.isReachable(malformed), false);
  for (const invalid of [0, "0", Object(0n), null, undefined] as const) {
    assert.equal(projected.isReachable(invalid as never), false);
    assert.equal(projected.isCompletable(invalid as never), false);
    assert.equal(projected.isDeadEnd(invalid as never), false);
    assert.equal(projected.isNoCompletion(invalid as never), false);
  }
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.playingFlagsByScene), true);
  assert.equal(Object.isFrozen(projection.terminalFlagsByScene), true);
  assert.equal(Object.isFrozen(projection.playingFlagsByScene.start), true);
  assert.equal(Object.isFrozen(projection.terminalFlagsByScene.start), true);

  const rich = model.encode({ ...model.decode(model.initial), resources: { water: Number.MAX_SAFE_INTEGER } });
  assert.equal(model.decode(projection.normalized(rich)).resources.water, Number.MAX_SAFE_INTEGER);
  assert.notEqual(projection.key(rich), projection.key(model.initial));
  for (const bad of [-1n, malformed, model.initial | (3n << 1n)]) {
    assert.throws(() => projection.normalized(bad));
    assert.equal(projected.isReachable(bad), false);
  }
});

test("packed static classes preserve dead ends, stranded cycles and non-completed terminals", () => {
  const raw = {
    version: 1, initialScene: "start", initialResources: { water: 0 }, initialFacts: [],
    scenes: [
      { id: "start", title: "Start", text: [{ text: "Choose a route." }] },
      { id: "trap", title: "Trap", text: [{ text: "There is no exit." }] },
      { id: "loop", title: "Loop", text: [{ text: "Only departure remains." }] },
    ],
    choices: [
      { id: "mark", scene: "start", label: "Mark", description: "Record a historical mark.",
        effects: [{ type: "setFlag", flag: "unread", value: true }, { type: "goTo", scene: "start" }] },
      { id: "trap", scene: "start", label: "Trap", description: "Enter the trap.", effects: [{ type: "goTo", scene: "trap" }] },
      { id: "loop", scene: "start", label: "Loop", description: "Enter the loop.", effects: [{ type: "goTo", scene: "loop" }] },
      { id: "finish", scene: "start", label: "Finish", description: "Complete the route.", effects: [],
        outcome: { status: "completed", summary: "Completed." } },
      { id: "die", scene: "start", label: "Die", description: "End in death.", effects: [],
        outcome: { status: "dead", summary: "Died." } },
      { id: "repeat", scene: "loop", label: "Repeat", description: "Stay in the loop.", effects: [{ type: "goTo", scene: "loop" }] },
      { id: "depart", scene: "loop", label: "Depart", description: "Depart from the loop.", effects: [],
        outcome: { status: "departed", summary: "Departed." } },
      { id: "blocked-exit", scene: "trap", label: "Exit", description: "An unaffordable exit stays unavailable.",
        when: [{ type: "resourceAtLeast", resource: "water", value: 1 }], effects: [],
        outcome: { status: "completed", summary: "Escaped." } },
    ],
  };
  const model = new PackedModel(raw), projection = new PackedControlProjection(model);
  const full = enumerateFull(model), result = resultFor(model, "static-future-flags");
  assertProjectedBehavior(model, projection, result, full);
  assert.equal(result.stateCount, 6);
  assert.equal(result.deadEndCount, 1);
  assert.equal(result.noCompletionCount, 2);
  assert.equal(result.completableCount, 2);
  assert.deepEqual(result.deadEndWitness, ["trap"]);
  assert.deepEqual(result.noCompletionWitness, ["trap"]);
  for (const record of [result.sceneWitnesses, result.choiceWitnesses, result.endingWitnesses]) {
    for (const path of Object.values(record)) {
      let code = model.initial;
      for (const choiceId of path) code = targetFor(model, code, choiceId);
      assert.equal(result.isReachable(code), true);
    }
  }
});
