import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SCENARIO } from "../engine/content.js";
import {
  CAMPAIGN_CERTIFICATE_CONFIG, CAMPAIGN_RESOURCE_BOUNDS,
  currentCampaignCertificateBindings,
} from "../verification/campaign-certificate.js";
import { SymbolicModel } from "../verification/symbolic-model.js";

/** Compare successful domains and each output bit over the full bounded input domain. */
export function checkFunctionalCampaign(): void {
  const started = performance.now();
  const bindings = currentCampaignCertificateBindings();
  let comparisons = 0;
  let peakNodes = 0;
  for (let index = 0; index < SCENARIO.choices.length; index++) {
    // Dispose of each choice's temporary operation nodes before moving on.
    const model = new SymbolicModel(SCENARIO, CAMPAIGN_RESOURCE_BOUNDS, CAMPAIGN_CERTIFICATE_CONFIG.verifier);
    const choice = model.choices[index]!;
    assert.equal(choice.id, SCENARIO.choices[index]!.id);
    assert.equal(model.functionalPreimage(1, choice), model.preimage(1, choice), `${choice.id}: successful domain`);
    comparisons++;
    for (const variable of model.currentVariables) {
      const target = model.bdd.variable(variable);
      assert.equal(model.functionalPreimage(target, choice), model.preimage(target, choice),
        `${choice.id}: output variable ${variable}`);
      comparisons++;
    }
    peakNodes = Math.max(peakNodes, model.bdd.stats().nodes);
    process.stdout.write(JSON.stringify({ type: "choice", id: choice.id, comparisons,
      nodes: model.bdd.stats().nodes, elapsedMs: performance.now() - started }) + "\n");
  }
  assert.deepEqual(currentCampaignCertificateBindings(), bindings, "Source changed during kernel comparison");
  process.stdout.write(JSON.stringify({ type: "complete", choices: SCENARIO.choices.length, comparisons,
    peakNodes, elapsedMs: performance.now() - started, bindings,
    scope: "successful domains and individual output-bit predicates; not a campaign safety proof" }) + "\n");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) checkFunctionalCampaign();
