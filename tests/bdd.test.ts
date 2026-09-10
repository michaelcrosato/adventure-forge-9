import assert from "node:assert/strict";
import test from "node:test";
import { Bdd } from "../src/verification/bdd.js";

function bits(width: number, value: number): boolean[] {
  return Array.from({ length: width }, (_, variable) => (value & (1 << variable)) !== 0);
}

function expectThrow(action: () => unknown, label: string): void {
  assert.throws(action, label);
}

test("BDD Boolean operations are exact over all assignments and canonical", () => {
  const bdd = new Bdd(3);
  const x0 = bdd.variable(0);
  const x1 = bdd.variable(1);
  const x2 = bdd.variable(2);

  const formula = bdd.and(bdd.or(x0, x1), bdd.not(x2));
  for (let value = 0; value < 8; value += 1) {
    const assignment = bits(3, value);
    const expected = (assignment[0] || assignment[1]) && !assignment[2];
    assert.equal(
      bdd.evaluate(formula, assignment),
      expected,
      `formula mismatch for assignment ${assignment.map(Number).join("")}`,
    );
  }

  assert.equal(bdd.and(x0, x1), bdd.and(x1, x0), "and is canonical under operand order");
  assert.equal(bdd.or(x0, x1), bdd.or(x1, x0), "or is canonical under operand order");
  assert.equal(bdd.xor(x0, x1), bdd.xor(x1, x0), "xor is canonical under operand order");
  assert.equal(bdd.not(bdd.not(x0)), x0, "double negation returns the canonical handle");
  assert.equal(bdd.ite(x0, 1, 0), x0, "if-then-else reduces to its condition");
  assert.equal(bdd.ite(x0, 0, 1), bdd.not(x0), "if-then-else complements its condition");
  assert.equal(bdd.and(0, formula), 0);
  assert.equal(bdd.or(1, formula), 1);
  assert.equal(bdd.xor(formula, formula), 0);

  const pairOperations = [
    [bdd.and(x0, x1), (left: boolean, right: boolean) => left && right],
    [bdd.or(x0, x1), (left: boolean, right: boolean) => left || right],
    [bdd.xor(x0, x1), (left: boolean, right: boolean) => left !== right],
  ] as const;
  for (const [root, expectedOperation] of pairOperations) {
    for (const left of [false, true]) {
      for (const right of [false, true]) {
        assert.equal(bdd.evaluate(root, [left, right, false]), expectedOperation(left, right));
      }
    }
  }
  const iteRoot = bdd.ite(x0, x1, bdd.not(x1));
  for (const condition of [false, true]) {
    for (const branch of [false, true]) {
      assert.equal(bdd.evaluate(iteRoot, [condition, branch, false]), condition ? branch : !branch);
    }
  }
});

test("existential quantification removes exactly the selected support", () => {
  const bdd = new Bdd(3);
  const x0 = bdd.variable(0);
  const x1 = bdd.variable(1);
  const x2 = bdd.variable(2);

  assert.equal(bdd.exists(bdd.and(x0, x1), [0]), x1);
  assert.equal(bdd.exists(bdd.and(x0, x1), [1]), x0);
  assert.equal(bdd.exists(bdd.and(x0, bdd.not(x0)), [0]), 0);
  assert.equal(
    bdd.exists(bdd.and(x0, x2), new Set([2, 0, 2])),
    1,
    "quantifier input is an iterable and duplicate variables are harmless",
  );
  assert.equal(bdd.exists(x0, []), x0);
});

test("rename is simultaneous for reordering and aliasing", () => {
  const bdd = new Bdd(3);
  const x0 = bdd.variable(0);
  const x1 = bdd.variable(1);
  const x2 = bdd.variable(2);

  const swapped = bdd.rename(
    bdd.and(x0, bdd.not(x1)),
    new Map([
      [0, 1],
      [1, 0],
    ]),
  );
  const expectedSwap = bdd.and(x1, bdd.not(x0));
  assert.equal(swapped, expectedSwap, "a swap must not be applied sequentially");

  const shifted = bdd.rename(
    bdd.and(x0, bdd.not(x1)),
    new Map([
      [0, 1],
      [1, 2],
    ]),
  );
  assert.equal(shifted, bdd.and(x1, bdd.not(x2)));

  const aliased = bdd.rename(
    bdd.xor(x0, x1),
    new Map([
      [0, 1],
      [1, 1],
    ]),
  );
  assert.equal(aliased, 0, "simultaneous aliasing must substitute both old variables");

  for (let value = 0; value < 8; value += 1) {
    const assignment = bits(3, value);
    assert.equal(
      bdd.evaluate(swapped, assignment),
      assignment[1] && !assignment[0],
      `swapped formula mismatch for assignment ${assignment.map(Number).join("")}`,
    );
  }
});

test("satisfyingAssignment returns a total false-default witness", () => {
  const bdd = new Bdd(4);
  const x0 = bdd.variable(0);
  const x2 = bdd.variable(2);
  const formula = bdd.and(x0, bdd.not(x2));

  const witness = bdd.satisfyingAssignment(formula);
  assert.ok(witness);
  assert.equal(witness.length, 4);
  assert.equal(witness[0], true);
  assert.equal(witness[1], false, "unlisted variables default to false");
  assert.equal(witness[2], false);
  assert.equal(witness[3], false, "unlisted variables default to false");
  assert.equal(bdd.evaluate(formula, witness), true);

  assert.deepEqual(bdd.satisfyingAssignment(1), [false, false, false, false]);
  assert.equal(bdd.satisfyingAssignment(0), undefined);
});

