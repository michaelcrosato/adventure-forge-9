import assert from "node:assert/strict";
import test from "node:test";
import { Bdd, BddLimitError } from "../src/verification/bdd.js";

function assignment(width: number, value: number): boolean[] {
  return Array.from({ length: width }, (_, variable) => Math.floor(value / 2 ** variable) % 2 === 1);
}

function expectThrow(action: () => unknown, label: string): void {
  assert.throws(action, label);
}

function quantifiedOracle(
  bdd: Bdd,
  left: number,
  right: number,
  width: number,
  variables: Iterable<number>,
  base: readonly boolean[],
): boolean {
  const quantified = [...new Set(variables)];
  for (let values = 0; values < 2 ** quantified.length; values += 1) {
    const candidate = [...base];
    for (const [bit, variable] of quantified.entries()) candidate[variable] = Math.floor(values / 2 ** bit) % 2 === 1;
    if (bdd.evaluate(left, candidate) && bdd.evaluate(right, candidate)) return true;
  }
  return false;
}

function assertMatchesOracle(
  bdd: Bdd,
  left: number,
  right: number,
  width: number,
  variables: Iterable<number>,
): number {
  const quantified = [...new Set(variables)];
  const actual = bdd.andExists(left, right, quantified);
  for (let value = 0; value < 2 ** width; value += 1) {
    const base = assignment(width, value);
    assert.equal(
      bdd.evaluate(actual, base),
      quantifiedOracle(bdd, left, right, width, quantified, base),
      `andExists mismatch for ${base.map(Number).join("")} over ${quantified.join(",")}`,
    );
  }
  return actual;
}

function formula(bdd: Bdd): { left: number; right: number; width: number } {
  const x = Array.from({ length: 5 }, (_, variable) => bdd.variable(variable));
  const left = bdd.and(
    bdd.or(x[0]!, x[1]!),
    bdd.xor(x[2]!, bdd.not(x[3]!)),
  );
  const right = bdd.or(
    bdd.and(bdd.not(x[0]!), x[4]!),
    bdd.and(x[1]!, bdd.not(x[2]!)),
  );
  return { left, right, width: x.length };
}

test("andExists matches an independent oracle for partial, full, empty, swapped, and aliased formulas", () => {
  const bdd = new Bdd(5);
  const { left, right, width } = formula(bdd);

  const partial = assertMatchesOracle(bdd, left, right, width, [1, 3]);
  const swapped = assertMatchesOracle(bdd, right, left, width, [1, 3]);
  for (let value = 0; value < 2 ** width; value += 1) {
    const bits = assignment(width, value);
    assert.equal(bdd.evaluate(partial, bits), bdd.evaluate(swapped, bits), "operand order changed the relation image");
  }

  assertMatchesOracle(bdd, left, right, width, []);
  assertMatchesOracle(bdd, left, right, width, [0, 1, 2, 3, 4]);
  assertMatchesOracle(bdd, 0, right, width, [0, 2]);
  assertMatchesOracle(bdd, 1, right, width, [0, 2]);
  assertMatchesOracle(bdd, 1, 1, width, [0, 1, 2, 3, 4]);

  const x0 = bdd.variable(0);
  const x1 = bdd.variable(1);
  const x2 = bdd.variable(2);
  const aliasedLeft = bdd.or(bdd.and(x0, x1), bdd.and(x0, x1));
  const aliasedRight = bdd.xor(x1, x2);
  assertMatchesOracle(bdd, aliasedLeft, aliasedRight, width, new Set([2, 1, 2]));
});

test("andExists remains exact after cache clearing, with zero and tiny operation caches", () => {
  for (const cacheLimit of [0, 1, 2, 7]) {
    const bdd = new Bdd(5, { cacheLimit });
    const { left, right, width } = formula(bdd);
    const variables = [1, 3];
    const first = assertMatchesOracle(bdd, left, right, width, variables);
    const before = Array.from({ length: 2 ** width }, (_, value) => bdd.evaluate(first, assignment(width, value)));
    bdd.clearOperationCaches();
    assert.equal(bdd.stats().operationCacheEntries, 0, "cache clearing should remove retained operation entries");
    const second = bdd.andExists(left, right, variables);
    const after = Array.from({ length: 2 ** width }, (_, value) => bdd.evaluate(second, assignment(width, value)));
    assert.deepEqual(after, before, `cache limit ${cacheLimit} changed andExists semantics`);
    assert.ok(bdd.stats().operationCacheEntries <= cacheLimit, "operation cache exceeded its configured bound");
  }
});

test("andExists rejects invalid handles and quantified variable iterables", () => {
  const bdd = new Bdd(3);
  const x0 = bdd.variable(0);
  const x1 = bdd.variable(1);
  for (const handle of [-1, 2, 999, Number.NaN, Number.POSITIVE_INFINITY]) {
    expectThrow(() => bdd.andExists(handle, x0, []), `invalid left handle ${String(handle)}`);
    expectThrow(() => bdd.andExists(x0, handle, []), `invalid right handle ${String(handle)}`);
  }
  for (const variables of [
    null,
    undefined,
    {},
    [-1],
    [3],
    [1.5],
    [Number.NaN],
    new Set([0, 3]),
  ] as unknown[]) {
    expectThrow(() => bdd.andExists(x0, x1, variables as Iterable<number>), `invalid quantified variables ${String(variables)}`);
  }
  expectThrow(() => bdd.andExists(x0, x1, { *[Symbol.iterator](): IterableIterator<number> { throw new Error("iterator failure"); } }), "throwing variable iterator");
});

test("andExists fails closed when its exact result exceeds the node limit", () => {
  const limited = new Bdd(3, { nodeLimit: 2, cacheLimit: 0 });
  const x0 = limited.variable(0);
  const x1 = limited.variable(1);
  assert.equal(limited.stats().nodes, 4, "two variables should consume two non-terminal nodes");
  for (const quantified of [[], [2]]) assert.throws(
    () => limited.andExists(x0, x1, quantified),
    error => error instanceof BddLimitError,
    "node exhaustion must throw BddLimitError instead of returning an approximation",
  );
  assert.equal(limited.stats().nodes, 4, "failed andExists must not publish a partial formula handle");
});

test("andExists handles a shared-suffix formula without a large truth-table enumeration", () => {
  const width = 64;
  const bdd = new Bdd(width);
  const variables = Array.from({ length: width }, (_, variable) => bdd.variable(variable));
  const quantified = Array.from({ length: width / 2 }, (_, variable) => variable);
  let prefixParity = 0;
  for (const variable of quantified) prefixParity = bdd.xor(prefixParity, variables[variable]!);
  let sharedSuffix = 0;
  for (let variable = width / 2; variable < width; variable += 1) {
    sharedSuffix = bdd.xor(sharedSuffix, variables[variable]!);
  }
  const left = bdd.and(prefixParity, sharedSuffix);
  const right = bdd.or(bdd.not(prefixParity), sharedSuffix);
  const projected = bdd.andExists(left, right, quantified);

  for (let sample = 0; sample < 128; sample += 1) {
    const bits = Array.from({ length: width }, (_, variable) => ((sample + 3) * (variable + 5)) % 7 < 3);
    assert.equal(bdd.evaluate(projected, bits), bdd.evaluate(sharedSuffix, bits));
  }
});
