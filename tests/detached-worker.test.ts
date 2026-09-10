import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runDetachedWorker } from "./helpers/detached-worker.js";

const TEST_POLICY = Object.freeze({
  heapMiB: 64,
  checkedElapsedMs: 5_000,
  externalTimeoutMs: 500,
  maxOutputBytes: 1_024,
  terminationGraceMs: 75,
  groupExitGraceMs: 500,
});

function writeWorker(directory: string, name: string, source: string): string {
  const path = join(directory, `${name}.mjs`);
  writeFileSync(path, source, { flag: "wx", mode: 0o600 });
  return path;
}

function workerOptions(worker: string, prefix: string) {
  return {
    worker,
    cwd: process.cwd(),
    policy: TEST_POLICY,
    evidencePrefix: prefix,
  } as const;
}

function evidencePath(error: unknown): string {
  const match = /Failure evidence: (\/tmp\/[^\s]+)/.exec(error instanceof Error ? error.message : String(error));
  assert.ok(match, `failure did not preserve an evidence path: ${String(error)}`);
  const path = match[1];
  assert.ok(path, "failure evidence path was empty");
  return path;
}

function evidence(error: unknown): Record<string, unknown> {
  return JSON.parse(readFileSync(evidencePath(error), "utf8")) as Record<string, unknown>;
}

