import assert from "node:assert/strict";
import { getHeapStatistics } from "node:v8";
import { auditCampaignCertificate, CAMPAIGN_CERTIFICATE_CONFIG } from "../../src/verification/campaign-certificate.js";

// This standalone worker keeps the large proof owner out of the test runner.
// The parent enforces the external deadline and the complete checked window.
assert.equal(process.argv.length, 2, "Campaign certificate worker accepts no arguments");
const requiredHeapFlag = `--max-old-space-size=${CAMPAIGN_CERTIFICATE_CONFIG.runtimePolicy.nodeMaxOldSpaceSizeMiB}`;
assert(process.execArgv.includes(requiredHeapFlag), `Campaign certificate worker requires ${requiredHeapFlag}`);
const maximumHeapMiB = CAMPAIGN_CERTIFICATE_CONFIG.runtimePolicy.nodeMaxOldSpaceSizeMiB + 64;
assert(getHeapStatistics().heap_size_limit <= maximumHeapMiB * 1024 * 1024, "Unexpected worker heap limit");
const { report } = auditCampaignCertificate(event => {
  process.stdout.write(`${JSON.stringify({ type: "progress", ...event })}\n`);
});
process.stdout.write(`${JSON.stringify({ type: "complete", report })}\n`);
