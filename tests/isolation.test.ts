import assert from "node:assert/strict";
import test from "node:test";
import { assertEffectiveIsolation } from "../src/playtest/isolation.js";

const expected = {
  approval_policy: "never",
  sandbox_mode: "read-only",
  web_search: "disabled",
  "features.shell_tool": false,
  "features.web_search_request": false,
  "tools.update_plan.enabled": false,
  "tools.experimental_request_user_input.enabled": false,
};

function effectiveConfig(): Record<string, unknown> {
  return {
    approval_policy: "never",
    sandbox_mode: "read-only",
    web_search: "disabled",
    features: { shell_tool: false, web_search_request: false },
    tools: {
      update_plan: { enabled: false },
      experimental_request_user_input: { enabled: false },
    },
    mcp_servers: {
      local_disabled: { enabled: false },
      provider_disabled: { enabled: false },
    },
  };
}

test("effective isolation accepts the expected boundary and disabled MCP entries", () => {
  assert.equal(assertEffectiveIsolation(effectiveConfig(), expected), true);

  // MCP paths are intentionally checked through effective server entries, not
  // as ordinary dotted overrides. Disabled entries must remain harmless.
  assert.equal(
    assertEffectiveIsolation(effectiveConfig(), {
      ...expected,
      "mcp_servers.local_disabled.enabled": true,
    }),
    true,
  );
});

test("effective isolation rejects any enabled MCP server", () => {
  const effective = effectiveConfig();
  (effective.mcp_servers as Record<string, unknown>).remote = { enabled: true };
  assert.throws(() => assertEffectiveIsolation(effective, expected), /enabled MCP server/);
});

test("effective isolation rejects missing or ineffective tool overrides", () => {
  const missing = effectiveConfig();
  delete (missing.tools as Record<string, unknown>).update_plan;
  assert.throws(() => assertEffectiveIsolation(missing, expected), /tools\.update_plan\.enabled/);

  const ineffective = effectiveConfig();
  ((ineffective.tools as Record<string, unknown>).update_plan as Record<string, unknown>).enabled = true;
  assert.throws(() => assertEffectiveIsolation(ineffective, expected), /tools\.update_plan\.enabled/);

  const missingFeature = effectiveConfig();
  delete (missingFeature.features as Record<string, unknown>).shell_tool;
  assert.throws(() => assertEffectiveIsolation(missingFeature, expected), /features\.shell_tool/);
});

