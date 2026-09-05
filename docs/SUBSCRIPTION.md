# Subscription player adapter

The Stage 1 subscription player uses the local Codex App Server from
`codex-cli 0.153.3`. Authentication stays in the user's managed Codex login;
the adapter checks `codex login status` for ChatGPT authentication and never
reads, copies, or records credentials. API-key authentication is rejected.

The adapter starts one fresh, ephemeral App Server thread and keeps its
thread ID for every gameplay and interview turn. The wire sequence is:

1. Send `initialize` with `capabilities.experimentalApi: true`, then send the
   `initialized` notification.
2. Read `config/read` with `includeLayers: true`. The isolation helper's flat
   session overrides, plus the requested `model_reasoning_effort`, are checked
   against the effective config and the raw session layer without writing the
   user's config. `account/read` is then checked for `account.type: "chatgpt"`;
   the account object is never recorded.
3. Send `thread/start` with the requested model, `ephemeral: true`, an empty
   environment selection, no runtime roots, no dynamic tools, read-only
   sandbox, `approvalPolicy: "never"`, an empty developer instruction, and the
   neutral runner instruction as `baseInstructions`.
4. Send `turn/start` for each prompt using the same `threadId`, the requested
   model and effort, `environments: []`, `runtimeWorkspaceRoots: []`, and
   `sandboxPolicy: {"type":"readOnly","networkAccess":false}`. A supplied
   JSON schema is scoped to that turn through `outputSchema`.

The primary benchmark is `gpt-5.6-luna` at `max` reasoning effort. The adapter
checks that the local catalog supports the requested effort, applies it both at
launch and on the thread, requires the thread to report the exact requested
model/provider/effort, rejects provider fallback, records the reported effort
and client version, and rejects a thread
that is not ephemeral, has instruction sources, has runtime workspace roots,
or reports a different sandbox or approval policy.

The source-backed boundary is `environments: []`: in the pinned Codex source,
the core tool planner does not register environment tools when the turn has no
environment. The helper also creates a one-model catalog with shell, patch,
search, skill, app, plugin, collaboration, image, and other client capability
metadata removed or disabled. It sets the update-plan and user-input config
switches off and explicitly disables configured MCP servers. The adapter sends
no dynamic tools and rejects any server capability request or capability item,
including shell, file changes, MCP, browser, image, process, web-search,
clock, and user-input requests. It also rejects unknown protocol notifications
so a new capability cannot be silently accepted under this version pin.

Only safe lifecycle and provider response events are forwarded to the evidence
writer. Completed agent messages and message deltas retain their original text
so the run can preserve the player's actual response. Account notifications,
stderr, authentication messages, and raw configuration layers are reduced to
safe markers or omitted. The original outgoing prompt is recorded separately
by the adapter before each turn. `close()` terminates the App Server and asks
the isolation helper to remove its temporary catalog, instruction file, and
empty workspace.

The protocol and settings were checked against the pinned source review at
`b1a547b1f73ce86205d9222ac19cff334b3b7a2e`, the generated experimental App
Server schema, and a no-turn local preflight. The preflight completed auth
verification, effective-config validation, and `thread/start` with
`gpt-5.6-luna`/`max`; it did not send gameplay or interview content. A live
playtest was then completed on frozen commit `04b492b`: the separate specialist
audit and the fresh blind rescue/interview both passed. See EVIDENCE.md for IDs,
limitations, and preserved artifacts. This proves the pinned client boundary and
one observed session; it is not independent attestation of remote model weights.

References: [Codex App Server](https://learn.chatgpt.com/docs/app-server),
[Authentication](https://learn.chatgpt.com/docs/auth),
[Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference),
[GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna).
