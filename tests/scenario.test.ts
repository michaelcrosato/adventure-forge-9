import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CAMPAIGN_CERTIFICATE_CONFIG,
  campaignCertificateRoot,
  currentCampaignCertificateBindings,
  type CampaignCertificateAudit,
} from "../src/verification/campaign-certificate.js";
import { runDetachedWorker } from "./helpers/detached-worker.js";

const policy = CAMPAIGN_CERTIFICATE_CONFIG.runtimePolicy;

// Authored reachability is independently replayed through the public engine
// in authored-endpoints.test.ts. This gate proves safety and completion for
// every reachable playing state, without claiming a reachable-state count.
test("every reachable playing state retains completion and every legal transition is safe", {
  timeout: policy.externalTimeoutMs + 30_000,
}, async context => {
  const expected = currentCampaignCertificateBindings();
  const evidence = mkdtempSync(join(tmpdir(), "af9-campaign-certificate-run-"));
  context.diagnostic(`Original certificate worker evidence: ${evidence}`);
  const result = await runDetachedWorker({
    worker: fileURLToPath(new URL("./helpers/campaign-certificate-runner.ts", import.meta.url)),
    cwd: campaignCertificateRoot(),
    nodeArgs: ["--import", createRequire(import.meta.url).resolve("tsx")],
    policy: {
      heapMiB: policy.nodeMaxOldSpaceSizeMiB,
      checkedElapsedMs: policy.checkedElapsedMs,
      externalTimeoutMs: policy.externalTimeoutMs,
    },
    evidencePrefix: "af9-campaign-certificate-failure",
  });
  writeFileSync(join(evidence, "stdout.jsonl"), result.stdout, { flag: "wx", mode: 0o600 });
  writeFileSync(join(evidence, "stderr.log"), result.stderr, { flag: "wx", mode: 0o600 });
  writeFileSync(join(evidence, "run.json"), JSON.stringify({
    schema: "af9-campaign-certificate-worker-run-v1",
    pid: result.pid, code: result.code, signal: result.signal,
    elapsedMs: result.elapsedMs, policy, bindings: expected,
  }) + "\n", { flag: "wx", mode: 0o600 });

  assert.equal(result.code, 0);
  assert.equal(result.signal, null);
  assert(result.elapsedMs <= policy.checkedElapsedMs, "Complete worker window exceeded the checked deadline");
  assert(result.stdoutText.endsWith("\n"), "Worker output must end with a complete record");
  const records: Record<string, unknown>[] = result.stdoutText.trimEnd().split("\n").map(line => {
    const record: unknown = JSON.parse(line);
    assert(record !== null && typeof record === "object" && !Array.isArray(record), "Worker record must be an object");
    return record as Record<string, unknown>;
  });
  assert(records.length > 1, "Fresh verification must emit progress before completion");
  for (const record of records.slice(0, -1)) {
    assert.equal(record.type, "progress", "Only one final completion record is allowed");
    assert(typeof record.phase === "string" && record.phase.length > 0);
    assert.equal(Object.hasOwn(record, "report"), false);
  }
  const last = records.at(-1)!;
  assert.deepEqual(Object.keys(last).sort(), ["report", "type"]);
  assert.equal(last.type, "complete", "Worker must end with the checked completion report");
  assert(last.report !== null && typeof last.report === "object" && !Array.isArray(last.report));
  const report = last.report as CampaignCertificateAudit;
  assert.equal(report.schema, "af9-campaign-certificate-audit-v1");
  assert.equal(report.complete, true);
  assert.equal(report.buildId, expected.build.buildId);
  assert.deepEqual(report.checkedSceneIds, expected.catalog.sceneIds);
  assert.deepEqual(report.checkedFailureSeedIds, expected.catalog.failureIds);
  assert.deepEqual(report.loadedForestIds, [
    ...expected.catalog.failureIds,
    ...expected.catalog.sceneIds.map(id => `non-completion:scene:${id}`),
  ]);
  for (const rounds of [report.completionRounds, report.completionOrFailureRounds]) {
    assert(Number.isSafeInteger(rounds) && rounds > 0 && rounds <= CAMPAIGN_CERTIFICATE_CONFIG.verifier.roundLimit);
  }
  assert(typeof report.globalCompletableAssignments === "string" && /^[1-9][0-9]*$/.test(report.globalCompletableAssignments));
  assert(Number.isFinite(report.elapsedMs) && report.elapsedMs > 0 && report.elapsedMs <= result.elapsedMs);
  assert.deepEqual(report.scope, {
    exactCompletionRecomputed: true,
    exactCompletionOrFailureRecomputed: true,
    backwardSafetyCertificatesVerified: true,
    sourceIntegrityRechecked: true,
    reachableStateCountClaimed: false,
    exactNonCompletionRecomputed: false,
    leastBadConesClaimed: false,
  });
  assert.deepEqual(currentCampaignCertificateBindings(), expected, "Source bindings changed while the worker ran");
  context.diagnostic(JSON.stringify({
    representation: "factorized-backward-safety-certificates",
    buildId: report.buildId,
    sceneObligations: report.checkedSceneIds.length,
    failureObligations: report.checkedFailureSeedIds.length,
    completionRounds: report.completionRounds,
    completionOrFailureRounds: report.completionOrFailureRounds,
    elapsedMs: result.elapsedMs,
    evidence,
    scope: report.scope,
  }));
});
