import assert from "node:assert/strict";
import test from "node:test";
import {
  certificateDescriptor,
  FAILURE_KINDS,
  type FailureKind,
} from "../src/verification/symbolic-certificates.js";
import { SymbolicModel, type SemanticState } from "../src/verification/symbolic-model.js";
import {
  FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA,
  verifyFactorizedSymbolicCertificate,
} from "../src/verification/symbolic-factorized-certificates.js";

type TerminalStatus = "completed" | "departed" | "dead";

type RawCondition = {
  readonly type: "resourceAtLeast" | "resourceAtMost";
  readonly resource: string;
  readonly value: number;
};

type RawEffect =
  | { readonly type: "adjustResource"; readonly resource: string; readonly delta: number }
  | { readonly type: "goTo"; readonly scene: string };

interface RawChoice {
  readonly id: string;
  readonly scene: string;
  readonly label: string;
  readonly description: string;
  readonly when?: readonly RawCondition[];
  readonly effects: readonly RawEffect[];
  readonly outcome?: { readonly status: TerminalStatus; readonly summary: string };
}

interface RawScenario {
  readonly version: 1;
  readonly initialScene: string;
  readonly initialResources: Readonly<Record<string, number>>;
  readonly initialFacts: readonly string[];
  readonly clocks: readonly [];
  readonly scenes: readonly {
    readonly id: string;
    readonly title: string;
    readonly text: readonly { readonly text: string }[];
  }[];
  readonly choices: readonly RawChoice[];
}

const BOUNDS = Object.freeze({ token: 1 });
const DEFAULT_FIELDS = ["scene", "status", "ending", "resource:token"] as const;

/**
 * Reachable safe work is separated from two unreachable obligations. The
 * latter make nonzero arithmetic and bound seeds available without putting
 * the initial state in any bad cone. Dead has no completion or failure.
 */
const RAW_SCENARIO = {
  version: 1,
  initialScene: "start",
  initialResources: { token: 1 },
  initialFacts: [],
  clocks: [],
  scenes: [
    { id: "start", title: "Start", text: [{ text: "The safe route begins." }] },
    { id: "work", title: "Work", text: [{ text: "The safe work route is open." }] },
    { id: "dead", title: "Dead", text: [{ text: "This disconnected loop cannot finish." }] },
    { id: "bridge", title: "Bridge", text: [{ text: "This disconnected bridge reaches the unsafe room." }] },
    { id: "unsafe", title: "Unsafe", text: [{ text: "Disconnected actions expose two failures." }] },
  ],
  choices: [
    {
      id: "enter-work",
      scene: "start",
      label: "Enter work",
      description: "Take the safe route into work.",
      effects: [{ type: "goTo", scene: "work" }],
    },
    {
      id: "finish-start",
      scene: "start",
      label: "Finish at start",
      description: "Finish safely before entering work.",
      effects: [],
      outcome: { status: "completed", summary: "The safe route is complete." },
    },
    {
      id: "spend-token",
      scene: "work",
      label: "Spend the token",
      description: "Spend one token and remain safe.",
      when: [{ type: "resourceAtLeast", resource: "token", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "token", delta: -1 },
        { type: "goTo", scene: "work" },
      ],
    },
    {
      id: "finish-work",
      scene: "work",
      label: "Finish work",
      description: "Finish the safe work route.",
      effects: [],
      outcome: { status: "completed", summary: "The safe route is complete." },
    },
    {
      id: "spin-dead",
      scene: "dead",
      label: "Spin in dead",
      description: "Remain in the disconnected dead loop.",
      effects: [{ type: "goTo", scene: "dead" }],
    },
    {
      id: "enter-unsafe",
      scene: "bridge",
      label: "Enter unsafe",
      description: "Cross the disconnected bridge into the unsafe room.",
      effects: [{ type: "goTo", scene: "unsafe" }],
    },
    {
      id: "fail-bound",
      scene: "unsafe",
      label: "Overfill the unsafe tank",
      description: "Attempt a bounded increment from the full tank.",
      when: [{ type: "resourceAtLeast", resource: "token", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "token", delta: 1 },
        { type: "goTo", scene: "unsafe" },
      ],
    },
    {
      id: "fail-arithmetic",
      scene: "unsafe",
      label: "Overflow unsafe arithmetic",
      description: "Attempt a safe-integer overflow before navigation.",
      when: [{ type: "resourceAtLeast", resource: "token", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "token", delta: Number.MAX_SAFE_INTEGER },
        { type: "goTo", scene: "unsafe" },
      ],
    },
  ],
} as const satisfies RawScenario;

