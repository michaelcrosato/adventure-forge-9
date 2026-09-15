import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { SCENARIO } from "../engine/content.js";
import {
  CAMPAIGN_CERTIFICATE_CONFIG, CAMPAIGN_RESOURCE_BOUNDS,
  currentCampaignCertificateBindings,
} from "../verification/campaign-certificate.js";
import {
  hashBytes, writeForestArtifact, type ForestArtifact,
} from "../verification/certificate-files.js";
import { certificateDescriptor, SYMBOLIC_CERTIFICATE_SCHEMA } from "../verification/symbolic-certificates.js";
import { SymbolicModel, type SymbolicChoice, type SymbolicOptions } from "../verification/symbolic-model.js";
import { proveCompletionSafetyByObligation } from "../verification/symbolic-obligations.js";

/** Generator-only evaluation strategy; the release verifier uses SymbolicModel. */
export class FunctionalGeneratorModel extends SymbolicModel {
  private readonly generatorBounds: Readonly<Record<string, number>>;
  private readonly generatorOptions: SymbolicOptions;

  constructor(input: unknown, bounds: Readonly<Record<string, number>>, options: SymbolicOptions = {}) {
    const fixedBounds = Object.freeze({ ...bounds });
    const fixedOptions = Object.freeze({ ...options,
      ...(options.fieldOrder === undefined ? {} : { fieldOrder: Object.freeze([...options.fieldOrder]) }),
    });
    super(input, fixedBounds, fixedOptions);
    this.generatorBounds = fixedBounds;
    this.generatorOptions = fixedOptions;
  }

  override fresh(): FunctionalGeneratorModel {
    return new FunctionalGeneratorModel(this.scenario, this.generatorBounds, this.generatorOptions);
  }

  override preimage(target: number, choice?: SymbolicChoice): number {
    if (choice !== undefined) return this.functionalPreimage(target, choice);
    // Generator-only accelerated closure operator, NOT a one-edge preimage.
    // Each monotone update stays inside Pre*(target). A complete unchanged
    // sweep is closed under every authored choice, so the surrounding least
    // fixed-point loop computes the same closure as synchronous iteration.
    // Keep per-choice calls exact: failure-seed construction depends on them.
    let closure = target;
    for (let index = this.choices.length - 1; index >= 0; index--) {
      closure = this.bdd.or(closure, this.functionalPreimage(closure, this.choices[index]!));
    }
    return closure;
  }
}

/** Produce untrusted candidate forests in an exclusively created directory. */
export function generateCampaignCandidates(output: string, maxElapsedMs = 180_000): void {
  assert(Number.isSafeInteger(maxElapsedMs) && maxElapsedMs > 0 && maxElapsedMs <= 1_800_000,
    "Generation time limit must be a positive integer no greater than 1800000 ms");
  const started = performance.now();
  const directory = resolve(output);
  mkdirSync(directory, { mode: 0o700 });
  const bindings = currentCampaignCertificateBindings();
  const generatorHash = hashBytes(readFileSync(new URL(import.meta.url)));
  const limits = { maxNodes: 8_000_000, maxJsonBytes: 128 * 1024 * 1024, maxCompressedBytes: 32 * 1024 * 1024 };
  const obligationChoiceCompactAt = 750_000;
  const forests: ForestArtifact[] = [];
  const saveJson = (name: string, value: unknown) => writeFileSync(join(directory, name),
    JSON.stringify(value) + "\n", { flag: "wx", mode: 0o600 });
  const event = (value: unknown) => process.stdout.write(JSON.stringify(value) + "\n");
  const checkTime = () => assert(performance.now() - started <= maxElapsedMs, "Candidate generation checked time limit exceeded");
  const recheckSource = () => {
    assert.deepEqual(currentCampaignCertificateBindings(), bindings, "Source changed during candidate generation");
    assert.equal(hashBytes(readFileSync(new URL(import.meta.url))), generatorHash, "Generator source changed during the run");
  };
  saveJson("input.json", { schema: "af9-functional-candidate-input-v1", bindings, generatorHash,
    strategy: "functional-preimage-reverse-sweeps", obligationChoiceCompactAt, maxElapsedMs, limits, accepted: false });
  try {
    checkTime();
    const model = new FunctionalGeneratorModel(SCENARIO, CAMPAIGN_RESOURCE_BOUNDS, CAMPAIGN_CERTIFICATE_CONFIG.verifier);
    const descriptor = certificateDescriptor(model);
    event({ type: "constructed", nodes: model.bdd.stats().nodes, fields: model.fieldOrder.length,
      stateBits: model.currentVariables.length, elapsedMs: performance.now() - started });
    const result = proveCompletionSafetyByObligation(model, {
      roundLimit: 128,
      nonCompletionMode: "failure-absorbed",
      nonCompletionPartition: "scene",
      failurePartition: "combined",
      fixedPointCompactEvery: 1,
      obligationCompactEvery: 1,
      obligationChoiceCompactAt,
      onProgress: progress => { checkTime(); event({ type: "progress", ...progress, elapsedMs: performance.now() - started }); },
      onObligation: ({ model: owner, bad, summary }) => {
        checkTime();
        assert.equal(summary.initialInBad, false, `Initial state violates ${summary.id}`);
        const forest = writeForestArtifact(directory, forests.length, summary.id, owner.bdd.exportForest([bad]), limits);
        forests.push(forest);
        saveJson(`candidate-${String(forests.length - 1).padStart(5, "0")}.json`, { forest, summary });
        event({ type: "candidate", forest, summary, elapsedMs: performance.now() - started });
        checkTime();
      },
    });
    assert.equal(result.complete, true);
    assert.equal(result.initialInBad, false);
    assert.deepEqual(forests.map(forest => forest.id), [
      ...SCENARIO.scenes.map(scene => `non-completion:scene:${scene.id}`), "failure-union:",
    ]);
    recheckSource();
    checkTime();
    saveJson("candidates.json", {
      schema: "af9-candidate-generation-v1", bindings, generatorHash, forests,
      certificate: { schema: SYMBOLIC_CERTIFICATE_SCHEMA, descriptor, failureForestId: "failure-union:",
        sceneForests: SCENARIO.scenes.map(scene => ({ sceneId: scene.id, forestId: `non-completion:scene:${scene.id}` })),
      },
      completionRounds: result.completionRounds, completionOrFailureRounds: result.completionOrFailureRounds,
      failureSeeds: result.failureSeeds, obligations: result.obligations,
      elapsedMs: performance.now() - started, accepted: false,
    });
    checkTime();
    saveJson("closed.json", { complete: true, accepted: false, elapsedMs: performance.now() - started });
    event({ type: "generated", forests: forests.length, accepted: false, elapsedMs: performance.now() - started });
  } catch (error) {
    let sourceError: string | undefined;
    try { recheckSource(); } catch (failure) { sourceError = String(failure); }
    saveJson("failure.json", { complete: false, accepted: false, error: String(error),
      ...(sourceError === undefined ? {} : { sourceError }), forests, elapsedMs: performance.now() - started });
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { values } = parseArgs({ options: { output: { type: "string" }, "max-ms": { type: "string" } } });
  assert(values.output, "Use --output with a new directory outside the source tree");
  generateCampaignCandidates(values.output, values["max-ms"] === undefined ? undefined : Number(values["max-ms"]));
}
