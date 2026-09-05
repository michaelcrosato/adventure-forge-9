import assert from "node:assert/strict";
import test from "node:test";
import { Bdd } from "../src/verification/bdd.js";

test("count memoizes shared parity suffixes and returns an exact bigint", () => {
  const width = 80;
  const bdd = new Bdd(width);
  let parity = 0;
  for (let variable = 0; variable < width; variable += 1) {
    parity = bdd.xor(parity, bdd.variable(variable));
  }

  const variables = Array.from({ length: width }, (_, variable) => variable);
  assert.equal(bdd.count(parity, variables), 1n << BigInt(width - 1));
});
