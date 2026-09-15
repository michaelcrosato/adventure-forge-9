import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { SCENARIO } from "../engine/content.js";
import { CAMPAIGN_CERTIFICATE_CONFIG, CAMPAIGN_RESOURCE_BOUNDS, currentCampaignCertificateBindings } from "../verification/campaign-certificate.js";
import { hashBytes, parseJsonBytes, readBoundedBytes, readForestArtifact, validateForestArtifact } from "../verification/certificate-files.js";
import { verifyFactorizedSymbolicCertificate } from "../verification/symbolic-factorized-certificates.js";
import { SymbolicModel } from "../verification/symbolic-model.js";

/** Independent relational proof check, explicitly separate from production adoption. */
export function verifyFactorizedCandidates(inputDirectory: string, outputFile: string): void {
  const started = performance.now();
  const directory = resolve(inputDirectory);
  const manifestPath = join(directory, "candidates.json");
  const bindings = currentCampaignCertificateBindings();
  const verifierHash = hashBytes(readFileSync(new URL(import.meta.url)));
  const bytes = readBoundedBytes(manifestPath, 4 * 1024 * 1024);
  const manifestHash = hashBytes(bytes);
  const raw = parseJsonBytes(bytes);
  assert(raw !== null && typeof raw === "object" && !Array.isArray(raw), "Candidate manifest must be an object");
  const input = raw as Record<string, unknown>;
  assert.equal(input.schema, "af9-factorized-candidate-generation-v1");
  assert.deepEqual(input.bindings, bindings, "Candidate source bindings differ from this checkout");
  assert(Array.isArray(input.forests), "Candidate forests must be an array");
  const limits = { maxNodes: 8_000_000, maxJsonBytes: 128 * 1024 * 1024, maxCompressedBytes: 32 * 1024 * 1024 };
  const entries = input.forests.map(entry => validateForestArtifact(entry, limits));
  const sceneIds = bindings.catalog.sceneIds;
  const sceneForestIds = sceneIds.map(id => `non-completion:scene:${id}`);
  const failureIds = bindings.catalog.failureIds;
  assert.deepEqual(entries.map(entry => entry.id), [...sceneForestIds, ...failureIds]);
  assert.equal(new Set(entries.map(entry => entry.file)).size, entries.length, "Artifact filenames must be unique");
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const loaded: string[] = [];
  const checkTime = () => assert(performance.now() - started <= CAMPAIGN_CERTIFICATE_CONFIG.runtimePolicy.checkedElapsedMs,
    "Factorized verification checked time limit exceeded");
  checkTime();
  const model = new SymbolicModel(SCENARIO, CAMPAIGN_RESOURCE_BOUNDS, CAMPAIGN_CERTIFICATE_CONFIG.verifier);
  const verificationStrategy = {
    roundLimit: CAMPAIGN_CERTIFICATE_CONFIG.verifier.roundLimit,
    completionCompactEvery: CAMPAIGN_CERTIFICATE_CONFIG.verifier.completionCompactEvery,
    coneCompactAt: 1_250_000,
  };
  const result = verifyFactorizedSymbolicCertificate(model, input.certificate, id => {
    checkTime();
    const entry = byId.get(id);
    assert(entry !== undefined, `Unknown forest ${id}`);
    assert(!loaded.includes(id), `Forest loaded twice: ${id}`);
    loaded.push(id);
    return readForestArtifact(directory, entry, limits);
  }, {
    ...verificationStrategy,
    onProgress: event => { checkTime(); process.stdout.write(JSON.stringify({ type: "progress", ...event, elapsedMs: performance.now() - started }) + "\n"); },
  });
  assert.equal(result.complete, true);
  assert.equal(result.checkedFailureForests, failureIds.length);
  assert.equal(result.checkedSceneForests, sceneIds.length);
  assert.deepEqual(result.sceneIds, sceneIds);
  assert.deepEqual(result.failureSeeds.map(seed => seed.id), failureIds);
  assert.deepEqual(loaded, [...failureIds, ...sceneForestIds]);
  for (const entry of entries) {
    assert.equal(hashBytes(readBoundedBytes(join(directory, entry.file), limits.maxCompressedBytes, entry.bytes)), entry.sha256, `Forest changed: ${entry.id}`);
  }
  assert.equal(hashBytes(readBoundedBytes(manifestPath, 4 * 1024 * 1024)), manifestHash, "Candidate manifest changed");
  assert.deepEqual(currentCampaignCertificateBindings(), bindings, "Source changed during verification");
  assert.equal(hashBytes(readFileSync(new URL(import.meta.url))), verifierHash, "Verification entrypoint changed");
  checkTime();
  writeFileSync(resolve(outputFile), JSON.stringify({
    schema: "af9-external-factorized-verification-v1", complete: true, accepted: false,
    bindings, verifierHash, manifestHash, verificationStrategy,
    completionRounds: result.completionRounds, completionOrFailureRounds: result.completionOrFailureRounds,
    sceneIds: result.sceneIds, failureSeeds: result.failureSeeds, loadedForestIds: loaded,
    elapsedMs: performance.now() - started,
    scope: { freshRelationalCertificateVerification: true, exactCompletionAndAbsorbedFoundationsRecomputed: true,
      sourceAndFilesRechecked: true, endpointReplay: false, productionAdoption: false, liveAcceptance: false },
  }) + "\n", { flag: "wx", mode: 0o600 });
  process.stdout.write(JSON.stringify({ type: "verified", scenes: sceneIds.length, failureSeeds: failureIds.length,
    accepted: false, elapsedMs: performance.now() - started }) + "\n");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { values } = parseArgs({ options: { candidates: { type: "string" }, output: { type: "string" } } });
  assert(values.candidates && values.output, "Use --candidates DIRECTORY and --output NEW_REPORT_FILE");
  verifyFactorizedCandidates(values.candidates, values.output);
}
