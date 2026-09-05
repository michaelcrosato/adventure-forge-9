# Agent benchmark

Reference: `gpt-5.6-luna`, reasoning `max`, as requested. These are development workers, not blind playtesters. Service cost and exact per-worker token counts are unavailable; no dollar estimates are claimed.

| Task | Accepted output | Manager/peer corrections | Timing evidence |
| --- | --- | --- | --- |
| Minimal engine and proofs | Immutable state, typed content, legality, hashes, replay, saves; 7 test cases | Clarified cargo stakes, readable facts, deterministic filename order, runtime build identity, rehashed checkpoint rejection, cumulative resource safety | Not instrumented precisely |
| Human player surfaces | Terminal, local HTTP, responsive browser, save/load/export; 2 test cases | Reduced header/padding, removed internal IDs, displayed ending receipt; browser verified | Not instrumented precisely |
| Independent engine audit | Traversal of 9 reachable states; cumulative resource defect reproduced | Resource issue integrated by engine worker | Not instrumented precisely |
| Isolation assertions | 3 tests for effective config and MCP boundaries | Manager added resolved-layer checks for fields omitted by typed API | Not instrumented precisely |
| Subscription research/adapter | App Server adapter, exact model/auth/config checks, same-thread turns; no-turn initialization passes | Manager supplied pinned source review, explicit capability configuration and real config preflight; integrated with 16 passing tests | Not instrumented precisely; research handoff was delayed |

No other model has yet been measured on equivalent tasks, so there is no defensible cost or speed ranking.

Stage 2 follow-ups retained Luna/max. The browser worker reported roughly 4.5 minutes for durable journal rendering, disclosure and session resume; the manager corrected same-place wording, numbering, focus and scroll. The source-matched archive verification worker delivered a safe workflow and two tests; the manager replayed the original live game from its trusted commit. The content worker delivered 11 scenes and three resolution witnesses, but review required substantial repairs: scout costs without benefit, invisible tools, a trapped clinic detour, premature evacuation counts, stale outcomes, and medicine with no coherent use. Reachability alone did not catch those quality failures. Short read-only peer audits were useful; elapsed authoring time was not instrumented precisely.

## Workflow adjustment

The subscription research task ran too long without a usable handoff. Its worker reported that interim commentary did not reach the manager and direct collaboration messaging was unavailable on its tool surface. Future critical-path tasks should be one bounded module or one decisive probe, return a final handoff promptly, and continue under a follow-up assignment. Write interfaces first so integration can proceed while implementation continues. Measure task start/finish explicitly in future assignments instead of reconstructing timing.

Successful delivery means reviewed behavior and passing checks, not code volume. Root review caught correctness and player-facing gaps that the initial tests did not cover; preserve those regression checks when extending the game.

## Subsequent bounded tasks

The navigation reviewer reported about 4.1 minutes to audit 25 movement choices and propose 18 wording changes. The manager used only the two clinic choices for a controlled revision. The comprehension runner was delivered with 20 passing tests; review required trusted historical-engine matching and source-freeze checks, and removal of example boolean answers from its prompt. Its 393-line size exceeded the suggested small helper; no exact elapsed/cost figure was recorded.

The engine performance worker reported about eight minutes, with a private identity cache for internally copied/frozen states, a per-scene choice index, and three additional tests. Independent copies, mutable external objects, frozen forgeries and rehashed saves still receive validation. A bounded worker benchmark on a real 12-action small-game witness reported baseline 177.635 ms versus optimized 5.445 ms for 1,000 iterations with two observes each. This is repeated observation of one short witness, not long-campaign/world-scale evidence; timings are machine-dependent. Main integration and subsequent content require their own regression checks.
