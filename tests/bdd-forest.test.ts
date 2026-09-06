import assert from "node:assert/strict";
import test from "node:test";
import { Bdd, BddLimitError, type BddForest } from "../src/verification/bdd.js";

function assignment(width: number, value: number): boolean[] {
  return Array.from({ length: width }, (_, variable) => Math.floor(value / 2 ** variable) % 2 === 1);
}

function buildForest(bdd: Bdd): { roots: readonly number[]; formulas: readonly number[] } {
  const variables = Array.from({ length: 4 }, (_, variable) => bdd.variable(variable));
  const shared = bdd.and(variables[0]!, variables[1]!);
  const left = bdd.or(shared, variables[2]!);
  const right = bdd.and(shared, bdd.not(variables[3]!));
  return {
    roots: Object.freeze([0, 1, shared, left, right]),
    formulas: Object.freeze([shared, left, right]),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertEquivalent(source: Bdd, target: Bdd, sourceRoots: readonly number[], targetRoots: readonly number[]): void {
  assert.equal(sourceRoots.length, targetRoots.length);
  for (let value = 0; value < 16; value += 1) {
    const bits = assignment(4, value);
    for (const [index, sourceRoot] of sourceRoots.entries()) {
      assert.equal(
        target.evaluate(targetRoots[index]!, bits),
        source.evaluate(sourceRoot, bits),
        `imported root ${index} changed its Boolean function`,
      );
    }
  }
}

test("export/import preserves terminals, shared DAGs, exhaustive truth and counts", () => {
  const source = new Bdd(4);
  const forest = buildForest(source);
  const before = source.stats();
  const wire = source.exportForest(forest.roots);

  assert.deepEqual(wire.roots.slice(0, 2), [0, 1]);
  assert.equal(wire.schema, "af9-bdd-forest-v1");
  assert.equal(wire.variableCount, 4);
  assert.ok(Object.isFrozen(wire));
  assert.ok(Object.isFrozen(wire.roots));
  assert.ok(Object.isFrozen(wire.nodes));
  for (const node of wire.nodes) assert.ok(Object.isFrozen(node));
  assert.deepEqual(source.stats(), before, "export must not mutate nodes or operation caches");

  for (let index = 0; index < wire.nodes.length; index += 1) {
    const [variable, low, high] = wire.nodes[index]!;
    assert.ok(variable >= 0 && variable < wire.variableCount);
    assert.ok(low < index + 2 && high < index + 2, "wire nodes must be postorder");
  }

  const target = new Bdd(4);
  const imported = target.importForest(JSON.parse(JSON.stringify(wire)));
  assert.ok(Object.isFrozen(imported));
  assertEquivalent(source, target, forest.roots, imported);
  for (const [index, sourceRoot] of forest.roots.entries()) {
    assert.equal(
      target.count(imported[index]!, [0, 1, 2, 3]),
      source.count(sourceRoot, [0, 1, 2, 3]),
      `count changed for root ${index}`,
    );
  }
  assert.equal(imported[2], target.and(target.variable(0), target.variable(1)), "shared nodes must remain canonical");
});

test("invalid or accessor-backed forests fail before target mutation", () => {
  const source = new Bdd(3);
  const root = source.and(source.variable(0), source.variable(1));
  const valid: BddForest = {
    schema: "af9-bdd-forest-v1",
    variableCount: 3,
    roots: [2],
    nodes: [[0, 0, 1]],
  };
  const target = new Bdd(3);
  target.variable(2);
  const before = target.stats();
  const malformed: unknown[] = [
    { ...valid, schema: "wrong" },
    { ...valid, variableCount: 2 },
    { ...valid, roots: [3] },
    { ...valid, roots: [2.5] },
    { ...valid, roots: "2" },
    { ...valid, nodes: [[-1, 0, 1]] },
    { ...valid, nodes: [[0, 0]] },
    { ...valid, nodes: [[0, 0, 2]] },
    { ...valid, nodes: [[0, 0, 1], [0, 0, 1]], roots: [2, 3] },
    { ...valid, nodes: [[0, 0, 1], [1, 0, 1]], roots: [2] },
    { ...valid, nodes: [[0, 0, 3], [1, 0, 1]], roots: [2, 3] },
    { ...valid, nodes: [[0, 0, 1], [1, 0, 2]], roots: [3] },
    { ...valid, roots: [root], nodes: [] },
  ];
  for (const input of malformed) {
    assert.throws(() => target.importForest(input), /forest|schema|variable|root|node|child|reduced|order|duplicate|unreachable|safe/i);
    assert.deepEqual(target.stats(), before, "invalid input must not mutate target nodes or cache");
  }

  const accessorInput = { ...valid } as { schema: string; variableCount: number; roots: unknown; nodes: unknown };
  Object.defineProperty(accessorInput, "nodes", {
    enumerable: true,
    get() {
      throw new Error("nodes getter must not be invoked");
    },
  });
  assert.throws(() => target.importForest(accessorInput), /data property|forest/i);
  assert.deepEqual(target.stats(), before, "accessor rejection must be atomic");

  const sparseRoots = clone(valid) as { roots: number[] } & Omit<BddForest, "roots">;
  sparseRoots.roots = [];
  sparseRoots.roots.length = 1;
  assert.throws(() => target.importForest(sparseRoots), /own data|forest/i);
  assert.deepEqual(target.stats(), before);
});

test("export snapshots only reachable nodes and import rejects unreachable wire nodes and foreign IDs", () => {
  const source = new Bdd(3);
  const unused = source.variable(2);
  const root = source.and(source.variable(0), source.variable(1));
  const wire = source.exportForest([root]);
  assert.ok(wire.nodes.every(node => node[0] !== 2), "unreachable source nodes must not be exported");

  const target = new Bdd(3);
  const before = target.stats();
  const unreachable = clone(wire) as {
    schema: "af9-bdd-forest-v1";
    variableCount: number;
    roots: number[];
    nodes: readonly (readonly [number, number, number])[];
  };
  unreachable.nodes = Object.freeze([...unreachable.nodes, Object.freeze([2, 0, 1] as const)]);
  assert.throws(() => target.importForest(unreachable), /unreachable/i);
  assert.deepEqual(target.stats(), before);

  assert.ok(unused >= 3);
  assert.throws(
    () => target.importForest({ schema: "af9-bdd-forest-v1", variableCount: 3, roots: [unused], nodes: [] }),
    /valid wire handle|root/i,
    "a handle from another manager is not a wire root without a matching forest",
  );
});

test("target node limits throw BddLimitError after permitted partial canonicalization", () => {
  const wire: BddForest = {
    schema: "af9-bdd-forest-v1",
    variableCount: 4,
    roots: [3],
    nodes: [[1, 0, 1], [0, 0, 2]],
  };

  const target = new Bdd(4, { nodeLimit: 2, cacheLimit: 0 });
  target.variable(3);
  const before = target.stats();
  assert.throws(() => target.importForest(wire), error => error instanceof BddLimitError);
  assert.ok(target.stats().uniqueEntries >= before.uniqueEntries, "partial target mutation is documented on limit failure");
});
