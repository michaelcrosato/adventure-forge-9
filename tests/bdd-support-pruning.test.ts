import assert from "node:assert/strict";
import test from "node:test";
import { Bdd, BddLimitError } from "../src/verification/bdd.js";

function bits(value: number): boolean[] {
  return Array.from({ length: 5 }, (_, variable) => (value & (1 << variable)) !== 0);
}

function formula(values: readonly boolean[]): boolean {
  const [x0, x1, x2, x3, x4] = values;
  return Boolean((x0 && (x1 !== x2)) || (x3 && !x4));
}

test("disjoint support returns unchanged roots without allocating or warming operation caches", () => {
  const bdd = new Bdd(8, { nodeLimit: 128, cacheLimit: 64 });
  const variables = Array.from({ length: 8 }, (_, variable) => bdd.variable(variable));
  const root = bdd.or(bdd.and(variables[0]!, variables[2]!), bdd.xor(variables[3]!, variables[5]!));
  const replacement = bdd.not(variables[2]!);
  bdd.clearOperationCaches();
  const before = bdd.stats();
  assert.equal(bdd.exists(root, [1, 4, 6, 7]), root);
  assert.equal(bdd.compose(root, new Map([[1, replacement], [7, variables[0]!]])), root);
  assert.deepEqual(bdd.stats(), before);
  assert.throws(() => bdd.exists(root, [1, 8]), /variable/i);
  assert.throws(() => bdd.compose(root, new Map([[1, 2]])), /handle/i);
  assert.throws(() => bdd.compose(0, new Map([[8, 0]])), /variable/i);
  assert.deepEqual(bdd.stats(), before, "pruning must not bypass input validation");
});

test("support-pruned quantification and simultaneous composition match raw truth tables", () => {
  for (const cacheLimit of [0, 1, 32]) {
    const bdd = new Bdd(5, { nodeLimit: 1024, cacheLimit });
    const variables = Array.from({ length: 5 }, (_, variable) => bdd.variable(variable));
    const root = bdd.or(bdd.and(variables[0]!, bdd.xor(variables[1]!, variables[2]!)),
      bdd.and(variables[3]!, bdd.not(variables[4]!)));
    const quantified = bdd.exists(root, [1, 3]);
    const composed = bdd.compose(root, new Map([
      [0, variables[3]!], [1, 0], [2, bdd.and(variables[0]!, variables[4]!)],
    ]));
    for (let value = 0; value < 32; value++) {
      const original = bits(value);
      let expectedExists = false;
      for (const one of [false, true]) for (const three of [false, true]) {
        const candidate = [...original];
        candidate[1] = one;
        candidate[3] = three;
        expectedExists ||= formula(candidate);
      }
      assert.equal(bdd.evaluate(quantified, original), expectedExists);
      const substituted = [...original];
      substituted[0] = original[3]!;
      substituted[1] = false;
      substituted[2] = original[0]! && original[4]!;
      assert.equal(bdd.evaluate(composed, original), formula(substituted));
    }
    assert.ok(bdd.stats().operationCacheEntries <= cacheLimit);
  }
});

test("imported and copied forests retain exact support metadata", () => {
  const source = new Bdd(6);
  const root = source.xor(source.variable(0), source.variable(4));
  const importedOwner = new Bdd(6, { cacheLimit: 64 });
  const imported = importedOwner.importForest(source.exportForest([root]))[0]!;
  importedOwner.clearOperationCaches();
  const beforeImportUse = importedOwner.stats();
  assert.equal(importedOwner.exists(imported, [1, 2, 3, 5]), imported);
  assert.deepEqual(importedOwner.stats(), beforeImportUse);

  const copiedOwner = new Bdd(6, { cacheLimit: 64 });
  const copied = source.copyForestTo(copiedOwner, [root])[0]!;
  const replacement = copiedOwner.variable(0);
  copiedOwner.clearOperationCaches();
  const beforeCopyUse = copiedOwner.stats();
  assert.equal(copiedOwner.compose(copied, new Map([[3, replacement]])), copied);
  assert.deepEqual(copiedOwner.stats(), beforeCopyUse);
});

test("large sparse variable universes retain the exact fallback without allocating huge masks", () => {
  for (const width of [513, Number.MAX_SAFE_INTEGER]) {
    const bdd = new Bdd(width, { nodeLimit: 4, cacheLimit: 16 });
    const first = bdd.variable(0);
    const last = bdd.variable(width - 1);
    const root = bdd.and(first, last);
    bdd.clearOperationCaches();
    assert.equal(bdd.exists(root, [1]), root);
    assert.ok(bdd.stats().operationCacheEntries > 0, "large universes use the existing traversal");
    assert.equal(bdd.compose(root, new Map([[width - 1, 1]])), first);
    assert.equal(bdd.exists(root, [width - 1]), first);
  }
});

test("support metadata does not bypass the original node guard", () => {
  const bdd = new Bdd(5, { nodeLimit: 2, cacheLimit: 0 });
  const root = bdd.variable(0);
  bdd.variable(1);
  const before = bdd.stats();
  assert.throws(() => bdd.variable(2), BddLimitError);
  assert.equal(bdd.exists(root, [4]), root);
  assert.deepEqual(bdd.stats(), before);
});