interface OracleEdge {
  readonly choiceId: string;
  readonly source: SemanticState;
  readonly target: SemanticState;
}

type OracleResult =
  | { readonly kind: "success"; readonly state: SemanticState }
  | { readonly kind: "fault"; readonly reason: "arithmetic-error" | "bound-exit" };

interface OracleAnalysis {
  readonly edges: readonly OracleEdge[];
  readonly completionPlaying: ReadonlySet<string>;
  readonly completionOrFailurePlaying: ReadonlySet<string>;
  readonly failureSeeds: ReadonlyMap<string, ReadonlySet<string>>;
}

function stateKey(state: SemanticState): string {
  return JSON.stringify([state.scene, state.status, state.ending, state.resources["token"]]);
}

function playingState(scene: string, token: number): SemanticState {
  return { scene, status: "playing", ending: 0, resources: { token }, flags: {} };
}

function allPlayingStates(): readonly SemanticState[] {
  return Object.freeze(RAW_SCENARIO.scenes.flatMap(scene => [playingState(scene.id, 0), playingState(scene.id, 1)]));
}

const PLAYING_STATES = allPlayingStates();
const PLAYING_KEYS = new Set(PLAYING_STATES.map(stateKey));

// This mutable scratch is only used to deduplicate authored receipt pairs.
const ENDING_PAIRS_MUT: [TerminalStatus, string][] = [];
for (const choice of RAW_SCENARIO.choices) {
  if (!("outcome" in choice) || choice.outcome === undefined) continue;
  if (!ENDING_PAIRS_MUT.some(([status, summary]) => status === choice.outcome.status && summary === choice.outcome.summary)) {
    ENDING_PAIRS_MUT.push([choice.outcome.status, choice.outcome.summary]);
  }
}

function endingFor(choice: RawChoice): number | undefined {
  if (!("outcome" in choice) || choice.outcome === undefined) return undefined;
  const index = ENDING_PAIRS_MUT.findIndex(([status, summary]) => status === choice.outcome!.status && summary === choice.outcome!.summary);
  return index < 0 ? undefined : index + 1;
}

function oracleChoice(source: SemanticState, choice: RawChoice): OracleResult | undefined {
  if (source.scene !== choice.scene) return undefined;
  for (const condition of choice.when ?? []) {
    const value = source.resources[condition.resource];
    if (value === undefined) return undefined;
    if (condition.type === "resourceAtLeast" && value < condition.value) return undefined;
    if (condition.type === "resourceAtMost" && value > condition.value) return undefined;
  }

  const resources = { token: source.resources["token"]! };
  let scene = source.scene;
  for (const effect of choice.effects) {
    if (effect.type === "goTo") {
      scene = effect.scene;
      continue;
    }
    const current = resources[effect.resource as "token"];
    const next = current + effect.delta;
    if (!Number.isSafeInteger(next) || next < 0) return { kind: "fault", reason: "arithmetic-error" };
    if (next > BOUNDS[effect.resource as "token"]) return { kind: "fault", reason: "bound-exit" };
    resources[effect.resource as "token"] = next;
  }

  const ending = endingFor(choice);
  if ("outcome" in choice && choice.outcome !== undefined && ending !== undefined) {
    return {
      kind: "success",
      state: { scene, status: choice.outcome.status, ending, resources, flags: {} },
    };
  }
  return { kind: "success", state: { scene, status: "playing", ending: 0, resources, flags: {} } };
}