async function waitForGone(pid: number, signalTarget: "process" | "group" = "process"): Promise<void> {
  const target = signalTarget === "group" ? -pid : pid;
  const deadline = performance.now() + 2_000;
  while (performance.now() < deadline) {
    try {
      process.kill(target, 0);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? (error as { readonly code?: unknown }).code
        : undefined;
      if (code === "ESRCH") return;
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  assert.fail(`${signalTarget} ${pid} remained alive after supervisor cleanup`);
}

function killIfAlive(pid: number | undefined, signalTarget: "process" | "group"): void {
  if (pid === undefined || !Number.isSafeInteger(pid) || pid <= 1) return;
  try {
    process.kill(signalTarget === "group" ? -pid : pid, "SIGKILL");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? (error as { readonly code?: unknown }).code
      : undefined;
    if (code !== "ESRCH") throw error;
  }
}

async function readPid(path: string): Promise<number> {
  const deadline = performance.now() + 1_000;
  while (performance.now() < deadline) {
    if (existsSync(path)) {
      const pid = Number.parseInt(readFileSync(path, "utf8"), 10);
      assert.ok(Number.isSafeInteger(pid) && pid > 1, `invalid child pid ${pid}`);
      return pid;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`synthetic worker did not publish ${path}`);
}

function cleanup(directory: string, directPid: number | undefined, childPid: number | undefined): void {
  killIfAlive(directPid, "group");
  killIfAlive(childPid, "process");
  rmSync(directory, { recursive: true, force: true });
}

test("normal code 0 waits for a short-lived descendant before returning", async () => {
  const directory = mkdtempSync(join(tmpdir(), "af9-supervisor-v3-normal-"));
  let directPid: number | undefined;
  let childPid: number | undefined;
  try {
    const worker = writeWorker(directory, "normal", `
      import { spawn } from "node:child_process";
      import { writeFileSync } from "node:fs";
      const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 120)"], {stdio: "ignore"});
      writeFileSync(new URL("./normal.pid", import.meta.url), String(child.pid));
      process.stdout.write("normal\\n");
      setTimeout(() => process.exit(0), 10);
    `);
    const result = await runDetachedWorker(workerOptions(worker, "af9-supervisor-v3-normal"));
    const resultPid = result.pid;
    directPid = resultPid;
    childPid = await readPid(join(directory, "normal.pid"));
    assert.equal(result.code, 0);
    assert.equal(result.signal, null);
    assert.equal(result.stdoutText, "normal\n");
    await waitForGone(childPid);
    await waitForGone(resultPid, "group");
  } finally {
    cleanup(directory, directPid, childPid);
  }
});

test("normal code 0 with a persistent descendant fails closed and kills the group", async () => {
  const directory = mkdtempSync(join(tmpdir(), "af9-supervisor-v3-normal-leak-"));
  let directPid: number | undefined;
  let childPid: number | undefined;
  try {
    const worker = writeWorker(directory, "normal-leak", `
      import { spawn } from "node:child_process";
      import { writeFileSync } from "node:fs";
      const child = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], {stdio: "ignore"});
      writeFileSync(new URL("./normal-leak.pid", import.meta.url), String(child.pid));
      setTimeout(() => process.exit(0), 100);
    `);
    let failure: unknown;
    await assert.rejects(
      runDetachedWorker(workerOptions(worker, "af9-supervisor-v3-normal-leak")),
      error => { failure = error; return true; },
    );
    const record = evidence(failure);
    directPid = Number(record.pid);
    childPid = await readPid(join(directory, "normal-leak.pid"));
    assert.match(String(record.reason), /process group remained after worker close/);
    assert.equal(record.code, 0);
    await waitForGone(childPid);
    await waitForGone(directPid, "group");
  } finally {
    cleanup(directory, directPid, childPid);
  }
});

test("nonzero exit preserves both streams and timing, then leaves no group", async () => {
  const directory = mkdtempSync(join(tmpdir(), "af9-supervisor-v3-nonzero-"));
  let directPid: number | undefined;
  try {
    const worker = writeWorker(directory, "nonzero", `
      process.stdout.write("stdout-preserved\\n");
      process.stderr.write("stderr-preserved\\n");
      process.exit(7);
    `);
    let failure: unknown;
    await assert.rejects(
      runDetachedWorker(workerOptions(worker, "af9-supervisor-v3-nonzero")),
      error => { failure = error; return true; },
    );
    const record = evidence(failure);
    directPid = Number(record.pid);
    assert.equal(record.code, 7);
    assert.equal(record.signal, null);
    assert.equal(typeof record.elapsedMs, "number");
    assert.equal(Buffer.from(String(record.stdoutBase64), "base64").toString("utf8"), "stdout-preserved\n");
    assert.equal(Buffer.from(String(record.stderrBase64), "base64").toString("utf8"), "stderr-preserved\n");
    await waitForGone(directPid, "group");
  } finally {
    cleanup(directory, directPid, undefined);
  }
});

test("stdout overflow kills a TERM-resistant descendant after its parent closes", async () => {
  const directory = mkdtempSync(join(tmpdir(), "af9-supervisor-v3-overflow-"));
  let directPid: number | undefined;
  let childPid: number | undefined;
  try {
    const worker = writeWorker(directory, "overflow", `
      import { spawn } from "node:child_process";
      import { writeFileSync } from "node:fs";
      const child = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], {stdio: "ignore"});
      writeFileSync(new URL("./overflow.pid", import.meta.url), String(child.pid));
      setTimeout(() => process.stdout.write("x".repeat(4096)), 100);
      setInterval(() => {}, 1000);
    `);
    let failure: unknown;
    await assert.rejects(
      runDetachedWorker(workerOptions(worker, "af9-supervisor-v3-overflow")),
      error => { failure = error; return true; },
    );
    const record = evidence(failure);
    directPid = Number(record.pid);
    childPid = await readPid(join(directory, "overflow.pid"));
    assert.match(String(record.reason), /stdout exceeded/);
    assert.equal(record.stdoutBytes, 1_024);
    assert.equal(record.stderrBytes, 0);
    assert.equal(String(record.stdoutBase64).length, Math.ceil(1_024 / 3) * 4);
    await waitForGone(childPid);
    await waitForGone(directPid, "group");
  } finally {
    cleanup(directory, directPid, childPid);
  }
});

test("external timeout kills a TERM-resistant descendant after pipes close", async () => {
  const directory = mkdtempSync(join(tmpdir(), "af9-supervisor-v3-timeout-"));
  let directPid: number | undefined;
  let childPid: number | undefined;
  try {
    const worker = writeWorker(directory, "timeout", `
      import { spawn } from "node:child_process";
      import { writeFileSync } from "node:fs";
      const child = spawn(process.execPath, ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"], {stdio: "ignore"});
      writeFileSync(new URL("./timeout.pid", import.meta.url), String(child.pid));
      process.stdout.destroy();
      process.stderr.destroy();
      setInterval(() => {}, 1000);
    `);
    let failure: unknown;
    await assert.rejects(
      runDetachedWorker(workerOptions(worker, "af9-supervisor-v3-timeout")),
      error => { failure = error; return true; },
    );
    const record = evidence(failure);
    directPid = Number(record.pid);
    childPid = await readPid(join(directory, "timeout.pid"));
    assert.match(String(record.reason), /external timeout/);
    assert.equal(typeof record.elapsedMs, "number");
    await waitForGone(childPid);
    await waitForGone(directPid, "group");
  } finally {
    cleanup(directory, directPid, childPid);
  }
});
