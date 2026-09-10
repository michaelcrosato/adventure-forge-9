import assert from "node:assert/strict";
import test from "node:test";
import { Bdd } from "../src/verification/bdd.js";

function assignment(width: number, value: number): boolean[] {
  return Array.from({ length: width }, (_, variable) => (value & (1 << variable)) !== 0);
}

test("compose simultaneously substitutes Boolean functions without recursive replacement", () => {
  for (const cacheLimit of [0, 1, 2, 7]) {
    const bdd = new Bdd(4, { nodeLimit: 256, cacheLimit });
    const [x0, x1, x2, x3] = Array.from({ length: 4 }, (_, variable) => bdd.variable(variable));
    const root = bdd.and(x0!, bdd.or(bdd.not(x1!), x2!));
    const replacementForTwo = bdd.and(x0!, bdd.not(x3!));
    const mapping = new Map<number, number>([
      [0, x1!],
      [1, x2!],
      [2, replacementForTwo],
    ]);
    const composed = bdd.compose(root, mapping);

    for (let value = 0; value < 16; value += 1) {
      const bits = assignment(4, value);
      const expected = bits[1]! && (!bits[2]! || (bits[0]! && !bits[3]!));
      assert.equal(
        bdd.evaluate(composed, bits),
        expected,
        `simultaneous composition mismatch at ${bits.map(Number).join("")} with cache ${cacheLimit}`,
      );
    }

    bdd.clearOperationCaches();
    const afterClear = bdd.compose(root, mapping);
    for (let value = 0; value < 16; value += 1) {
      const bits = assignment(4, value);
      assert.equal(bdd.evaluate(afterClear, bits), bdd.evaluate(composed, bits));
    }
    assert.ok(bdd.stats().operationCacheEntries <= cacheLimit);
  }
});

test("compose leaves absent variables untouched and handles constants exactly", () => {
  const bdd = new Bdd(4, { nodeLimit: 128, cacheLimit: 1 });
  const [x0, x1, x2, x3] = Array.from({ length: 4 }, (_, variable) => bdd.variable(variable));
  const root = bdd.or(x0!, x3!);

  assert.equal(bdd.compose(root, new Map()), root, "an empty mapping is a no-op");
  assert.equal(
    bdd.compose(root, new Map([[2, bdd.not(x1!)]])),
    root,
    "a mapping for an absent source variable cannot change the root",
  );

  const x0Only = bdd.compose(bdd.and(x0!, x3!), new Map([[3, 1]]));
  for (let value = 0; value < 16; value += 1) {
    const bits = assignment(4, value);
    assert.equal(bdd.evaluate(x0Only, bits), bits[0]);
  }
});

test("compose validates source variables and replacement handles before changing semantics", () => {
  const bdd = new Bdd(2);
  const x0 = bdd.variable(0);
  assert.throws(() => bdd.compose(x0, new Map([[2, x0]])), /variable/i);
  assert.throws(() => bdd.compose(x0, new Map([[0, 2]])), /handle/i);
});