function oracleAnalysis(): OracleAnalysis {
  const edges: OracleEdge[] = [];
  const failureSets = new Map<string, Set<string>>();
  for (const choice of RAW_SCENARIO.choices) {
    for (const kind of FAILURE_KINDS) failureSets.set(`${kind}:${choice.id}`, new Set());
    for (const source of PLAYING_STATES) {
      const result = oracleChoice(source, choice);
      if (result === undefined) continue;
      if (result.kind === "fault") {
        failureSets.get(`${result.reason}:${choice.id}`)!.add(stateKey(source));
      } else {
        edges.push({ choiceId: choice.id, source, target: result.state });
      }
    }
  }

  const completed = new Set(edges.filter(edge => edge.target.status === "completed").map(edge => stateKey(edge.target)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (completed.has(stateKey(edge.target)) && !completed.has(stateKey(edge.source))) {
        completed.add(stateKey(edge.source));
        changed = true;
      }
    }
  }

  const completionOrFailure = new Set(completed);
  for (const seed of failureSets.values()) for (const key of seed) completionOrFailure.add(key);
  changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (completionOrFailure.has(stateKey(edge.target)) && !completionOrFailure.has(stateKey(edge.source))) {
        completionOrFailure.add(stateKey(edge.source));
        changed = true;
      }
    }
  }
  return Object.freeze({
    edges: Object.freeze(edges),
    completionPlaying: new Set([...completed].filter(key => PLAYING_KEYS.has(key))),
    completionOrFailurePlaying: new Set([...completionOrFailure].filter(key => PLAYING_KEYS.has(key))),
    failureSeeds: new Map([...failureSets].map(([id, values]) => [id, new Set(values)])),
  });
}

const ORACLE = oracleAnalysis();

function closure(model: SymbolicModel, seed: number, limit = 32): number {
  let root = seed;
  for (let round = 0; round < limit; round += 1) {
    const next = model.bdd.or(root, model.preimage(root));
    if (next === root) return root;
    root = next;
  }
  throw new Error("independent certificate fixture fixed point did not close");
}

interface FailureRoot {
  readonly id: string;
  readonly kind: FailureKind;
  readonly choiceId: string;
  readonly seedZero: boolean;
  readonly root: number;
}

function failureRoots(model: SymbolicModel): readonly FailureRoot[] {
  const bdd = model.bdd;
  const invalidDomain = bdd.not(model.validDomain);
  const roots: FailureRoot[] = [];
  for (const choice of model.choices) {
    const faults = bdd.or(choice.arithmeticError, choice.boundExit);
    const validSources = model.preimage(model.validDomain, choice);
    const invalidSources = model.preimage(invalidDomain, choice);
    const uncovered = bdd.and(choice.enabled, bdd.not(bdd.or(faults, validSources)));
    const values: readonly [FailureKind, number][] = [
      ["arithmetic-error", choice.arithmeticError],
      ["bound-exit", choice.boundExit],
      ["invalid-success", invalidSources],
      ["uncovered-enabled", uncovered],
    ];
    for (const [kind, root] of values) {
      roots.push({ id: `${kind}:${choice.id}`, kind, choiceId: choice.id, seedZero: root === 0, root });
    }
  }
  return Object.freeze(roots);
}

interface PreparedCertificate {
  readonly model: SymbolicModel;
  readonly certificate: {
    readonly schema: typeof FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA;
    readonly descriptor: ReturnType<typeof certificateDescriptor>;
    readonly sceneForests: readonly { readonly sceneId: string; readonly forestId: string }[];
    readonly failureForests: readonly { readonly seedId: string; readonly forestId: string }[];
  };
  readonly forests: ReadonlyMap<string, unknown>;
  readonly failureRoots: readonly FailureRoot[];
  readonly completable: number;
  readonly completionOrFailure: number;
}

