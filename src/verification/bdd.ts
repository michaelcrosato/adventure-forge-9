/**
 * A small, exact, reduced ordered binary decision diagram (ROBDD) manager.
 *
 * Handles 0 and 1 are the false and true terminals.  Non-terminal handles are
 * private table indexes; nodes are immutable after insertion, so a handle
 * remains valid for the lifetime of its manager.  Variables use the fixed
 * order 0 < 1 < ... < variableCount - 1.
 *
 * This module is an isolated symbolic-reachability experiment.  It does not
 * implement game transitions and is deliberately independent of the engine.
 */

export interface BddOptions {
  /** Maximum number of non-terminal nodes. Omit for no explicit node limit. */
  readonly nodeLimit?: number;
  /** Maximum number of memoized operation results. Zero disables memoization. */
  readonly cacheLimit?: number;
}

export interface BddStats {
  /** Includes the two terminal nodes. */
  readonly nodes: number;
  /** Number of entries in the unique table (non-terminal nodes). */
  readonly uniqueEntries: number;
  /** Number of currently retained memoized operation results. */
  readonly operationCacheEntries: number;
}

/** A versioned, manager-independent dense representation of a BDD forest. */
export interface BddForest {
  readonly schema: "af9-bdd-forest-v1";
  readonly variableCount: number;
  readonly roots: readonly number[];
  readonly nodes: readonly (readonly [variable: number, low: number, high: number])[];
}

/** Thrown when an exact operation cannot stay within its configured budget. */
export class BddLimitError extends Error {
  public readonly code = "BDD_LIMIT";

  public constructor(message: string) {
    super(message);
    this.name = "BddLimitError";
  }
}

type Handle = number;
type BinaryOperation = "and" | "or" | "xor";

interface Node {
  readonly variable: number;
  readonly low: Handle;
  readonly high: Handle;
}

interface OperationCacheEntry {
  readonly key: string;
  value: Handle;
  older: OperationCacheEntry | undefined;
  newer: OperationCacheEntry | undefined;
}

const FALSE: Handle = 0;
const TRUE: Handle = 1;
const TERMINAL_VARIABLE = -1;
const INFINITE_LEVEL = Number.POSITIVE_INFINITY;
const BDD_FOREST_SCHEMA = "af9-bdd-forest-v1" as const;

/**
 * Exact ROBDD operations under one immutable variable order.
 *
 * The node limit is applied to non-terminal nodes; the two terminal handles
 * are always available.  A full node table is never truncated.  Cache entries
 * may be evicted when cacheLimit is reached because eviction cannot alter a
 * result; the node table and all returned Boolean functions remain exact.
 */
export class Bdd {
  private readonly variableCount: number;
  private readonly nodeLimit: number;
  private readonly cacheLimit: number;
  // Handles 0 and 1 are reserved for the terminals. Handle 2 is kept
  // invalid so callers cannot mistake a first internal table slot for a
  // terminal or an arbitrary external handle. Internal handles start at 3.
  private readonly nodes: Node[] = [];
  private readonly unique = new Map<string, Handle>();
  private readonly operationCache = new Map<string, OperationCacheEntry>();
  private oldestCacheEntry: OperationCacheEntry | undefined;
  private newestCacheEntry: OperationCacheEntry | undefined;
  private readonly literalCache = new Map<number, Handle>();

