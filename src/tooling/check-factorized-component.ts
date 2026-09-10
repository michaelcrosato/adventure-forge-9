import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { SCENARIO } from "../engine/content.js";
import { CAMPAIGN_CERTIFICATE_CONFIG, CAMPAIGN_RESOURCE_BOUNDS, currentCampaignCertificateBindings } from "../verification/campaign-certificate.js";
import { hashBytes, parseJsonBytes, readBoundedBytes, readForestArtifact, validateForestArtifact } from "../verification/certificate-files.js";
import { regenerateFailureSeeds } from "../verification/symbolic-certificates.js";
import { verifyFactorizedComponent } from "../verification/symbolic-factorized-certificates.js";
import { SymbolicModel } from "../verification/symbolic-model.js";

/** Historical-data component preflight, deliberately NOT a complete release verifier. */
export function checkFactorizedComponent(directoryInput: string, seedId: string, outputFile: string): void {
  const started = performance.now();
  const directory = resolve(directoryInput);
  const currentBindings = currentCampaignCertificateBindings();
  const entrypointHash = hashBytes(readFileSync(new URL(import.meta.url)));
  const inputBytes = readBoundedBytes(join(directory, "input.json"), 4 * 1024 * 1024);
  const failureBytes = readBoundedBytes(join(directory, "failure.json"), 4 * 1024 * 1024);
  const input = parseJsonBytes(inputBytes) as Record<string, unknown>;
  const failed = parseJsonBytes(failureBytes) as Record<string, unknown>;
  assert(input && typeof input === "object" && !Array.isArray(input));
  assert.equal(input.schema, "af9-factorized-candidate-input-v1");
  assert(failed && typeof failed === "object" && !Array.isArray(failed));
  assert.equal(failed.complete, false);
  const producerBindings = input.bindings as typeof currentBindings;
  assert(producerBindings && typeof producerBindings === "object");
  // Permit ONLY the named experimental verifier implementation to differ.
  // Gameplay, generator core, bounds, catalogs, and all other verifier files
  // must match. The complete-run verifier still requires every binding equal.
  const experimentalPath = "src/verification/symbolic-factorized-certificates.ts";
  assert.deepEqual({ ...producerBindings, runtimeVerifier: currentBindings.runtimeVerifier }, currentBindings);
  assert.deepEqual(producerBindings.runtimeVerifier.files.map(file => file.path), currentBindings.runtimeVerifier.files.map(file => file.path));
  assert.deepEqual(producerBindings.runtimeVerifier.files.filter(file => file.path !== experimentalPath),
    currentBindings.runtimeVerifier.files.filter(file => file.path !== experimentalPath));
  assert.equal(producerBindings.runtimeVerifier.sourceHash,
    hashBytes(Buffer.from(JSON.stringify(producerBindings.runtimeVerifier.files), "utf8")));
  const limits = { maxNodes: 2_000_000, maxJsonBytes: 128 * 1024 * 1024, maxCompressedBytes: 32 * 1024 * 1024 };
  assert(Array.isArray(failed.forests));
  const entries = failed.forests.map(value => validateForestArtifact(value, limits));
  const expectedIds = [...currentBindings.catalog.sceneIds.map(id => `non-completion:scene:${id}`), ...currentBindings.catalog.failureIds];
  assert.deepEqual(entries.map(entry => entry.id), expectedIds.slice(0, entries.length));
  assert(currentBindings.catalog.failureIds.includes(seedId), "Requested ID is not an authored failure seed");
  const entry = entries.find(value => value.id === seedId);
  assert(entry, "Requested component is not present in this failed run");
  const checkTime = () => assert(performance.now() - started <= 180_000, "Component preflight checked time limit exceeded");
  const recheck = () => {
    assert.deepEqual(currentCampaignCertificateBindings(), currentBindings, "Source changed during component preflight");
    assert.equal(hashBytes(readFileSync(new URL(import.meta.url))), entrypointHash);
    assert.equal(hashBytes(readBoundedBytes(join(directory, "input.json"), 4 * 1024 * 1024)), hashBytes(inputBytes));
    assert.equal(hashBytes(readBoundedBytes(join(directory, "failure.json"), 4 * 1024 * 1024)), hashBytes(failureBytes));
    assert.equal(hashBytes(readBoundedBytes(join(directory, entry.file), limits.maxCompressedBytes, entry.bytes)), entry.sha256);
  };
  const reportBase = { schema: "af9-factorized-component-preflight-v1", complete: false, accepted: false,
    producerBindings, currentBindings, entrypointHash, seedId, entry,
    inputHash: hashBytes(inputBytes), failureHash: hashBytes(failureBytes),
    scope: { experimentalVerifierDifferenceAllowedOnly: experimentalPath,
      allComponentsChecked: false, sceneCoverage: false, productionAdoption: false } };
  try {
    checkTime();
    const model = new SymbolicModel(SCENARIO, CAMPAIGN_RESOURCE_BOUNDS, CAMPAIGN_CERTIFICATE_CONFIG.verifier);
    const regenerated = regenerateFailureSeeds(model, {
      validDomain: model.validDomain, initial: model.initial, playing: model.playing, completed: model.completed,
    });
    const seed = regenerated.seeds.find(value => value.metadata.id === seedId);
    assert(seed);
    const result = verifyFactorizedComponent(model, seed.root, readForestArtifact(directory, entry, limits), {
      label: seedId, coneCompactAt: 1_000_000,
      onProgress: event => { checkTime(); process.stdout.write(JSON.stringify({ ...event, elapsedMs: performance.now() - started }) + "\n"); },
    });
    recheck();
    checkTime();
    writeFileSync(resolve(outputFile), JSON.stringify({ ...reportBase, componentVerified: true,
      finalNodes: result.model.bdd.stats().nodes, elapsedMs: performance.now() - started }) + "\n", { flag: "wx", mode: 0o600 });
    process.stdout.write(JSON.stringify({ type: "component-verified", seedId, complete: false, accepted: false,
      elapsedMs: performance.now() - started }) + "\n");
  } catch (error) {
    recheck();
    writeFileSync(resolve(outputFile), JSON.stringify({ ...reportBase, componentVerified: false,
      error: String(error), elapsedMs: performance.now() - started }) + "\n", { flag: "wx", mode: 0o600 });
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { values } = parseArgs({ options: { candidates: { type: "string" }, seed: { type: "string" }, output: { type: "string" } } });
  assert(values.candidates && values.seed && values.output, "Use --candidates DIRECTORY --seed FAILURE_ID --output NEW_REPORT");
  checkFactorizedComponent(values.candidates, values.seed, values.output);
}
