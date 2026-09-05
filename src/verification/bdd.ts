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

const FALSE: Handle = 0;
const TRUE: Handle = 1;
const TERMINAL_VARIABLE = -1;
const INFINITE_LEVEL = Number.POSITIVE_INFINITY;

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
  private readonly operationCache = new Map<string, Handle>();
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
    const key = `exists:${root}:${ordered.join(",")}`;
    const cached = this.cacheGet(key);
    if (cached !== undefined) return cached;
    const quantified = new Set(ordered);
    const result = this.existsInternal(root, quantified, ordered);
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
    return this.countInternal(root, 0, ordered.length, ranks);
  }

  /** Drop memoized operation results while preserving canonical nodes. */
  public clearOperationCaches(): void {
    this.operationCache.clear();
  }

  /** Return an immutable snapshot of manager sizes. */
  public stats(): BddStats {
    return Object.freeze({
      nodes: this.nodes.length + 2,
      uniqueEntries: this.unique.size,
      operationCacheEntries: this.operationCache.size,
    });
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

  private existsInternal(root: Handle, quantified: ReadonlySet<number>, quantifiedKey: readonly number[]): Handle {
    if (root < 2) return root;
    const key = `exists-step:${root}:${quantifiedKey.join(",")}`;
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
  ): bigint {
    if (root === FALSE) return 0n;
    if (root === TRUE) return 1n << BigInt(variableTotal - floorRank);
    const node = this.nodeAt(root);
    const rank = ranks.get(node.variable);
    if (rank === undefined) {
      throw new Error(`BDD count variable ${node.variable} is outside the supplied variable set`);
    }
    if (rank < floorRank) throw new Error("BDD node order is inconsistent");
    const freeBeforeNode = 1n << BigInt(rank - floorRank);
    return freeBeforeNode * (
      this.countInternal(node.low, rank + 1, variableTotal, ranks)
      + this.countInternal(node.high, rank + 1, variableTotal, ranks)
    );
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
    const value = this.operationCache.get(key);
    if (value === undefined) return undefined;
    // Deterministic LRU behavior keeps bounded runs reproducible.
    this.operationCache.delete(key);
    this.operationCache.set(key, value);
    return value;
  }

  private cacheSet(key: string, value: Handle): void {
    if (this.cacheLimit === 0) return;
    if (this.operationCache.has(key)) this.operationCache.delete(key);
    else if (this.operationCache.size >= this.cacheLimit) {
      const oldest = this.operationCache.keys().next().value as string | undefined;
      if (oldest !== undefined) this.operationCache.delete(oldest);
    }
    this.operationCache.set(key, value);
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
      || assignment.some((value) => typeof value !== "boolean")) {
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
