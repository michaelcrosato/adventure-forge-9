import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const DEFAULT_TERMINATION_GRACE_MS = 2_000;
const DEFAULT_GROUP_EXIT_GRACE_MS = 2_000;

export interface DetachedWorkerPolicy {
  readonly heapMiB: number;
  readonly checkedElapsedMs: number;
  readonly externalTimeoutMs: number;
  readonly maxOutputBytes?: number;
  readonly terminationGraceMs?: number;
  readonly groupExitGraceMs?: number;
}

export interface DetachedWorkerOptions {
  readonly worker: string;
  readonly cwd: string;
  readonly policy: DetachedWorkerPolicy;
  readonly nodeArgs?: readonly string[];
  readonly evidencePrefix?: string;
}

export type CloseResult = {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
};

export interface DetachedWorkerResult {
  readonly pid: number;
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly stdoutText: string;
  readonly stderrText: string;
  readonly elapsedMs: number;
}

type CapturedOutput = {
  readonly chunks: Buffer[];
  bytes: number;
  truncated: boolean;
};

type NormalizedOptions = {
  readonly worker: string;
  readonly cwd: string;
  readonly heapMiB: number;
  readonly checkedElapsedMs: number;
  readonly externalTimeoutMs: number;
  readonly maxOutputBytes: number;
  readonly terminationGraceMs: number;
  readonly groupExitGraceMs: number;
  readonly nodeArgs: readonly string[];
  readonly evidencePrefix: string;
};

function positiveSafeInteger(name: string, value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
  return value as number;
}

