import { PackedModel, type PackedChoice } from "./packed-model.js";

const NONE = 0xffff_ffff;
const CHUNK_SIZE = 16_384;

/** Private, append-only storage avoids resizing and copying a large edge array. */
class Words {
  private readonly chunks: Uint32Array[] = [];
  length = 0;

  push(value: number): number {
    if (!Number.isSafeInteger(value) || value < 0 || value > NONE || this.length >= NONE) {
      throw new Error("Packed graph exceeds uint32 storage");
    }
    const index = this.length;
    if (index % CHUNK_SIZE === 0) this.chunks.push(new Uint32Array(CHUNK_SIZE));
    this.chunks[Math.floor(index / CHUNK_SIZE)]![index % CHUNK_SIZE] = value;
    this.length++;
    return index;
  }

  get(index: number): number {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.length) throw new Error("Invalid packed graph index");
    return this.chunks[Math.floor(index / CHUNK_SIZE)]![index % CHUNK_SIZE]!;
  }

  set(index: number, value: number): void {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.length
      || !Number.isSafeInteger(value) || value < 0 || value > NONE) throw new Error("Invalid packed graph write");
    this.chunks[Math.floor(index / CHUNK_SIZE)]![index % CHUNK_SIZE] = value;
  }
}

export interface PackedReachabilityOptions {
  readonly stateLimit?: number;
  readonly edgeLimit?: number;
}

export interface PackedProgress {
  readonly phase: "forward" | "backward" | "witnesses";
  readonly visited: number;
  readonly discovered: number;
  readonly transitions: number;
  readonly depth: number;
}

export class PackedGraphLimitError extends Error {
  constructor(readonly kind: "state" | "edge", readonly limit: number) {
    super(`Packed ${kind} limit ${limit} reached; coverage incomplete`);
    this.name = "PackedGraphLimitError";
  }
}

export class PackedReachabilityError extends Error {
  readonly reason = "arithmetic-error" as const;

  constructor(
    readonly choiceId: string,
    readonly effectIndex: number,
    readonly resource: string,
    readonly path: readonly string[],
  ) {
    super(`Packed arithmetic error is reachable through ${choiceId}`);
    this.name = "PackedReachabilityError";
  }
}

export interface PackedReachability {
  readonly exhaustive: true;
  readonly model: PackedModel;
  readonly states: readonly bigint[];
  /** Half-open ranges of state IDs at successive shortest-path distances. */
  readonly frontiers: readonly (readonly [number, number])[];
  readonly stateCount: number;
  readonly transitionCount: number;
  readonly completableCount: number;
  readonly deadEndCount: number;
  readonly noCompletionCount: number;
  readonly unreachableScenes: readonly string[];
  readonly unreachableChoices: readonly string[];
  readonly sceneWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly choiceWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly endingWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly deadEndWitness?: readonly string[];
  readonly noCompletionWitness?: readonly string[];
  readonly isReachable: (code: bigint) => boolean;
  readonly isCompletable: (code: bigint) => boolean;
  readonly isDeadEnd: (code: bigint) => boolean;
  readonly isNoCompletion: (code: bigint) => boolean;
}

function checkedLimit(value: unknown, fallback: number, name: string): number {
  const result = value === undefined ? fallback : value;
  if (typeof result !== "number" || !Number.isSafeInteger(result) || result < 1 || result > NONE) {
    throw new Error(`Invalid packed ${name} limit`);
  }
  return result;
}

/**
 * Exhaust the exact authored-choice control graph, retaining every legal
 * authored edge. The separate global end() operation keeps its existing
 * focused engine coverage. Metadata outside the packed tuple still requires
 * actual-engine witness replay. A thrown observer or resource guard never
 * returns partial coverage as success.
 */