function prepareCertificate(model: SymbolicModel): PreparedCertificate {
  const bdd = model.bdd;
  const seeds = failureRoots(model);
  const failureUnion = seeds.reduce((root, seed) => bdd.or(root, seed.root), 0);
  const completable = closure(model, model.completed);
  const completionOrFailure = closure(model, bdd.or(completable, failureUnion));
  const forests = new Map<string, unknown>();
  const sceneForests = model.scenario.scenes.map(scene => {
    const sceneSeed = bdd.and(model.playing, bdd.and(model.atScene(scene.id), bdd.not(completionOrFailure)));
    const forestId = `scene-cone:${scene.id}`;
    forests.set(forestId, bdd.exportForest([closure(model, sceneSeed)]));
    return Object.freeze({ sceneId: scene.id, forestId });
  });
  const failureForests = seeds.map(seed => {
    const forestId = `failure-cone:${seed.id}`;
    forests.set(forestId, bdd.exportForest([closure(model, seed.root)]));
    return Object.freeze({ seedId: seed.id, forestId });
  });
  return {
    model,
    certificate: {
      schema: FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA,
      descriptor: certificateDescriptor(model),
      sceneForests: Object.freeze(sceneForests),
      failureForests: Object.freeze(failureForests),
    },
    forests,
    failureRoots: seeds,
    completable,
    completionOrFailure,
  };
}

function load(prepared: PreparedCertificate): (id: string) => unknown {
  return id => {
    const forest = prepared.forests.get(id);
    if (forest === undefined) throw new Error(`missing fixture forest ${id}`);
    return forest;
  };
}

function hasProgressPhase(progress: readonly unknown[], phase: string): boolean {
  return progress.some(value => value !== null
    && typeof value === "object"
    && (value as { readonly phase?: unknown }).phase === phase);
}

function memberKeys(model: SymbolicModel, root: number, states: readonly SemanticState[]): readonly string[] {
  return states.filter(state => model.bdd.and(root, model.encode(state)) !== 0).map(stateKey).sort();
}

function assertSetMatchesOracle(model: SymbolicModel, root: number, expected: ReadonlySet<string>, label: string): void {
  assert.deepEqual(memberKeys(model, root, PLAYING_STATES), [...expected].sort(), label);
}

function cloneCertificate(prepared: PreparedCertificate): {
  schema: typeof FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA;
  descriptor: ReturnType<typeof certificateDescriptor>;
  sceneForests: { sceneId: string; forestId: string }[];
  failureForests: { seedId: string; forestId: string }[];
} {
  return {
    schema: prepared.certificate.schema,
    descriptor: prepared.certificate.descriptor,
    sceneForests: prepared.certificate.sceneForests.map(value => ({ ...value })),
    failureForests: prepared.certificate.failureForests.map(value => ({ ...value })),
  };
}

function replaceForest(prepared: PreparedCertificate, forestId: string, forest: unknown): ReadonlyMap<string, unknown> {
  const result = new Map(prepared.forests);
  result.set(forestId, forest);
  return result;
}

function modelFor(order: "interleaved" | "blocked", customFields: boolean): SymbolicModel {
  return new SymbolicModel(RAW_SCENARIO, BOUNDS, {
    order,
    transitionMode: "relational",
    fieldOrder: customFields ? [...DEFAULT_FIELDS].reverse() : undefined,
    nodeLimit: 20_000,
    cacheLimit: 1,
  });
}