function normalizeOptions(options: DetachedWorkerOptions): NormalizedOptions {
  if (options === null || typeof options !== "object") {
    throw new TypeError("Worker options must be an object");
  }
  const worker = options.worker;
  const cwd = options.cwd;
  if (typeof worker !== "string" || worker.length === 0) {
    throw new TypeError("Worker path must be a nonempty string");
  }
  if (typeof cwd !== "string" || cwd.length === 0) {
    throw new TypeError("Worker cwd must be a nonempty string");
  }
  const policy = options.policy;
  if (policy === null || typeof policy !== "object") {
    throw new TypeError("Worker policy must be an object");
  }
  const heapMiB = positiveSafeInteger("heapMiB", policy.heapMiB);
  const checkedElapsedMs = positiveSafeInteger("checkedElapsedMs", policy.checkedElapsedMs);
  const externalTimeoutMs = positiveSafeInteger("externalTimeoutMs", policy.externalTimeoutMs);
  const maxOutputBytes = policy.maxOutputBytes === undefined
    ? DEFAULT_MAX_OUTPUT_BYTES
    : positiveSafeInteger("maxOutputBytes", policy.maxOutputBytes);
  const terminationGraceMs = policy.terminationGraceMs === undefined
    ? DEFAULT_TERMINATION_GRACE_MS
    : positiveSafeInteger("terminationGraceMs", policy.terminationGraceMs);
  const groupExitGraceMs = policy.groupExitGraceMs === undefined
    ? DEFAULT_GROUP_EXIT_GRACE_MS
    : positiveSafeInteger("groupExitGraceMs", policy.groupExitGraceMs);
  const nodeArgs = options.nodeArgs === undefined ? [] : [...options.nodeArgs];
  if (!nodeArgs.every(argument => typeof argument === "string")) {
    throw new TypeError("nodeArgs must contain only strings");
  }
  const evidencePrefix = options.evidencePrefix ?? "af9-detached-worker-failure";
  if (!/^[A-Za-z0-9_-]+$/.test(evidencePrefix)) {
    throw new TypeError("evidencePrefix contains unsafe path characters");
  }
  return Object.freeze({
    worker,
    cwd,
    heapMiB,
    checkedElapsedMs,
    externalTimeoutMs,
    maxOutputBytes,
    terminationGraceMs,
    groupExitGraceMs,
    nodeArgs: Object.freeze(nodeArgs),
    evidencePrefix,
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function processGroupPid(pid: number): number {
  if (!Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid) {
    throw new Error(`Refusing to signal invalid or parent process group ${pid}`);
  }
  return -pid;
}

function signalProcessGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(processGroupPid(pid), signal);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? (error as { readonly code?: unknown }).code
      : undefined;
    if (code !== "ESRCH") throw error;
  }
}

async function waitForCloseWithin(close: Promise<CloseResult>, milliseconds: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  return new Promise(resolve => {
    timer = setTimeout(() => resolve(false), milliseconds);
    void close.then(() => {
      if (timer !== undefined) clearTimeout(timer);
      resolve(true);
    });
  });
}

async function waitForProcessGroupExit(pid: number, milliseconds: number): Promise<boolean> {
  const group = processGroupPid(pid);
  const deadline = performance.now() + milliseconds;
  while (true) {
    try {
      process.kill(group, 0);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? (error as { readonly code?: unknown }).code
        : undefined;
      if (code === "ESRCH") return true;
      throw error;
    }
    const remaining = deadline - performance.now();
    if (remaining <= 0) return false;
    await delay(Math.min(25, remaining));
  }
}

async function observeProcessGroupExit(
  pid: number,
  milliseconds: number,
): Promise<{ readonly exited: boolean; readonly error?: unknown }> {
  try {
    return { exited: await waitForProcessGroupExit(pid, milliseconds) };
  } catch (error) {
    return { exited: false, error };
  }
}

async function terminateProcessGroup(
  child: ChildProcess,
  pid: number,
  close: Promise<CloseResult>,
  terminationGraceMs: number,
  groupExitGraceMs: number,
): Promise<void> {
  let firstError: unknown;
  try {
    signalProcessGroup(pid, "SIGTERM");
  } catch (error) {
    firstError = error;
  }

  const [closedAfterTerm, groupAfterTerm] = await Promise.all([
    waitForCloseWithin(close, terminationGraceMs),
    observeProcessGroupExit(pid, terminationGraceMs),
  ]);
  if (groupAfterTerm.error !== undefined) firstError ??= groupAfterTerm.error;

  // Check group liveness independently from the direct child's close event.
  // A descendant may have released the pipes after the parent closed while
  // continuing to ignore SIGTERM. SIGKILL is mandatory whenever the group
  // still exists, including that direct-close case.
  if (!groupAfterTerm.exited) {
    try {
      signalProcessGroup(pid, "SIGKILL");
    } catch (error) {
      firstError ??= error;
    }
    const [closedAfterKill, groupAfterKill] = await Promise.all([
      waitForCloseWithin(close, groupExitGraceMs),
      observeProcessGroupExit(pid, groupExitGraceMs),
    ]);
    if (!closedAfterKill) firstError ??= new Error("Worker did not emit close after group SIGKILL");
    if (groupAfterKill.error !== undefined) firstError ??= groupAfterKill.error;
    if (!groupAfterKill.exited) {
      firstError ??= new Error(`Worker process group ${pid} did not close after SIGKILL`);
    }
  } else if (!closedAfterTerm) {
    firstError ??= new Error("Worker process group closed without a child close event");
  }

  if (firstError !== undefined) throw firstError;
  // Keep the ChildProcess parameter in the contract so this function cannot
  // silently regress to child-only termination.
  void child;
}

function appendOutput(captured: CapturedOutput, chunk: Buffer | string, maximum: number): boolean {
  if (captured.truncated) return true;
  const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  const remaining = maximum - captured.bytes;
  if (bytes.length > remaining) {
    if (remaining > 0) captured.chunks.push(bytes.subarray(0, remaining));
    captured.bytes = maximum;
    captured.truncated = true;
    return true;
  }
  captured.chunks.push(bytes);
  captured.bytes += bytes.length;
  return false;
}

function capturedBuffer(captured: CapturedOutput): Buffer {
  return Buffer.concat(captured.chunks, captured.bytes);
}

function failureEvidence(
  reason: string,
  result: Partial<DetachedWorkerResult> & { readonly stdout?: Buffer; readonly stderr?: Buffer },
  prefix: string,
): string {
  const path = join(tmpdir(), `${prefix}-${process.pid}-${process.hrtime.bigint()}.json`);
  const body = {
    schema: "af9-detached-worker-failure-v3",
    reason,
    pid: result.pid ?? null,
    code: result.code ?? null,
    signal: result.signal ?? null,
    elapsedMs: result.elapsedMs ?? null,
    stdoutBytes: result.stdout?.length ?? 0,
    stderrBytes: result.stderr?.length ?? 0,
    stdoutBase64: result.stdout?.toString("base64") ?? "",
    stderrBase64: result.stderr?.toString("base64") ?? "",
  };
  writeFileSync(path, `${JSON.stringify(body)}\n`, { flag: "wx", mode: 0o600 });
  return path;
}

export function writeDetachedWorkerFailureEvidence(
  reason: string,
  result: Partial<DetachedWorkerResult> & { readonly stdout?: Buffer; readonly stderr?: Buffer },
  prefix = "af9-detached-worker-failure",
): string {
  if (typeof reason !== "string" || reason.length === 0) throw new TypeError("Failure reason must be nonempty");
  if (!/^[A-Za-z0-9_-]+$/.test(prefix)) throw new TypeError("Failure evidence prefix contains unsafe path characters");
  return failureEvidence(reason, result, prefix);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function excerpt(bytes: Buffer): string {
  const text = bytes.toString("utf8");
  return text.length > 2_000 ? `${text.slice(0, 2_000)}…` : text;
}

function makeResult(
  pid: number,
  closed: CloseResult,
  stdoutCapture: CapturedOutput,
  stderrCapture: CapturedOutput,
  started: number,
): DetachedWorkerResult {
  const stdout = capturedBuffer(stdoutCapture);
  const stderr = capturedBuffer(stderrCapture);
  return Object.freeze({
    pid,
    code: closed.code,
    signal: closed.signal,
    stdout,
    stderr,
    stdoutText: stdout.toString("utf8"),
    stderrText: stderr.toString("utf8"),
    elapsedMs: performance.now() - started,
  });
}

function throwFailure(
  failures: readonly string[],
  result: Partial<DetachedWorkerResult> & { readonly stdout?: Buffer; readonly stderr?: Buffer },
  prefix: string,
): never {
  let artifact: string;
  try {
    artifact = failureEvidence(failures.join("; "), result, prefix);
  } catch (evidenceError) {
    throw new Error(`Detached worker failed and failure evidence could not be preserved: ${errorText(evidenceError)}`, { cause: evidenceError });
  }
  const stdout = result.stdout ?? Buffer.alloc(0);
  const stderr = result.stderr ?? Buffer.alloc(0);
  throw new Error(`Detached worker failed: ${failures.join("; ")}\nFailure evidence: ${artifact}\nstdout:\n${excerpt(stdout)}\nstderr:\n${excerpt(stderr)}`);
}

export async function runDetachedWorker(options: DetachedWorkerOptions): Promise<DetachedWorkerResult> {
  const normalized = normalizeOptions(options);
  if (process.platform !== "linux") {
    throw new Error("Detached worker supervision requires Linux process groups");
  }
  const started = performance.now();
  let child: ChildProcess;
  try {
    child = spawn(process.execPath, [
      `--max-old-space-size=${normalized.heapMiB}`,
      ...normalized.nodeArgs,
      normalized.worker,
    ], {
      cwd: normalized.cwd,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const elapsedMs = performance.now() - started;
    let artifact: string;
    try {
      artifact = failureEvidence(`worker spawn failed: ${errorText(error)}`, { elapsedMs }, normalized.evidencePrefix);
    } catch (evidenceError) {
      throw new Error(`Worker spawn failed and failure evidence could not be preserved: ${errorText(evidenceError)}`, { cause: error });
    }
    throw new Error(`Worker spawn failed; failure evidence: ${artifact}`, { cause: error });
  }

  const stdoutCapture: CapturedOutput = { chunks: [], bytes: 0, truncated: false };
  const stderrCapture: CapturedOutput = { chunks: [], bytes: 0, truncated: false };
  const pid = child.pid;
  const close = new Promise<CloseResult>(resolve => {
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  let spawnError: Error | undefined;
  let terminationReason: string | undefined;
  let terminationPromise: Promise<void> | undefined;
  let terminationError: unknown;
  const requestTermination = (reason: string): void => {
    terminationReason ??= reason;
    if (terminationPromise !== undefined) return;
    if (pid === undefined) {
      terminationError = new Error("Worker did not expose a process-group PID");
      return;
    }
    terminationPromise = terminateProcessGroup(
      child,
      pid,
      close,
      normalized.terminationGraceMs,
      normalized.groupExitGraceMs,
    );
    void terminationPromise.catch(error => {
      terminationError ??= error;
    });
  };

  child.once("error", error => { spawnError = error; });
  if (child.stdout === null || child.stderr === null) {
    requestTermination("worker did not provide bounded stdout/stderr pipes");
  } else {
    child.stdout.on("data", chunk => {
      if (appendOutput(stdoutCapture, chunk, normalized.maxOutputBytes)) {
        requestTermination(`worker stdout exceeded the ${normalized.maxOutputBytes}-byte cap`);
      }
    });
    child.stderr.on("data", chunk => {
      if (appendOutput(stderrCapture, chunk, normalized.maxOutputBytes)) {
        requestTermination(`worker stderr exceeded the ${normalized.maxOutputBytes}-byte cap`);
      }
    });
  }

  if (pid === undefined || !Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid) {
    requestTermination(`worker returned an invalid process-group PID ${String(pid)}`);
  }

  let deadlineTimer: NodeJS.Timeout | undefined;
  const deadline = new Promise<"deadline">(resolve => {
    deadlineTimer = setTimeout(() => {
      requestTermination(`external timeout ${normalized.externalTimeoutMs}ms exceeded`);
      resolve("deadline");
    }, normalized.externalTimeoutMs);
  });
  const outcome = await Promise.race([
    close.then(closed => ({ kind: "closed" as const, closed })),
    deadline.then(() => ({ kind: "deadline" as const })),
  ]);
  if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);

  let closed: CloseResult | undefined = outcome.kind === "closed" ? outcome.closed : undefined;
  if (closed === undefined) {
    if (terminationPromise !== undefined) {
      try {
        await terminationPromise;
      } catch (error) {
        terminationError ??= error;
      }
    }
    const closedAfterTermination = await waitForCloseWithin(close, normalized.groupExitGraceMs);
    if (!closedAfterTermination) {
      const partial = makeResult(pid ?? -1, { code: null, signal: null }, stdoutCapture, stderrCapture, started);
      const failures = [
        ...(terminationReason === undefined ? [] : [terminationReason]),
        ...(terminationError === undefined ? [] : [`worker termination failed: ${errorText(terminationError)}`]),
        "worker did not close after bounded group termination",
      ];
      throwFailure(failures, partial, normalized.evidencePrefix);
    }
    closed = await close;
  }

  if (terminationPromise !== undefined) {
    try {
      await terminationPromise;
    } catch (error) {
      terminationError ??= error;
    }
  }

  // A successful direct close is insufficient evidence that the detached
  // process group is empty. Check it on every exit path and clean up any
  // remaining descendants before returning or reporting the result.
  if (pid !== undefined && terminationPromise === undefined) {
    const groupAfterClose = await observeProcessGroupExit(pid, normalized.groupExitGraceMs);
    if (groupAfterClose.error !== undefined) {
      terminationError ??= groupAfterClose.error;
      requestTermination("could not verify detached process-group exit");
    } else if (!groupAfterClose.exited) {
      requestTermination("worker process group remained after worker close");
    }
    if (terminationPromise !== undefined) {
      try {
        await terminationPromise;
      } catch (error) {
        terminationError ??= error;
      }
    }
  }

  const result = makeResult(pid ?? -1, closed, stdoutCapture, stderrCapture, started);
  const failures = [
    ...(spawnError === undefined ? [] : [`worker error: ${spawnError.message}`]),
    ...(terminationReason === undefined ? [] : [terminationReason]),
    ...(terminationError === undefined ? [] : [`worker termination failed: ${errorText(terminationError)}`]),
    ...(stdoutCapture.truncated ? ["worker stdout was truncated"] : []),
    ...(stderrCapture.truncated ? ["worker stderr was truncated"] : []),
    ...(closed.signal === null ? [] : [`worker terminated by ${closed.signal}`]),
    ...(closed.code === 0 ? [] : [`worker exited with code ${String(closed.code)}`]),
  ];
  if (failures.length > 0) {
    throwFailure(failures, result, normalized.evidencePrefix);
  }
  return result;
}
