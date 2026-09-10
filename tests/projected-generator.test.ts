import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("projected candidate generator passes complete tiny truth tables and unsafe rejection fixtures", () => {
  const output = execFileSync(process.execPath, [
    "--max-old-space-size=256",
    "--import", createRequire(import.meta.url).resolve("tsx"),
    fileURLToPath(new URL("../src/tooling/generate-projected-certificates.mjs", import.meta.url)),
    "--fixtures-only",
  ], { encoding: "utf8", timeout: 10_000, maxBuffer: 1024 * 1024 });
  const record = JSON.parse(output.trim()) as Record<string, unknown>;
  assert.equal(record.type, "fixtures-passed");
  assert.equal(record.cases, 7);
  assert(typeof record.elapsedMs === "number" && record.elapsedMs > 0);
});
