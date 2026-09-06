import assert from "node:assert/strict";
import test from "node:test";
import { Bdd } from "../src/verification/bdd.js";

test("BDD evaluation requires a complete Boolean assignment, including unused variables", () => {
  const bdd = new Bdd(3);
  const first = bdd.variable(0);
  const missingUnused = [true, false, false];
  delete missingUnused[2];
  for (const assignment of [new Array<boolean>(3), missingUnused, [true], [true, false, false, false]]) {
    assert.throws(() => bdd.evaluate(first, assignment), /exactly 3 booleans/);
    assert.throws(() => bdd.evaluate(1, assignment), /exactly 3 booleans/);
  }
  assert.equal(bdd.evaluate(first, [true, false, false]), true);
  assert.equal(bdd.evaluate(first, [false, false, false]), false);
});