test("factorized certificates independently verify C/W and every ordered forest", () => {
  assert.deepEqual([...ORACLE.failureSeeds.get("bound-exit:fail-bound")!], [stateKey(playingState("unsafe", 1))]);
  assert.deepEqual([...ORACLE.failureSeeds.get("arithmetic-error:fail-arithmetic")!], [stateKey(playingState("unsafe", 1))]);
  assert.ok(ORACLE.completionPlaying.has(stateKey(playingState("start", 1))));
  assert.equal(ORACLE.completionPlaying.has(stateKey(playingState("dead", 0))), false);
  assert.equal(ORACLE.completionOrFailurePlaying.has(stateKey(playingState("unsafe", 0))), false);

  for (const order of ["interleaved", "blocked"] as const) {
    for (const customFields of [false, true]) {
      const model = modelFor(order, customFields);
      const prepared = prepareCertificate(model);
      const progress: unknown[] = [];
      const result = verifyFactorizedSymbolicCertificate(model, prepared.certificate, load(prepared), {
        roundLimit: 32,
        completionCompactEvery: 1,
        coneCompactAt: 1,
        onProgress: value => progress.push(value),
      });

      assert.equal(result.complete, true);
      assert.deepEqual(result.sceneIds, RAW_SCENARIO.scenes.map(scene => scene.id));
      assert.equal(result.checkedSceneForests, RAW_SCENARIO.scenes.length);
      assert.equal(result.checkedFailureForests, RAW_SCENARIO.choices.length * FAILURE_KINDS.length);
      assert.ok(result.completionRounds >= 1);
      assert.ok(result.completionOrFailureRounds >= 1);
      assert.ok(progress.length > 0, `${order}/${customFields ? "custom" : "default"} reports progress`);
      assert.ok(hasProgressPhase(progress, "cone-compact"), `${order}/${customFields ? "custom" : "default"} reports cone compaction`);
      assertSetMatchesOracle(result.model, result.completable, ORACLE.completionPlaying, `${order} C matches raw oracle`);
      assertSetMatchesOracle(result.model, result.completionOrFailure, ORACLE.completionOrFailurePlaying, `${order} W matches raw oracle`);

      for (const seed of prepared.failureRoots) {
        const rawSet = ORACLE.failureSeeds.get(seed.id);
        assert.ok(rawSet, `${order} has an independent raw set for ${seed.id}`);
        assert.deepEqual(
          memberKeys(model, seed.root, PLAYING_STATES),
          [...rawSet].sort(),
          `${order}/${customFields ? "custom" : "default"} ${seed.id} matches the raw failure seed set`,
        );
        assert.equal(seed.seedZero, rawSet.size === 0, `${order} ${seed.id} zero metadata is derived from the raw set`);
      }
      const expectedFailureMetadata = prepared.failureRoots.map(seed => ({
        id: seed.id,
        kind: seed.kind,
        choiceId: seed.choiceId,
        seedZero: ORACLE.failureSeeds.get(seed.id)!.size === 0,
      }));
      assert.ok(expectedFailureMetadata.some(seed => seed.seedZero), `${order} includes mandatory zero-seed metadata`);
      assert.deepEqual(result.failureSeeds, expectedFailureMetadata, `${order} regenerates zero/nonzero seed metadata in authored order`);
    }
  }
});

