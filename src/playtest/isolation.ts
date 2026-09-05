import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest } from './evidence.js';
import { PLAYER_INSTRUCTION } from './prompts.js';

export const SUPPORTED_CLIENT_VERSION = 'codex-cli 0.153.3';
export const SOURCE_REVISION = 'b1a547b1f73ce86205d9222ac19cff334b3b7a2e';
const DISABLED_FEATURES = [
  'shell_tool', 'view_image', 'sleep_tool', 'deferred_executor', 'shell_snapshot',
  'code_mode', 'code_mode_only', 'code_mode_host', 'code_mode_prewarm',
  'web_search_request', 'web_search_cached', 'standalone_web_search', 'search_tool',
  'memories', 'external_agent_memory_import', 'hooks', 'multi_agent', 'multi_agent_v2',
  'apps', 'enable_mcp_apps', 'tool_search', 'deferred_tool_world_state', 'tool_suggest',
  'recommended_plugins', 'plugins', 'executor_capability_discovery', 'in_app_browser',
  'browser_use', 'browser_use_full_cdp_access', 'browser_use_external', 'computer_use',
  'remote_plugin', 'skill_mcp_dependency_install', 'skill_search', 'skill_env_var_dependency_prompt',
  'token_budget', 'current_time_reminder', 'image_generation', 'request_permissions_tool',
  'goals', 'context_management', 'artifact', 'realtime_conversation', 'remote_control',
  'workspace_dependencies', 'send_async_message', 'step_model_switching',
];

/** Disable local client capabilities without altering the requested remote model or its authentication. */
export async function buildIsolationConfig(model: string) {
  const clientHome = process.env.CODEX_HOME ?? join(homedir(), '.codex');
  const cachePath = join(clientHome, 'models_cache.json');
  if (!existsSync(cachePath)) throw new Error('Isolation requires a current Codex model catalog; sign in and refresh the supported client first');
  const cached = JSON.parse(readFileSync(cachePath, 'utf8'));
  const original = cached.models?.find((entry: Record<string, unknown>) => entry.slug === model);
  if (!original) throw new Error(`Requested model ${model} absent from local Codex catalog; no fallback permitted`);
  const metadataKeys = [
    'slug', 'display_name', 'description', 'default_reasoning_level', 'supported_reasoning_levels',
    'visibility', 'supported_in_api', 'priority', 'additional_speed_tiers', 'service_tiers', 'default_service_tier',
    'supports_reasoning_summary_parameter', 'default_reasoning_summary', 'support_verbosity', 'default_verbosity',
    'truncation_policy', 'context_window', 'max_context_window', 'auto_compact_token_limit',
    'effective_context_window_percent', 'use_responses_lite',
  ];
  const isolatedModel = {
    ...Object.fromEntries(metadataKeys.filter(key => key in original).map(key => [key, original[key]])),
    availability_nux: null, upgrade: null, input_modalities: ['text'],
    shell_type: 'disabled', apply_patch_tool_type: null, experimental_supported_tools: [],
    include_skills_usage_instructions: false, include_plugin_usage_instructions: false, include_apps_usage_instructions: false,
    supports_search_tool: false, node_repl_disabled: true, tool_mode: 'direct',
    model_messages: { instructions_template: PLAYER_INSTRUCTION, instructions_variables: null, persistent_instructions: '' },
  };
  const catalog = { models: [isolatedModel] };
  const directory = mkdtempSync(join(tmpdir(), 'af9-player-'));
  const cwd = join(directory, 'workspace');
  mkdirSync(cwd, { mode: 0o700 });
  const catalogPath = join(directory, 'catalog.json');
  const instructionPath = join(directory, 'instructions.txt');
  writeFileSync(catalogPath, JSON.stringify(catalog), { mode: 0o600 });
  writeFileSync(instructionPath, PLAYER_INSTRUCTION, { mode: 0o600 });
  const config: Record<string, unknown> = {
    model_provider: 'openai', model_catalog_json: catalogPath, model_instructions_file: instructionPath,
    instructions: '', developer_instructions: '', project_doc_max_bytes: 0,
    web_search: 'disabled', approval_policy: 'never', sandbox_mode: 'read-only',
    include_permissions_instructions: false, include_apps_instructions: false, include_collaboration_mode_instructions: false,
    include_environment_context: false,
    'tools.update_plan.enabled': false, 'tools.experimental_request_user_input.enabled': false,
    'skills.include_instructions': false, 'skills.bundled.enabled': false,
    'orchestrator.skills.enabled': false, 'orchestrator.mcp.enabled': false, 'features.skip_host_skill_discovery': true,
    'features.tool_registry.turn_metadata_includes_tool_info': true,
  };
  for (const key of DISABLED_FEATURES) config[`features.${key}`] = false;

  // Map overlays merge. Disable each known configured MCP server explicitly;
  // effective-config validation below also catches unrecognized or managed entries.
  const configPath = join(clientHome, 'config.toml');
  if (existsSync(configPath)) {
    const localConfig = readFileSync(configPath, 'utf8');
    const tables = localConfig.matchAll(/^\s*\[\s*mcp_servers\.((?:"(?:[^"\\]|\\.)*")|(?:[A-Za-z0-9_-]+))(?:\.[^\]]*)?\s*\]/gm);
    for (const table of tables) {
      const encoded = table[1]!;
      const name: string = encoded.startsWith('"') ? JSON.parse(encoded) : encoded;
      config[`mcp_servers.${JSON.stringify(name)}.enabled`] = false;
    }
  }
  const cliArgs = Object.entries(config).flatMap(([key, value]) => ['-c', `${key}=${JSON.stringify(value)}`]);
  const verification = {
    method: 'pinned source review plus effective config and runtime capability rejection',
    sourceRevision: SOURCE_REVISION,
    clientVersion: SUPPORTED_CLIENT_VERSION,
    catalogOriginalHash: digest(JSON.stringify(original)),
    catalogEffectiveHash: digest(JSON.stringify(catalog)),
    requestedModel: model,
    supportedReasoningLevels: original.supported_reasoning_levels,
    disabledFeatures: DISABLED_FEATURES,
    environments: [], dynamicTools: [], runtimeWorkspaceRoots: [],
    scope: 'Client tool registration and context loading; provider client retains managed auth and transport. No credential extraction.',
  };
  return { cwd, config, catalog, verification, cliArgs, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

export function assertEffectiveIsolation(effective: Record<string, any>, expected: Record<string, unknown>, layers: Array<Record<string, any>> = []) {
  const get = (path: string) => path.split('.').reduce<any>((node, key) => node?.[key], effective);
  for (const [path, value] of Object.entries(expected)) {
    if (path.startsWith('mcp_servers.')) continue;
    let actual = get(path);
    // Config's typed public Tools projection only includes web_search in 0.153.3.
    // The highest-priority resolved sessionFlags layer retains these two fields.
    if (actual === undefined && ['tools.update_plan.enabled', 'tools.experimental_request_user_input.enabled'].includes(path)) {
      const sessionLayer = layers.find(layer => layer.name?.type === 'sessionFlags');
      actual = path.split('.').reduce<any>((node, key) => node?.[key], sessionLayer?.config);
    }
    if (actual !== value) throw new Error(`Isolation boundary override not effective: ${path}`);
  }
  for (const [name, entry] of Object.entries(effective.mcp_servers ?? {})) {
    if ((entry as Record<string, unknown>).enabled !== false) throw new Error(`Isolation boundary has an enabled MCP server: ${name}`);
  }
  return true;
}
