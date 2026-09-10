import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { SCENARIO } from "../engine/content.js";
import { CAMPAIGN_CERTIFICATE_CONFIG, CAMPAIGN_RESOURCE_BOUNDS, currentCampaignCertificateBindings } from "../verification/campaign-certificate.js";
import { hashBytes, writeForestArtifact, type ForestArtifact } from "../verification/certificate-files.js";
import { certificateDescriptor } from "../verification/symbolic-certificates.js";
import { FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA } from "../verification/symbolic-factorized-certificates.js";
import { proveCompletionSafetyByObligation } from "../verification/symbolic-obligations.js";
import { FunctionalGeneratorModel } from "./generate-certificates.js";

/** Experimental candidate production only; no release acceptance is granted. */
export function generateFactorizedCandidates(output: string, maxElapsedMs = 900_000): void {
  assert(Number.isSafeInteger(maxElapsedMs) && maxElapsedMs > 0 && maxElapsedMs <= 1_800_000, "Generation time limit must be between 1 and 1800000 ms");
  const started = performance.now();
  const directory = resolve(output);
  mkdirSync(directory, { mode: 0o700 });
  const bindings = currentCampaignCertificateBindings();
  const sourceHashes = () => ({
    generator: hashBytes(readFileSync(new URL(import.meta.url))),
    functionalGenerator: hashBytes(readFileSync(new URL("./generate-certificates.ts", import.meta.url))),
  });
  const generatorHashes = sourceHashes();
  const limits = { maxNodes: 2_000_000, maxJsonBytes: 128 * 1024 * 1024, maxCompressedBytes: 32 * 1024 * 1024 };
  const strategy = { roundLimit: 128, nonCompletionMode: "failure-absorbed" as const,
    nonCompletionPartition: "scene" as const, failurePartition: "choice" as const,
    fixedPointCompactEvery: 1, obligationCompactEvery: 1, obligationChoiceCompactAt: 750_000,
    obligationChoiceCompactInterval: 250_000 };
  const forests: ForestArtifact[] = [];
  const save = (name: string, value: unknown) => writeFileSync(join(directory, name), JSON.stringify(value) + "\n", { flag: "wx", mode: 0o600 });
  const event = (value: unknown) => process.stdout.write(JSON.stringify(value) + "\n");
  const checkTime = () => assert(performance.now() - started <= maxElapsedMs, "Factorized generation checked time limit exceeded");
  const recheck = () => {
    assert.deepEqual(currentCampaignCertificateBindings(), bindings, "Source changed during generation");
    assert.deepEqual(sourceHashes(), generatorHashes, "Generator entrypoint or dependency changed");
  };
  save("input.json", { schema: "af9-factorized-candidate-input-v1", bindings, generatorHashes, strategy, limits, maxElapsedMs, accepted: false });
  try {
    checkTime();
    const model = new FunctionalGeneratorModel(SCENARIO, CAMPAIGN_RESOURCE_BOUNDS, CAMPAIGN_CERTIFICATE_CONFIG.verifier);
    const descriptor = certificateDescriptor(model);
    event({ type: "constructed", nodes: model.bdd.stats().nodes, elapsedMs: performance.now() - started });
    const result = proveCompletionSafetyByObligation(model, {
      ...strategy,
      onProgress: progress => { checkTime(); event({ type: "progress", ...progress, elapsedMs: performance.now() - started }); },
      onObligation: ({ model: owner, bad, summary }) => {
        checkTime();
        assert.equal(summary.initialInBad, false, `Initial state violates ${summary.id}`);
        const forest = writeForestArtifact(directory, forests.length, summary.id, owner.bdd.exportForest([bad]), limits);
        forests.push(forest);
        save(`candidate-${String(forests.length - 1).padStart(5, "0")}.json`, { forest, summary });
        event({ type: "candidate", forest, summary, elapsedMs: performance.now() - started });
        checkTime();
      },
    });
    assert.equal(result.complete, true);
    assert.equal(result.initialInBad, false);
    assert.deepEqual(forests.map(forest => forest.id), [
      ...bindings.catalog.sceneIds.map(id => `non-completion:scene:${id}`), ...bindings.catalog.failureIds,
    ]);
    recheck();
    checkTime();
    save("candidates.json", {
      schema: "af9-factorized-candidate-generation-v1", bindings, generatorHashes, strategy, forests,
      certificate: { schema: FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA, descriptor,
        sceneForests: bindings.catalog.sceneIds.map(sceneId => ({ sceneId, forestId: `non-completion:scene:${sceneId}` })),
        failureForests: bindings.catalog.failureIds.map(seedId => ({ seedId, forestId: seedId })),
      },
      completionRounds: result.completionRounds, completionOrFailureRounds: result.completionOrFailureRounds,
      obligations: result.obligations, elapsedMs: performance.now() - started, accepted: false,
    });
    checkTime();
    save("closed.json", { complete: true, accepted: false, elapsedMs: performance.now() - started });
    event({ type: "generated", forests: forests.length, accepted: false, elapsedMs: performance.now() - started });
  } catch (error) {
    let sourceError: string | undefined;
    try { recheck(); } catch (failure) { sourceError = String(failure); }
    save("failure.json", { complete: false, accepted: false, error: String(error),
      ...(sourceError === undefined ? {} : { sourceError }), forests, elapsedMs: performance.now() - started });
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { values } = parseArgs({ options: { output: { type: "string" }, "max-ms": { type: "string" } } });
  assert(values.output, "Use --output with a new directory outside the source tree");
  generateFactorizedCandidates(values.output, values["max-ms"] === undefined ? undefined : Number(values["max-ms"]));
}