test("factorized certificate structure and cones reject tampering, limits, and foreign data", () => {
  const model = modelFor("blocked", true);
  const prepared = prepareCertificate(model);
  const valid = cloneCertificate(prepared);

  const missingScene = cloneCertificate(prepared);
  missingScene.sceneForests.pop();
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, missingScene, load(prepared)),
    /sceneForests|authored scenes/i,
    "missing scene forest is rejected",
  );

  const reorderedScene = cloneCertificate(prepared);
  [reorderedScene.sceneForests[0]!, reorderedScene.sceneForests[1]!] = [reorderedScene.sceneForests[1]!, reorderedScene.sceneForests[0]!];
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, reorderedScene, load(prepared)),
    /sceneForests|scenario order/i,
    "reordered scene forest is rejected",
  );

  const missingFailure = cloneCertificate(prepared);
  missingFailure.failureForests.pop();
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, missingFailure, load(prepared)),
    /failureForests|failure seeds/i,
    "missing failure seed forest is rejected",
  );

  const reorderedFailure = cloneCertificate(prepared);
  [reorderedFailure.failureForests[0]!, reorderedFailure.failureForests[1]!] = [reorderedFailure.failureForests[1]!, reorderedFailure.failureForests[0]!];
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, reorderedFailure, load(prepared)),
    /failureForests|authored choice|order/i,
    "reordered failure seed forest is rejected",
  );

  const duplicateFailure = cloneCertificate(prepared);
  duplicateFailure.failureForests[1]!.seedId = duplicateFailure.failureForests[0]!.seedId;
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, duplicateFailure, load(prepared)),
    /failureForests|seed|order|duplicate/i,
    "duplicate failure seed metadata is rejected",
  );

  const descriptorMismatch = cloneCertificate(prepared);
  descriptorMismatch.descriptor = {
    ...descriptorMismatch.descriptor,
    order: descriptorMismatch.descriptor.order === "blocked" ? "interleaved" : "blocked",
  };
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, descriptorMismatch, load(prepared)),
    /descriptor/i,
    "descriptor mismatch is rejected before loading forests",
  );

  const deadScene = valid.sceneForests.find(value => value.sceneId === "dead")!;
  const shrunkenScene = cloneCertificate(prepared);
  const zeroSceneForests = replaceForest(prepared, deadScene.forestId, model.bdd.exportForest([0]));
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, shrunkenScene, id => zeroSceneForests.get(id)),
    /scene|cone|superset|forest/i,
    "a shrunken scene cone is rejected",
  );

  const boundSeed = prepared.failureRoots.find(seed => seed.id === "bound-exit:fail-bound")!;
  const boundFailure = valid.failureForests.find(value => value.seedId === boundSeed.id)!;
  const nonClosedFailure = cloneCertificate(prepared);
  const nonClosedForests = replaceForest(prepared, boundFailure.forestId, model.bdd.exportForest([boundSeed.root]));
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, nonClosedFailure, id => nonClosedForests.get(id)),
    /closed|predecessor/i,
    "a failure cone containing only its seed is rejected as non-closed",
  );

  const zeroedNonzeroFailure = cloneCertificate(prepared);
  const zeroedNonzeroForests = replaceForest(prepared, boundFailure.forestId, model.bdd.exportForest([0]));
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, zeroedNonzeroFailure, id => zeroedNonzeroForests.get(id)),
    /seed|superset|cone|failure/i,
    "a nonzero failure seed cannot be covered by a zeroed component",
  );

  const nextVariableFailure = cloneCertificate(prepared);
  const nextVariableForests = replaceForest(
    prepared,
    boundFailure.forestId,
    model.bdd.exportForest([model.bdd.variable(model.nextVariables[0]!)]),
  );
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, nextVariableFailure, id => nextVariableForests.get(id)),
    /current-only/i,
    "a next-variable cone is rejected",
  );

  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, valid, () => model.bdd.variable(model.currentVariables[0]!)),
    /forest/i,
    "a numeric handle from the wrong ownership boundary is rejected",
  );
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, valid, load(prepared), { roundLimit: 1 }),
    /round limit/i,
    "an insufficient completion round limit is rejected",
  );
  const duplicateCatalogForest = cloneCertificate(prepared);
  duplicateCatalogForest.failureForests[0]!.forestId = duplicateCatalogForest.sceneForests[0]!.forestId;
  assert.throws(
    () => verifyFactorizedSymbolicCertificate(model, duplicateCatalogForest, load(prepared)),
    /forest IDs|unique|duplicate/i,
    "forest IDs must be unique across scene and failure catalogs",
  );
  for (const completionCompactEvery of [-1, 1.5, Number.NaN] as const) {
    assert.throws(
      () => verifyFactorizedSymbolicCertificate(model, valid, load(prepared), { completionCompactEvery }),
      /completionCompactEvery|compact/i,
      `invalid completion compaction interval ${String(completionCompactEvery)} is rejected`,
    );
  }
  for (const coneCompactAt of [-1, 1.5, Number.NaN] as const) {
    assert.throws(
      () => verifyFactorizedSymbolicCertificate(model, valid, load(prepared), { coneCompactAt }),
      /coneCompactAt|compact/i,
      `invalid cone compaction threshold ${String(coneCompactAt)} is rejected`,
    );
  }
  const noConeCompactionProgress: unknown[] = [];
  verifyFactorizedSymbolicCertificate(model, valid, load(prepared), {
    roundLimit: 32,
    coneCompactAt: 0,
    onProgress: value => noConeCompactionProgress.push(value),
  });
  assert.equal(hasProgressPhase(noConeCompactionProgress, "cone-compact"), false, "zero disables cone owner copying");

  for (const initialScene of ["bridge", "dead"] as const) {
    const invalidInitialModel = new SymbolicModel(
      { ...RAW_SCENARIO, initialScene },
      BOUNDS,
      {
        order: "blocked",
        transitionMode: "relational",
        fieldOrder: [...DEFAULT_FIELDS].reverse(),
        nodeLimit: 20_000,
        cacheLimit: 1,
      },
    );
    const invalidInitial = prepareCertificate(invalidInitialModel);
    assert.throws(
      () => verifyFactorizedSymbolicCertificate(invalidInitialModel, invalidInitial.certificate, load(invalidInitial)),
      /initial|cone|failure|scene/i,
      `initial scene ${initialScene} is rejected when it reaches a bad cone`,
    );
  }
});