  public constructor(variableCount: number, options: BddOptions = {}) {
    this.variableCount = this.assertNonNegativeSafeInteger(variableCount, "variableCount");
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new TypeError("options must be an object");
    }
    this.nodeLimit = this.optionalLimit(options.nodeLimit, "nodeLimit", Number.POSITIVE_INFINITY);
    this.cacheLimit = this.optionalLimit(options.cacheLimit, "cacheLimit", Number.POSITIVE_INFINITY);
  }

  /** Return the Boolean variable at the requested ordered index. */
  public variable(index: number): Handle {
    this.assertVariable(index);
    const cached = this.literalCache.get(index);
    if (cached !== undefined) return cached;
    const result = this.makeNode(index, FALSE, TRUE);
    this.literalCache.set(index, result);
    return result;
  }

  public not(root: Handle): Handle {
    this.assertHandle(root);
    return this.notInternal(root);
  }

  public and(left: Handle, right: Handle): Handle {
    return this.binary("and", left, right);
  }

  /**
   * Conjoin two functions and existentially quantify the supplied variables
   * in one Shannon recursion.  Quantified levels combine their two cofactors
   * with OR immediately, so the unquantified conjunction is never built as a
   * separate full relation.
   */
  public andExists(left: Handle, right: Handle, variables: Iterable<number>): Handle {
    this.assertHandle(left);
    this.assertHandle(right);
    const ordered = this.normalizeVariableSet(variables, "variables");
    return this.andExistsInternal(left, right, new Set(ordered), ordered.join(","));
  }

  public or(left: Handle, right: Handle): Handle {
    return this.binary("or", left, right);
  }

  public xor(left: Handle, right: Handle): Handle {
    return this.binary("xor", left, right);
  }

  /**
   * Shannon ITE: (condition ? thenRoot : elseRoot).
   * The recursion follows the manager's order and therefore remains reduced.
   */
  public ite(condition: Handle, thenRoot: Handle, elseRoot: Handle): Handle {
    this.assertHandle(condition);
    this.assertHandle(thenRoot);
    this.assertHandle(elseRoot);
    return this.iteInternal(condition, thenRoot, elseRoot);
  }

  /** Existentially quantify every variable supplied by the iterable. */
  public exists(root: Handle, variables: Iterable<number>): Handle {
    this.assertHandle(root);
    const ordered = this.normalizeVariableSet(variables, "variables");
    if (ordered.length === 0 || root < 2) return root;
    const quantifiedKey = ordered.join(",");
    const key = `exists:${root}:${quantifiedKey}`;
    const cached = this.cacheGet(key);
    if (cached !== undefined) return cached;
    const quantified = new Set(ordered);
    const result = this.existsInternal(root, quantified, quantifiedKey);
    this.cacheSet(key, result);
    return result;
  }

  /**
   * Simultaneously substitute variables. Variables absent from the map are
   * unchanged. The implementation uses ITE reconstruction, so swaps,
   * arbitrary reordering, and multiple source variables mapped to one target
   * are handled without enumerating assignments.
   */
  public rename(root: Handle, mapping: ReadonlyMap<number, number>): Handle {
    this.assertHandle(root);
    const normalized = this.normalizeMapping(mapping);
    if (normalized.length === 0 || root < 2) return root;
    const mappingKey = normalized.map(([from, to]) => `${from}>${to}`).join(",");
    const publicKey = `rename:${root}:${mappingKey}`;
    const cached = this.cacheGet(publicKey);
    if (cached !== undefined) return cached;

    const substitutions = new Map(normalized);
    const localMemo = new Map<Handle, Handle>();
    const result = this.renameInternal(root, substitutions, mappingKey, localMemo);
    this.cacheSet(publicKey, result);
    return result;
  }

  /** Return one satisfying assignment, preferring false branches. */
  public satisfyingAssignment(root: Handle): readonly boolean[] | undefined {
    this.assertHandle(root);
    if (root === FALSE) return undefined;
    const assignment = Array<boolean>(this.variableCount).fill(false);
    this.fillSatisfyingAssignment(root, assignment);
    return Object.freeze(assignment);
  }

  /** Evaluate a handle under a complete assignment. */
  public evaluate(root: Handle, assignment: readonly boolean[]): boolean {
    this.assertHandle(root);
    this.assertAssignment(assignment);
    let current = root;
    while (current >= 2) {
      const node = this.nodeAt(current);
      current = assignment[node.variable] ? node.high : node.low;
    }
    return current === TRUE;
  }

  /**
   * Count satisfying assignments over exactly the supplied sorted variables.
   * Variables outside the root's support are counted as free dimensions;
   * omitting a variable used by the root is rejected.
   */
  public count(root: Handle, variables: readonly number[]): bigint {
    this.assertHandle(root);
    const ordered = this.normalizeVariableArray(variables, "variables");
    if (root === FALSE) return 0n;
    const ranks = new Map<number, number>(ordered.map((variable, rank) => [variable, rank]));
    // A reduced diagram can reach one suffix node from exponentially many
    // paths.  The rank is part of the key because skipped selected variables
    // contribute different free-assignment factors at different entry points.
    const memo = new Map<string, bigint>();
    return this.countInternal(root, 0, ordered.length, ranks, memo);
  }

  /** Drop memoized operation results while preserving canonical nodes. */
  public clearOperationCaches(): void {
    this.operationCache.clear();
    this.oldestCacheEntry = undefined;
    this.newestCacheEntry = undefined;
  }

  /** Return an immutable snapshot of manager sizes. */
  public stats(): BddStats {
    return Object.freeze({
      nodes: this.nodes.length + 2,
      uniqueEntries: this.unique.size,
      operationCacheEntries: this.operationCache.size,
    });
  }

  /**
   * Export the reachable shared DAG for the supplied roots.
   *
   * Wire handles are dense and manager-independent: 0 and 1 are terminals,
   * while node i is represented by wire handle 2 + i.  Nodes are emitted in
   * postorder, so both children always have smaller wire handles.  Exporting
   * only reads immutable BDD nodes and does not warm or clear any cache.
   */
  public exportForest(roots: readonly number[]): BddForest {
    const rawRoots = this.snapshotForestArray(roots, "roots");
    const snapshot = rawRoots.map((root, index) => this.readForestSafeInteger(root, `roots[${index}]`));
    for (const root of snapshot) this.assertHandle(root);

    const wireByHandle = new Map<Handle, number>([
      [FALSE, FALSE],
      [TRUE, TRUE],
    ]);
    const nodes: Array<readonly [number, number, number]> = [];
    const visit = (root: Handle): number => {
      const existing = wireByHandle.get(root);
      if (existing !== undefined) return existing;
      const stack: Array<{ handle: Handle; child: 0 | 1 | 2 }> = [{ handle: root, child: 0 }];
      while (stack.length > 0) {
        const frame = stack[stack.length - 1]!;
        const mapped = wireByHandle.get(frame.handle);
        if (mapped !== undefined) {
          stack.pop();
          continue;
        }
        const node = this.nodeAt(frame.handle);
        if (frame.child === 0) {
          frame.child = 1;
          if (wireByHandle.get(node.low) === undefined) stack.push({ handle: node.low, child: 0 });
          continue;
        }
        if (frame.child === 1) {
          frame.child = 2;
          if (wireByHandle.get(node.high) === undefined) stack.push({ handle: node.high, child: 0 });
          continue;
        }
        const low = wireByHandle.get(node.low);
        const high = wireByHandle.get(node.high);
        if (low === undefined || high === undefined) throw new Error("BDD forest export order error");
        const wire = nodes.length + 2;
        nodes.push(Object.freeze([node.variable, low, high] as const));
        wireByHandle.set(frame.handle, wire);
        stack.pop();
      }
      const result = wireByHandle.get(root);
      if (result === undefined) throw new Error("BDD forest export root error");
      return result;
    };

    const wireRoots = Object.freeze(snapshot.map(root => visit(root)));
    const wireNodes = Object.freeze(nodes);
    return Object.freeze({
      schema: BDD_FOREST_SCHEMA,
      variableCount: this.variableCount,
      roots: wireRoots,
      nodes: wireNodes,
    });
  }

  /**
   * Import a validated manager-independent forest into this BDD.
   *
   * The complete input is snapshotted and validated before makeNode is called.
   * A target node limit can therefore leave an already-partially-canonicalized
   * target when it fails; callers needing all-or-nothing ownership should use
   * a disposable target.  Invalid input never mutates this manager.
   */
  public importForest(input: unknown): readonly number[] {
    const record = this.snapshotForestRecord(input);
    const schema = this.readForestData(record, "schema");
    if (schema !== BDD_FOREST_SCHEMA) throw new TypeError("forest schema is unsupported");
    const variableCount = this.readForestSafeInteger(this.readForestData(record, "variableCount"), "forest.variableCount");
    if (variableCount !== this.variableCount) throw new RangeError("forest variable count does not match this BDD");

    const nodesInput = this.readForestData(record, "nodes");
    const nodeCount = this.forestArrayLength(nodesInput, "forest.nodes");
    if (nodeCount > this.nodeLimit) {
      throw new BddLimitError(`BDD forest contains ${nodeCount} nodes but the target limit is ${this.nodeLimit}`);
    }
    const rawRoots = this.snapshotForestArray(this.readForestData(record, "roots"), "forest.roots");
    const rawNodes = this.snapshotForestArray(nodesInput, "forest.nodes");

    const nodes: Array<readonly [number, number, number]> = [];
    const triples = new Set<string>();
    for (let index = 0; index < rawNodes.length; index += 1) {
      const tuple = this.snapshotForestArray(rawNodes[index], `forest.nodes[${index}]`);
      if (tuple.length !== 3) throw new TypeError(`forest.nodes[${index}] must contain exactly three integers`);
      const variable = this.readForestSafeInteger(tuple[0], `forest.nodes[${index}][0]`);
      if (variable < 0 || variable >= this.variableCount) throw new RangeError(`forest.nodes[${index}] variable is outside the BDD universe`);
      const self = index + 2;
      const low = this.readForestSafeInteger(tuple[1], `forest.nodes[${index}][1]`);
      const high = this.readForestSafeInteger(tuple[2], `forest.nodes[${index}][2]`);
      if (low < 0 || low >= self || high < 0 || high >= self) {
        throw new RangeError(`forest.nodes[${index}] child must refer to a smaller wire handle`);
      }
      if (low === high) throw new RangeError(`forest.nodes[${index}] is not reduced`);
      const triple = `${variable}:${low}:${high}`;
      if (triples.has(triple)) throw new RangeError(`forest.nodes[${index}] duplicates a node triple`);
      triples.add(triple);
      if (low >= 2 && nodes[low - 2]![0] <= variable) {
        throw new RangeError(`forest.nodes[${index}] violates variable ordering on its low child`);
      }
      if (high >= 2 && nodes[high - 2]![0] <= variable) {
        throw new RangeError(`forest.nodes[${index}] violates variable ordering on its high child`);
      }
      nodes.push(Object.freeze([variable, low, high] as const));
    }

    const roots: number[] = [];
    for (let index = 0; index < rawRoots.length; index += 1) {
      const root = this.readForestSafeInteger(rawRoots[index], `forest.roots[${index}]`);
      if (root < 0 || root >= rawNodes.length + 2) {
        throw new RangeError(`forest.roots[${index}] is not a valid wire handle`);
      }
      roots.push(root);
    }

    const reachable = new Set<number>();
    const pending = roots.slice();
    while (pending.length > 0) {
      const wire = pending.pop()!;
      if (wire < 2 || reachable.has(wire)) continue;
      reachable.add(wire);
      const node = nodes[wire - 2];
      // Child bounds were validated above, so this lookup is total.
      pending.push(node![1], node![2]);
    }
    if (reachable.size !== nodes.length) throw new RangeError("forest contains unreachable nodes");

    const imported = new Array<Handle>(nodes.length);
    for (let index = 0; index < nodes.length; index += 1) {
      const [variable, lowWire, highWire] = nodes[index]!;
      const low = lowWire < 2 ? lowWire : imported[lowWire - 2]!;
      const high = highWire < 2 ? highWire : imported[highWire - 2]!;
      imported[index] = this.makeNode(variable, low, high);
    }
    return Object.freeze(roots.map(root => root < 2 ? root : imported[root - 2]!));
  }

  /**
   * Copy a forest of exact functions into another manager with the same fixed
   * variable order. The source-handle memo is shared across every root, while
   * the target's canonical node table deduplicates against nodes already there.
   * Operation and literal caches are intentionally not copied. A target node
   * limit can fail after earlier nodes were appended; callers should use a
   * disposable target when they need all-or-nothing ownership.
   */
  public copyForestTo(target: Bdd, roots: readonly number[]): readonly number[] {
    if (!(target instanceof Bdd)) throw new TypeError("target must be a Bdd");
    if (target.variableCount !== this.variableCount) {
      throw new RangeError("target must use the same variable count and fixed order");
    }
    if (!Array.isArray(roots)) throw new TypeError("roots must be an array");
    // Validate the complete forest before touching the target node table.
    for (const root of roots) this.assertHandle(root);
    if (target === this) return Object.freeze([...roots]);

    const memo = new Map<Handle, Handle>([
      [FALSE, FALSE],
      [TRUE, TRUE],
    ]);
    const copy = (root: Handle): Handle => {
      const cached = memo.get(root);
      if (cached !== undefined) return cached;
      const node = this.nodeAt(root);
      const low = copy(node.low);
      const high = copy(node.high);
      const result = target.makeNode(node.variable, low, high);
      memo.set(root, result);
      return result;
    };
    return Object.freeze(roots.map(root => copy(root)));
  }

  private binary(operation: BinaryOperation, left: Handle, right: Handle): Handle {
    this.assertHandle(left);
    this.assertHandle(right);
    // These operations are commutative. Canonical argument order increases
    // cache hits without changing the function.
    if (left > right) [left, right] = [right, left];
    return this.binaryInternal(operation, left, right);
  }

  private binaryInternal(operation: BinaryOperation, left: Handle, right: Handle): Handle {
    const key = `${operation}:${left}:${right}`;
    const cached = this.cacheGet(key);
    if (cached !== undefined) return cached;

    let simplified: Handle | undefined;
    if (operation === "and") {
      if (left === FALSE || right === FALSE) simplified = FALSE;
      else if (left === TRUE) simplified = right;
      else if (right === TRUE) simplified = left;
      else if (left === right) simplified = left;
    } else if (operation === "or") {
      if (left === TRUE || right === TRUE) simplified = TRUE;
      else if (left === FALSE) simplified = right;
      else if (right === FALSE) simplified = left;
      else if (left === right) simplified = left;
    } else {
      if (left === FALSE) simplified = right;
      else if (right === FALSE) simplified = left;
      else if (left === right) simplified = FALSE;
      else if (left === TRUE) simplified = this.notInternal(right);
      else if (right === TRUE) simplified = this.notInternal(left);
    }
    if (simplified !== undefined) {
      this.cacheSet(key, simplified);
      return simplified;
    }

    const top = Math.min(this.level(left), this.level(right));
    const low = this.binaryInternal(operation, this.cofactor(left, top, false), this.cofactor(right, top, false));
    const high = this.binaryInternal(operation, this.cofactor(left, top, true), this.cofactor(right, top, true));
    const result = this.makeNode(top, low, high);
    this.cacheSet(key, result);
    return result;
  }

  private andExistsInternal(
    left: Handle,
    right: Handle,
    quantified: ReadonlySet<number>,
    quantifiedKey: string,
  ): Handle {
    // Conjunction is commutative. Canonicalizing the pair here makes both the
    // public operation and every recursive subproblem share one cache entry.
    if (left > right) [left, right] = [right, left];
    const key = `andExists:${left}:${right}:${quantifiedKey}`;
    const cached = this.cacheGet(key);
    if (cached !== undefined) return cached;

    let result: Handle;
    if (left === FALSE || right === FALSE) {
      result = FALSE;
    } else if (left === TRUE && right === TRUE) {
      result = TRUE;
    } else if (quantified.size === 0) {
      // At this point no quantified variable remains; using the existing
      // exact binary operation avoids an unnecessary Shannon descent.
      result = this.binaryInternal("and", left, right);
    } else {
      const top = Math.min(this.level(left), this.level(right));
      const lowLeft = this.cofactor(left, top, false);
      const lowRight = this.cofactor(right, top, false);
      const highLeft = this.cofactor(left, top, true);
      const highRight = this.cofactor(right, top, true);
      if (quantified.has(top)) {
        // ROBDD order means this variable cannot recur in either cofactor.
        // Keep the immutable full quantified set/key: its members that have
        // already been visited are absent from every descendant, so retaining
        // them preserves cache sharing across skipped quantified paths.
        const low = this.andExistsInternal(lowLeft, lowRight, quantified, quantifiedKey);
        const high = this.andExistsInternal(highLeft, highRight, quantified, quantifiedKey);
        result = this.binaryInternal("or", low, high);
      } else {
        const low = this.andExistsInternal(lowLeft, lowRight, quantified, quantifiedKey);
        const high = this.andExistsInternal(highLeft, highRight, quantified, quantifiedKey);
        result = this.makeNode(top, low, high);
      }
    }
    this.cacheSet(key, result);
    return result;
  }

  private notInternal(root: Handle): Handle {
    if (root === FALSE) return TRUE;
    if (root === TRUE) return FALSE;
    const key = `not:${root}`;
    const cached = this.cacheGet(key);
    if (cached !== undefined) return cached;
    const node = this.nodeAt(root);
    const result = this.makeNode(node.variable, this.notInternal(node.low), this.notInternal(node.high));
    this.cacheSet(key, result);
    return result;
  }

  private iteInternal(condition: Handle, thenRoot: Handle, elseRoot: Handle): Handle {
    if (condition === FALSE) return elseRoot;
    if (condition === TRUE) return thenRoot;
    if (thenRoot === elseRoot) return thenRoot;
    if (thenRoot === TRUE && elseRoot === FALSE) return condition;
    if (thenRoot === FALSE && elseRoot === TRUE) return this.notInternal(condition);

    const key = `ite:${condition}:${thenRoot}:${elseRoot}`;
    const cached = this.cacheGet(key);
    if (cached !== undefined) return cached;
    const top = Math.min(this.level(condition), this.level(thenRoot), this.level(elseRoot));
    const low = this.iteInternal(
      this.cofactor(condition, top, false),
      this.cofactor(thenRoot, top, false),
      this.cofactor(elseRoot, top, false),
    );
    const high = this.iteInternal(
      this.cofactor(condition, top, true),
      this.cofactor(thenRoot, top, true),
      this.cofactor(elseRoot, top, true),
    );
    const result = this.makeNode(top, low, high);
    this.cacheSet(key, result);
    return result;
  }

  private existsInternal(root: Handle, quantified: ReadonlySet<number>, quantifiedKey: string): Handle {
    if (root < 2) return root;
    const key = `exists-step:${root}:${quantifiedKey}`;
    const cached = this.cacheGet(key);
    if (cached !== undefined) return cached;
    const node = this.nodeAt(root);
    const low = this.existsInternal(node.low, quantified, quantifiedKey);
    const high = this.existsInternal(node.high, quantified, quantifiedKey);
    const result = quantified.has(node.variable) ? this.binaryInternal("or", low, high) : this.makeNode(node.variable, low, high);
    this.cacheSet(key, result);
    return result;
  }

  private renameInternal(
    root: Handle,
    substitutions: ReadonlyMap<number, number>,
    mappingKey: string,
    localMemo: Map<Handle, Handle>,
  ): Handle {
    if (root < 2) return root;
    const local = localMemo.get(root);
    if (local !== undefined) return local;
    const key = `rename-step:${root}:${mappingKey}`;
    const cached = this.cacheGet(key);
    if (cached !== undefined) {
      localMemo.set(root, cached);
      return cached;
    }
    const node = this.nodeAt(root);
    const low = this.renameInternal(node.low, substitutions, mappingKey, localMemo);
    const high = this.renameInternal(node.high, substitutions, mappingKey, localMemo);
    const target = substitutions.get(node.variable) ?? node.variable;
    const result = this.iteInternal(this.variable(target), high, low);
    localMemo.set(root, result);
    this.cacheSet(key, result);
    return result;
  }

  private fillSatisfyingAssignment(root: Handle, assignment: boolean[]): void {
    if (root < 2) {
      if (root === FALSE) throw new Error("Internal satisfying-assignment error");
      return;
    }
    const node = this.nodeAt(root);
    if (node.low !== FALSE) {
      this.fillSatisfyingAssignment(node.low, assignment);
      return;
    }
    assignment[node.variable] = true;
    this.fillSatisfyingAssignment(node.high, assignment);
  }

  private countInternal(
    root: Handle,
    floorRank: number,
    variableTotal: number,
    ranks: ReadonlyMap<number, number>,
    memo: Map<string, bigint>,
  ): bigint {
    if (root === FALSE) return 0n;
    if (root === TRUE) return 1n << BigInt(variableTotal - floorRank);
    const memoKey = `${root}:${floorRank}`;
    const memoized = memo.get(memoKey);
    if (memoized !== undefined) return memoized;
    const node = this.nodeAt(root);
    const rank = ranks.get(node.variable);
    if (rank === undefined) {
      throw new Error(`BDD count variable ${node.variable} is outside the supplied variable set`);
    }
    if (rank < floorRank) throw new Error("BDD node order is inconsistent");
    const freeBeforeNode = 1n << BigInt(rank - floorRank);
    const result = freeBeforeNode * (
      this.countInternal(node.low, rank + 1, variableTotal, ranks, memo)
      + this.countInternal(node.high, rank + 1, variableTotal, ranks, memo)
    );
    memo.set(memoKey, result);
    return result;
  }

  private nodeAt(root: Handle): Node {
    const node = root < 3 ? undefined : this.nodes[root - 3];
    if (node === undefined) throw new Error(`Missing BDD node ${String(root)}`);
    return node;
  }

  private makeNode(variable: number, low: Handle, high: Handle): Handle {
    if (low === high) return low;
    const key = `${variable}:${low}:${high}`;
    const existing = this.unique.get(key);
    if (existing !== undefined) return existing;
    if (this.nodes.length >= this.nodeLimit) {
      throw new BddLimitError(`BDD node limit ${this.nodeLimit} reached`);
    }
    const result = this.nodes.length + 3;
    this.nodes.push({ variable, low, high });
    this.unique.set(key, result);
    return result;
  }

  private cofactor(root: Handle, variable: number, high: boolean): Handle {
    if (root < 2) return root;
    const node = this.nodeAt(root);
    if (node.variable !== variable) return root;
    return high ? node.high : node.low;
  }

  private level(root: Handle): number {
    return root < 2 ? INFINITE_LEVEL : this.nodeAt(root).variable;
  }

  private cacheGet(key: string): Handle | undefined {
    const entry = this.operationCache.get(key);
    if (entry === undefined) return undefined;
    if (entry !== this.newestCacheEntry) {
      this.detachCacheEntry(entry);
      this.appendCacheEntry(entry);
    }
    return entry.value;
  }

  private cacheSet(key: string, value: Handle): void {
    if (this.cacheLimit === 0) return;
    const existing = this.operationCache.get(key);
    if (existing !== undefined) {
      existing.value = value;
      if (existing !== this.newestCacheEntry) {
        this.detachCacheEntry(existing);
        this.appendCacheEntry(existing);
      }
      return;
    }
    if (this.operationCache.size >= this.cacheLimit) {
      const oldest = this.oldestCacheEntry;
      if (oldest === undefined) throw new Error("Internal operation-cache order error");
      this.detachCacheEntry(oldest);
      this.operationCache.delete(oldest.key);
    }
    const entry: OperationCacheEntry = { key, value, older: undefined, newer: undefined };
    this.operationCache.set(key, entry);
    this.appendCacheEntry(entry);
  }

  // Keep the same deterministic LRU order without restarting a Map iterator
  // at every eviction. The list contains exactly the bounded cache entries.
  private detachCacheEntry(entry: OperationCacheEntry): void {
    if (entry.older === undefined) this.oldestCacheEntry = entry.newer;
    else entry.older.newer = entry.newer;
    if (entry.newer === undefined) this.newestCacheEntry = entry.older;
    else entry.newer.older = entry.older;
    entry.older = undefined;
    entry.newer = undefined;
  }

  private appendCacheEntry(entry: OperationCacheEntry): void {
    entry.older = this.newestCacheEntry;
    if (this.newestCacheEntry === undefined) this.oldestCacheEntry = entry;
    else this.newestCacheEntry.newer = entry;
    this.newestCacheEntry = entry;
  }

  private snapshotForestRecord(input: unknown): Record<string, unknown> {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("forest must be an object");
    }
    const record: Record<string, unknown> = {};
    for (const key of ["schema", "variableCount", "roots", "nodes"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new TypeError(`forest.${key} must be an own data property`);
      }
      record[key] = descriptor.value;
    }
    return record;
  }

  private readForestData(record: Readonly<Record<string, unknown>>, key: string): unknown {
    return record[key];
  }

  private forestArrayLength(value: unknown, label: string): number {
    if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
      || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
      throw new TypeError(`${label} must have a safe integer length`);
    }
    return lengthDescriptor.value as number;
  }

  private snapshotForestArray(value: unknown, label: string): unknown[] {
    const length = this.forestArrayLength(value, label);
    const result: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new TypeError(`${label}[${index}] must be an own data property`);
      }
      result.push(descriptor.value);
    }
    return result;
  }

  private readForestSafeInteger(value: unknown, label: string): number {
    if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be a safe integer`);
    return value as number;
  }

  private assertHandle(root: Handle): void {
    if (!Number.isSafeInteger(root)
      || root < FALSE
      || (root !== FALSE && root !== TRUE && (root < 3 || root - 3 >= this.nodes.length))) {
      throw new RangeError(`Invalid BDD handle ${String(root)}`);
    }
  }

  private assertVariable(index: number): void {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.variableCount) {
      throw new RangeError(`Invalid BDD variable ${String(index)}`);
    }
  }

  private assertAssignment(assignment: readonly boolean[]): void {
    if (!Array.isArray(assignment) || assignment.length !== this.variableCount
      || Array.from(assignment).some((value) => typeof value !== "boolean")) {
      throw new TypeError(`assignment must contain exactly ${this.variableCount} booleans`);
    }
  }

  private normalizeVariableSet(variables: Iterable<number>, label: string): number[] {
    if (variables === null || variables === undefined || typeof (variables as { [Symbol.iterator]?: unknown })[Symbol.iterator] !== "function") {
      throw new TypeError(`${label} must be iterable`);
    }
    const result = new Set<number>();
    for (const variable of variables) {
      this.assertVariable(variable);
      result.add(variable);
    }
    return [...result].sort((left, right) => left - right);
  }

  private normalizeVariableArray(variables: readonly number[], label: string): number[] {
    if (!Array.isArray(variables)) throw new TypeError(`${label} must be an array`);
    const result: number[] = [];
    let previous = -1;
    for (const variable of variables) {
      this.assertVariable(variable);
      if (variable <= previous) throw new RangeError(`${label} must be sorted and unique`);
      result.push(variable);
      previous = variable;
    }
    return result;
  }

  private normalizeMapping(mapping: ReadonlyMap<number, number>): Array<readonly [number, number]> {
    if (mapping === null || mapping === undefined || typeof mapping.entries !== "function") {
      throw new TypeError("mapping must be a Map-like object");
    }
    const result: Array<readonly [number, number]> = [];
    for (const [from, to] of mapping.entries()) {
      this.assertVariable(from);
      this.assertVariable(to);
      result.push([from, to]);
    }
    result.sort(([left], [right]) => left - right);
    return result;
  }

  private assertNonNegativeSafeInteger(value: number, label: string): number {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative safe integer`);
    return value;
  }

  private optionalLimit(value: number | undefined, label: string, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative safe integer`);
    return value;
  }
}