test("count returns exact bigint model counts beyond 32 bits", () => {
  const width = 40;
  const bdd = new Bdd(width);
  const allVariables = Array.from({ length: width }, (_, variable) => variable);
  const x0 = bdd.variable(0);

  assert.equal(bdd.count(1, allVariables), 1n << 40n);
  assert.equal(bdd.count(x0, allVariables), 1n << 39n);
  assert.equal(bdd.count(0, allVariables), 0n);
  assert.equal(bdd.count(x0, [0]), 1n);
  assert.throws(() => bdd.count(x0, allVariables.slice(1)), /support|selected|variable/i);
  assert.throws(() => bdd.count(1, [1, 0]), /sorted|unique/i);
  assert.throws(() => bdd.count(1, [0, 0]), /sorted|unique/i);
});

test("operation caches can be cleared without changing canonical nodes", () => {
  const bdd = new Bdd(4);
  const x0 = bdd.variable(0);
  const x1 = bdd.variable(1);
  const x2 = bdd.variable(2);
  const x3 = bdd.variable(3);
  const left = bdd.and(bdd.or(x0, x1), bdd.xor(x2, x3));
  const right = bdd.or(bdd.and(x0, x2), bdd.xor(x1, x3));
  const result = bdd.ite(x0, left, right);
  const before = bdd.stats();

  assert.equal(typeof before.nodes, "number");
  assert.equal(typeof before.uniqueEntries, "number");
  assert.equal(typeof before.operationCacheEntries, "number");
  assert.ok(before.nodes >= 2);

  // Repeat a non-trivial operation so the observable operation cache is warmed.
  assert.equal(bdd.and(result, left), bdd.and(result, left));
  const warmed = bdd.stats();
  assert.ok(warmed.operationCacheEntries >= before.operationCacheEntries);
  const canonicalNodes = warmed.nodes;
  const canonicalEntries = warmed.uniqueEntries;

  bdd.clearOperationCaches();
  const cleared = bdd.stats();
  assert.equal(cleared.operationCacheEntries, 0);
  assert.equal(cleared.nodes, canonicalNodes);
  assert.equal(cleared.uniqueEntries, canonicalEntries);
  assert.equal(bdd.evaluate(result, [true, false, true, false]), true);

  const noCache = new Bdd(2, { cacheLimit: 0 });
  const noCacheX0 = noCache.variable(0);
  const noCacheX1 = noCache.variable(1);
  noCache.and(noCacheX0, noCacheX1);
  assert.equal(noCache.stats().operationCacheEntries, 0, "zero cache limit disables memoization");

  const boundedCache = new Bdd(4, { cacheLimit: 1 });
  const boundedVariables = [0, 1, 2, 3].map((variable) => boundedCache.variable(variable));
  const boundedFormula = boundedCache.and(
    boundedCache.or(boundedVariables[0]!, boundedVariables[1]!),
    boundedCache.xor(boundedVariables[2]!, boundedVariables[3]!),
  );
  boundedCache.not(boundedFormula);
  assert.ok(boundedCache.stats().operationCacheEntries <= 1, "cache limit bounds retained operation entries");
});

test("invalid handles and variable references fail closed", () => {
  const bdd = new Bdd(2);
  const x0 = bdd.variable(0);

  for (const variable of [-1, 2, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    expectThrow(() => bdd.variable(variable), `invalid variable ${String(variable)}`);
  }
  for (const handle of [-1, 999, Number.NaN, Number.POSITIVE_INFINITY]) {
    expectThrow(() => bdd.not(handle), `invalid handle ${String(handle)}`);
    expectThrow(() => bdd.and(handle, x0), `invalid left handle ${String(handle)}`);
    expectThrow(() => bdd.or(x0, handle), `invalid right handle ${String(handle)}`);
    expectThrow(() => bdd.xor(handle, x0), `invalid xor handle ${String(handle)}`);
    expectThrow(() => bdd.ite(handle, x0, 0), `invalid ite handle ${String(handle)}`);
    expectThrow(() => bdd.evaluate(handle, [false, false]), `invalid evaluation handle ${String(handle)}`);
    expectThrow(() => bdd.satisfyingAssignment(handle), `invalid witness handle ${String(handle)}`);
    expectThrow(() => bdd.count(handle, [0, 1]), `invalid count handle ${String(handle)}`);
  }
  expectThrow(() => bdd.exists(x0, [2]), "quantifying outside the variable universe");
  expectThrow(() => bdd.rename(x0, new Map([[0, 2]])), "renaming outside the variable universe");
  expectThrow(() => bdd.count(x0, [2]), "count variable outside the variable universe");
  expectThrow(() => bdd.count(x0, [1]), "count omitting a supported variable");
});

test("limits reject invalid budgets and fail closed before returning a formula", () => {
  assert.throws(() => new Bdd(2, { nodeLimit: -1 }), /nodeLimit|non-negative|limit/i);
  assert.throws(() => new Bdd(2, { cacheLimit: 1.5 }), /cacheLimit|safe integer|limit/i);

  assert.throws(() => {
    const limited = new Bdd(3, { nodeLimit: 1 });
    const x0 = limited.variable(0);
    const x1 = limited.variable(1);
    limited.and(x0, x1);
  }, /limit|capacity|maximum|invalid/i);
});
