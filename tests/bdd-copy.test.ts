import assert from "node:assert/strict";
import test from "node:test";
import { Bdd, BddLimitError } from "../src/verification/bdd.js";

function assignment(width: number, value: number): boolean[] {
  return Array.from({ length: width }, (_, variable) =>
    Math.floor(value / 2 ** variable) % 2 === 1
  );
}

function buildForest(bdd: Bdd): {
  roots: readonly number[];
  formulas: readonly number[];
} {
  const variables = Array.from({ length: 4 }, (_, variable) => bdd.variable(variable));
  const shared = bdd.and(variables[0]!, variables[1]!);
  const left = bdd.or(shared, variables[2]!);
  const right = bdd.and(shared, bdd.not(variables[3]!));
  return {
    roots: Object.freeze([0, 1, shared, left, right]),
    formulas: Object.freeze([shared, left, right]),
  };
}

function assertForestEquivalent(
  source: Bdd,
  target: Bdd,
  sourceRoots: readonly number[],
  targetRoots: readonly number[],
  width: number,
): void {
  assert.equal(sourceRoots.length, targetRoots.length);
  for (let value = 0; value < 2 ** width; value += 1) {
    const bits = assignment(width, value);
    for (const [index, sourceRoot] of sourceRoots.entries()) {
      assert.equal(
        target.evaluate(targetRoots[index]!, bits),
        source.evaluate(sourceRoot, bits),
        "copied root changed its Boolean function",
      );
    }
  }
}

test("copyForestTo copies terminals and a shared multi-root DAG exactly", () => {
  const source = new Bdd(4);
  const forest = buildForest(source);
  const target = new Bdd(4);

  const copied = source.copyForestTo(target, forest.roots);

  assert.deepEqual(copied.slice(0, 2), [0, 1], "terminals must keep their handles");
  assert.ok(Object.isFrozen(copied), "returned forest should be immutable");
  assertForestEquivalent(source, target, forest.roots, copied, 4);

  const targetVariables = [0, 1, 2, 3].map(variable => target.variable(variable));
  assert.equal(
    copied[2],
    target.and(targetVariables[0]!, targetVariables[1]!),
    "shared source node must be canonical in the target",
  );
  assert.equal(
    copied[3],
    target.or(copied[2]!, targetVariables[2]!),
    "copied root must remain canonical after target reuse",
  );
  assert.equal(
    copied[4],
    target.and(copied[2]!, target.not(targetVariables[3]!)),
    "second copied root must reuse the shared target node",
  );
});

test("copyForestTo validates the full root list before mutating the target", () => {
  const source = new Bdd(3);
  const root = source.and(source.variable(0), source.variable(1));
  const target = new Bdd(3);
  const before = target.stats();

  for (const roots of [
    [root, 2],
    [root, 999],
    [root, -1],
    [root, Number.NaN],
    [root, Number.POSITIVE_INFINITY],
  ]) {
    assert.throws(
      () => source.copyForestTo(target, roots),
      /invalid|handle|BDD/i,
      "invalid roots must fail closed",
    );
    assert.deepEqual(target.stats(), before, "invalid roots must not append target nodes");
  }

  const sparse: number[] = [];
  sparse.length = 2;
  sparse[1] = root;
  assert.throws(() => source.copyForestTo(target, sparse), /invalid|handle|BDD/i);
  assert.deepEqual(target.stats(), before, "a sparse root array must be rejected before copying");

  assert.throws(
    () => source.copyForestTo(null as unknown as Bdd, [root]),
    /target|BDD/i,
  );
  assert.throws(
    () => source.copyForestTo(new Bdd(2), [root]),
    /variable|order|same/i,
  );
  assert.throws(
    () => source.copyForestTo(target, new Set([root]) as unknown as readonly number[]),
    /roots|array/i,
  );
});

test("copyForestTo supports a prepopulated target without copying source caches", () => {
  const source = new Bdd(4, { cacheLimit: 16 });
  const forest = buildForest(source);
  const sourceWarm = source.and(forest.formulas[1]!, forest.formulas[2]!);
  assert.ok(sourceWarm >= 0);
  assert.ok(source.stats().operationCacheEntries > 0);

  const target = new Bdd(4, { cacheLimit: 16 });
  const targetVariables = [0, 1, 2, 3].map(variable => target.variable(variable));
  const preexisting = target.and(targetVariables[0]!, targetVariables[1]!);
  const before = target.stats();
  const copied = source.copyForestTo(target, [forest.formulas[0]!, forest.formulas[1]!]);

  assert.equal(copied[0], preexisting, "preexisting target nodes should be reused");
  assert.equal(
    target.stats().operationCacheEntries,
    before.operationCacheEntries,
    "copying nodes must not copy or mutate operation-cache entries",
  );
  assertForestEquivalent(
    source,
    target,
    [forest.formulas[0]!, forest.formulas[1]!],
    copied,
    4,
  );

  const sourceAfter = source.not(forest.formulas[1]!);
  const targetAfter = target.not(copied[1]!);
  assertForestEquivalent(source, target, [sourceAfter], [targetAfter], 4);
});

test("copyForestTo on the same manager returns validated immutable handles", () => {
  const bdd = new Bdd(2);
  const root = bdd.or(bdd.variable(0), bdd.variable(1));
  const copied = bdd.copyForestTo(bdd, [0, root, 1]);

  assert.deepEqual(copied, [0, root, 1]);
  assert.ok(Object.isFrozen(copied));
  assert.throws(() => (copied as number[]).push(root), TypeError);
});

test("copyForestTo can fail on the target node limit after partial append", () => {
  const source = new Bdd(3);
  const root = source.and(source.variable(0), source.variable(1));
  const target = new Bdd(3, { nodeLimit: 1, cacheLimit: 0 });

  assert.throws(
    () => source.copyForestTo(target, [root]),
    error => error instanceof BddLimitError,
    "target exhaustion must throw the exact BDD limit error",
  );
  assert.equal(target.stats().uniqueEntries, 1, "partial target append is allowed and observable");
  assert.equal(target.stats().nodes, 3);
  assertForestEquivalent(source, target, [source.variable(1)], [target.variable(1)], 3);
});