export function packedReachability(
  model: PackedModel,
  options: PackedReachabilityOptions = {},
  onProgress?: (progress: PackedProgress) => void,
): PackedReachability {
  if (!(model instanceof PackedModel)) throw new Error("Expected a packed model");
  if (options === null || typeof options !== "object" || Array.isArray(options)) throw new Error("Invalid packed reachability options");
  const stateLimit = checkedLimit(options.stateLimit, 250_000, "state");
  const edgeLimit = checkedLimit(options.edgeLimit, 1_000_000, "edge");
  if (onProgress !== undefined && typeof onProgress !== "function") throw new Error("Invalid packed progress observer");

  const codes = [model.initial];
  const indices = new Map<bigint, number>([[model.initial, 0]]);
  const parents = new Words(), parentChoices = new Words(), heads = new Words();
  // Reverse edges prove completion reachability; they do not reconstruct a
  // completion path for each state. Authored witness paths use parent choices.
  const edgeSources = new Words(), edgeNext = new Words();
  // 0: playing; 1: completed; 2: departed/dead; 3: playing without legal exits.
  const kinds = new Words();
  parents.push(NONE); parentChoices.push(NONE); heads.push(NONE);
  const choiceIndices = new Map<PackedChoice, number>(model.choices.map((choice, index) => [choice, index]));
  const sceneSources = new Map<string, number>();
  const choiceSources = new Map<string, number>();
  const frontiers: (readonly [number, number])[] = [];
  let visited = 0, depth = 0;

  function progress(phase: PackedProgress["phase"]): void {
    onProgress?.(Object.freeze({ phase, visited, discovered: codes.length, transitions: edgeSources.length, depth }));
  }

  function pathTo(index: number): readonly string[] {
    const reversed: string[] = [];
    let cursor = index;
    while (cursor !== 0) {
      const parent = parents.get(cursor);
      const choice = model.choices[parentChoices.get(cursor)];
      // BFS parents always precede children. This also prevents malformed
      // internal links from creating an infinite witness loop.
      if (parent >= cursor || choice === undefined) throw new Error("Invalid packed witness parent");
      reversed.push(choice.id);
      cursor = parent;
    }
    return Object.freeze(reversed.reverse());
  }

  let start = 0, end = 1;
  while (start < end) {
    frontiers.push(Object.freeze([start, end] as const));
    progress("forward");
    for (let source = start; source < end; source++) {
      const code = codes[source]!;
      const location = model.location(code);
      if (!sceneSources.has(location.scene)) sceneSources.set(location.scene, source);
      let legal = 0;
      for (const choice of model.choicesAt(code)) {
        const transition = model.transition(code, choice);
        if (transition.kind === "disabled") continue;
        if (transition.kind === "fault") {
          throw new PackedReachabilityError(choice.id, transition.effectIndex, transition.resource,
            Object.freeze([...pathTo(source), choice.id]));
        }
        if (edgeSources.length >= edgeLimit) throw new PackedGraphLimitError("edge", edgeLimit);
        legal++;
        // Capture every authored choice before interning its successor. Two
        // choices may reach the same tuple and still need distinct witnesses.
        if (!choiceSources.has(choice.id)) choiceSources.set(choice.id, source);
        let target = indices.get(transition.state);
        if (target === undefined) {
          if (codes.length >= stateLimit) throw new PackedGraphLimitError("state", stateLimit);
          target = codes.length;
          codes.push(transition.state);
          indices.set(transition.state, target);
          parents.push(source);
          const choiceIndex = choiceIndices.get(choice);
          if (choiceIndex === undefined) throw new Error("Foreign packed choice in traversal");
          parentChoices.push(choiceIndex);
          heads.push(NONE);
        }
        const edge = edgeSources.push(source);
        edgeNext.push(heads.get(target));
        heads.set(target, edge);
      }
      kinds.push(location.status === "completed" ? 1
        : location.status !== "playing" ? 2 : legal === 0 ? 3 : 0);
      visited++;
      if (visited % CHUNK_SIZE === 0) progress("forward");
    }
    start = end;
    end = codes.length;
    depth++;
  }
  if (kinds.length !== codes.length || visited !== codes.length) throw new Error("Incomplete packed forward traversal");

  const completable = new Uint8Array(codes.length);
  const queue = new Uint32Array(codes.length);
  let queueEnd = 0;
  for (let id = 0; id < codes.length; id++) {
    if (kinds.get(id) === 1) { completable[id] = 1; queue[queueEnd++] = id; }
  }
  progress("backward");
  for (let offset = 0; offset < queueEnd; offset++) {
    for (let edge = heads.get(queue[offset]!); edge !== NONE; edge = edgeNext.get(edge)) {
      const predecessor = edgeSources.get(edge);
      if (completable[predecessor] === 1) continue;
      completable[predecessor] = 1;
      queue[queueEnd++] = predecessor;
    }
    if ((offset + 1) % CHUNK_SIZE === 0) progress("backward");
  }

  let deadEndCount = 0, noCompletionCount = 0;
  let firstDeadEnd: number | undefined, firstNoCompletion: number | undefined;
  for (let id = 0; id < codes.length; id++) {
    const kind = kinds.get(id);
    if (kind === 3) { deadEndCount++; firstDeadEnd ??= id; }
    if ((kind === 0 || kind === 3) && completable[id] !== 1) { noCompletionCount++; firstNoCompletion ??= id; }
  }

  progress("witnesses");
  const sceneWitnesses: Record<string, readonly string[]> = Object.create(null);
  const choiceWitnesses: Record<string, readonly string[]> = Object.create(null);
  const endingWitnesses: Record<string, readonly string[]> = Object.create(null);
  const unreachableScenes: string[] = [], unreachableChoices: string[] = [];
  for (const scene of model.scenes) {
    const source = sceneSources.get(scene);
    if (source === undefined) unreachableScenes.push(scene);
    else sceneWitnesses[scene] = pathTo(source);
  }
  for (const choice of model.choices) {
    const source = choiceSources.get(choice.id);
    if (source === undefined) { unreachableChoices.push(choice.id); continue; }
    const path = Object.freeze([...pathTo(source), choice.id]);
    choiceWitnesses[choice.id] = path;
    if (choice.terminal) endingWitnesses[choice.id] = path;
  }

  // These are set-membership predicates. Unknown codes are absent from every
  // result set; isReachable distinguishes absence from a reached negative case.
  const isReachable = (code: bigint): boolean => indices.has(code);
  const isCompletable = (code: bigint): boolean => {
    const id = indices.get(code);
    return id !== undefined && completable[id] === 1;
  };
  const isDeadEnd = (code: bigint): boolean => {
    const id = indices.get(code);
    return id !== undefined && kinds.get(id) === 3;
  };
  const isNoCompletion = (code: bigint): boolean => {
    const id = indices.get(code);
    return id !== undefined && (kinds.get(id) === 0 || kinds.get(id) === 3) && completable[id] !== 1;
  };
  return Object.freeze({ exhaustive: true, model, states: Object.freeze(codes),
    frontiers: Object.freeze(frontiers), stateCount: codes.length, transitionCount: edgeSources.length,
    completableCount: queueEnd, deadEndCount, noCompletionCount,
    unreachableScenes: Object.freeze(unreachableScenes), unreachableChoices: Object.freeze(unreachableChoices),
    sceneWitnesses: Object.freeze(sceneWitnesses), choiceWitnesses: Object.freeze(choiceWitnesses),
    endingWitnesses: Object.freeze(endingWitnesses),
    ...(firstDeadEnd === undefined ? {} : { deadEndWitness: pathTo(firstDeadEnd) }),
    ...(firstNoCompletion === undefined ? {} : { noCompletionWitness: pathTo(firstNoCompletion) }),
    isReachable, isCompletable, isDeadEnd, isNoCompletion,
  });
}
