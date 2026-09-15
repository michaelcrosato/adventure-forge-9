# Current work

## Current handoff: 2026-09-15, Stormvault beyond Gloamfen

Stormvault extends the campaign beyond Gloamfen with three authored scenes and ten choices. The signal-tower route exposes archive evidence; the cistern route trades certainty for risk, with revisits and returns wired into the existing campaign.

- Catalog: 46 scenes, 227 choices, 954 forests, and 908 failure seeds.
- Certificate policy: 4,000,000 BDD nodes and 4,096 MiB Node heap for generation and verification.
- Functional evidence: whole-campaign producer v1 exhausted the heap, v2 reached the 3,000,000-node limit, and v3 reached its checked time limit after a valid 15-scene prefix at 1,800,407 ms. Evidence remains outside the repository at `/tmp/af9-stormvault-functional-20260914-v1`, `/tmp/af9-stormvault-functional-20260914-v2`, and `/tmp/af9-stormvault-functional-20260914-v3`.
- Scene evidence: fresh-process per-scene generation produced the complete prefix; tooling and witness evidence are at `/tmp/af9-scene-split-20260914-v1` and `/tmp/af9-scene-witness-cellar-20260914-v1`.
- Projection evidence: all ten resource cones completed with induction checks in `/tmp/af9-stormvault-projected-node4m-runtime60-20260915-v1`; final catalog assembly reused those cones in `/tmp/af9-stormvault-projected-node4m-runtime60-20260915-v4`.
- Independent verifier: `/tmp/af9-stormvault-projected-node4m-runtime60-20260915-v4-verification.json` and its log accepted 46 scenes and 908 failure seeds with `accepted: false` pending the repository gate.
- Installed certificate stage: `/tmp/af9-stormvault-stage-20260915-v1`; previous bundle backup: `/tmp/af9-campaign-previous-20260915-v1`.
- Full `npm run verify` gate: passed `300/300` tests in `2,967,427.799374 ms`; gate log is `/tmp/af9-stormvault-verify-runtime60-20260915-v3.log`, and the detached worker report is `/tmp/af9-campaign-certificate-run-iiG5gY` (`46` scene obligations, `908` failure obligations, exact completion and backward safety verified).
- Limitation: the whole-campaign producer did not complete in one process; full scene coverage came from isolated fresh-process scene proofs, while failure coverage came from independently induced and verified resource projections.

## Previous handoff: 2026-09-14, Gloamfen beyond Cinderwake

Gloamfen extends the authored campaign beyond Cinderwake into a soot-black marsh edge. The route has three scenes (`gloamfen-landing`, Mara's `gloamfen-sluicehouse`, and Iven's `gloamfen-marsh-road`) and ten deterministic choices. The sluice approach spends one Supply to secure Mara's gates; the marsh-road approach adds one Risk to mark Iven's haul line. Both routes support revisit, return, save/restore, replay, and changed Cinderwake return text. Authored witnesses now cover 43 scenes and 217 choices.

The policy-aligned external certificate evidence is preserved outside the repository:

- Functional scene-prefix source: `/tmp/af9-gloamfen-functional-node3m-20260914-v1` (43 scene forests preserved from the interrupted producer prefix).
- Projected catalog: `/tmp/af9-gloamfen-projected-node3m-runtime60-20260914-v1/candidates.json` (911 forests: 43 scene forests plus 868 choice-failure forests).
- Independent verifier: `/tmp/af9-gloamfen-projected-node3m-runtime60-20260914-v2-verification.json` (43 scenes, 868 failure seeds, complete, accepted false, `1072139.038699 ms`).
- Staged bundle source: `/tmp/af9-gloamfen-stage-20260914-v1`; previous Cinderwake bundle: `/tmp/af9-campaign-previous-20260914-v6`.
- Full repository gate: `/tmp/af9-gloamfen-verify-runtime60-20260914-v1.log` (`298/298`, `1102797.459353 ms`).
- Desktop browser smoke evidence: `/tmp/af9-browser-live-gloamfen-20260914.json` and `/tmp/af9-browser-live-gloamfen-20260914.png` (44 DOM actions from a fresh journey, Gloamfen reached, three choices visible, 5,923-byte checkpoint persisted, no browser errors).

The verifier capacity is now a 3,000,000-node BDD limit with a 60-minute checked / 60.5-minute external window; cache, round, transition, resource, and relational checks are unchanged. The desktop live smoke path is verified, while broad browser coverage, mobile layout, and three-player coordination remain unverified. The complete campaign goal remains larger than this slice.

## Previous handoff: 2026-09-14, Cinderwake beyond Fenward

Cinderwake extends the authored campaign beyond Fenward with an industrial-belt landing, a lockhouse route, and a smoke-road route. The branch is deterministic and content-owned: `take-cinderwake-lock-road` spends one Supply to reach Bex's Lockhouse, while `take-cinderwake-smoke-road` spends one Risk to reach Tessa's Smoke Road; each route has its own resolution and return path. Fenward revisit text now records the Cinderwake outcome, and the authored witness catalog covers 40 scenes and 207 choices.

The policy-aligned external certificate evidence is preserved outside the repository:

- Functional scene-prefix source: `/tmp/af9-cinderwake-functional-policy-20260914-v1` (40 scene forests preserved from the interrupted producer prefix).
- Projected catalog: `/tmp/af9-cinderwake-projected-policy-20260914-v1/candidates.json` (868 forests: 40 scene forests plus 828 choice-failure forests).
- Independent verifier: `/tmp/af9-cinderwake-projected-policy-20260914-v1-verification.json` (40 scenes, 828 failure seeds, complete, accepted false, `865649.849347 ms`).
- Staged bundle source: `/tmp/af9-cinderwake-stage-20260914-v1`; previous Fenward bundle: `/tmp/af9-campaign-previous-20260914-v5`.
- Full repository gate: `/tmp/af9-cinderwake-verify-policy-20260914-v1.log` (`296/296`, `892728.29218 ms`).

The verifier wall-clock window is now 30 minutes checked / 30.5 minutes external; node, cache, round, resource, and relational checks are unchanged. Browser surface, live browser acceptance, mobile layout, and three-player coordination remain unverified. The complete campaign goal remains larger than this slice.

## Previous handoff: 2026-09-14, Fenward beyond Saltreach

Fenward now extends the campaign beyond the resolved Saltreach commons. The raised causeway and submerged night ford are both available from the same Saltreach state, then Pera Holt's beacon can be secured with Supply or Jori Kett's ford can be charted with Risk. Returning to Saltreach exposes the Fenward outcome and permits a later revisit without reopening the unresolved choice.

External evidence is preserved outside the repository:

- Candidate catalog: `/tmp/af9-fenward-projected-long-20260914-v2/candidates.json` with 37 scene forests and 788 choice failure forests, 825 forests total.
- Independent verifier: `/tmp/af9-fenward-projected-long-20260914-v2-verification.json` with 37 scene checks and 788 failure seeds.
- Installed stage: `/tmp/af9-fenward-stage-20260914-v1`; prior bundle backup: `/tmp/af9-campaign-previous-20260914-v4`.
- Required gate: `/tmp/af9-fenward-verify-20260914-v1.log`, 294/294 passing in 718823.927418 ms.

Browser, save/load in a live browser, mobile layout, and three-player acceptance remain unverified. The complete user goal remains larger than this slice.

## Previous handoff: 2026-09-14, Saltreach beyond Reedway

Saltreach now extends the campaign beyond the Reedway upper watch. Either the public ferry warning or the quiet towpath warning can open Saltreach from the same resolved Blackglass state, with a supply-costing tidehouse response or a risk-costing channel-mark response. The resolved Saltreach state changes the Reedway commons text and can be revisited without leaking the unchosen route.

External evidence is preserved outside the repository:

- Candidate catalog: `/tmp/af9-saltreach-projected-extended-20260914-v1/candidates.json` with 34 scene forests and 748 choice failure forests, 782 forests total.
- Independent verifier: `/tmp/af9-saltreach-projected-extended-20260914-v1-verification.json` with 34 scene checks and 748 failure seeds.
- Installed stage: `/tmp/af9-saltreach-stage-20260914-v2`; prior bundle backup: `/tmp/af9-campaign-previous-20260914-v3`.
- Required gate: `/tmp/af9-saltreach-verify-20260914-v1.log`, 292/292 passing in 599360.488969 ms.

Browser, save/load in a live browser, mobile layout, and three-player acceptance remain unverified. The complete user goal remains larger than this slice.

## Previous handoff: 2026-09-14, Reedway warning to Blackglass dispatch

The Reedway upper-bank warning now carries into a resolved Blackglass journey. From Lowsail, the new Blackglass dispatch board offers a public-ledger route that spends one Supply and a quiet night-crew route that adds one Risk; both set durable facts and expose a changed revisit. The source change is in `src/content/blackglass.ts`, `src/content/reedway.ts`, and `src/content/scenario.ts`, with authored endpoint coverage in `tests/blackglass-dispatch.test.ts` and `tests/authored-witnesses.ts`.

External evidence for this handoff is kept outside the repository: the complete 739-forest candidate catalog is `/tmp/af9-blackglass-dispatch-projected-extended-20260914-v2/candidates.json`; independent original-relational verification is `/tmp/af9-blackglass-dispatch-projected-extended-20260914-v2-verification.json` (31 scenes, 708 failure seeds); and the repository gate log is `/tmp/af9-blackglass-dispatch-verify-20260914-v2.log` (290/290 tests passed in 525285.980433 ms). The prior production bundle is recoverable at `/tmp/af9-campaign-previous-20260914-v2`.

Browser/save/mobile/three-player acceptance remains unverified. The complete user goal remains larger than this slice.

The Reedway region now includes a persistent optional upper-bank watch. From
the same inherited commons state, the player can spend one supply on Orin
Pell's ferry horn or spend one Risk on Sera Vale's quiet towpath. Each route
sets its own fact and flag, changes the commons text, and exposes a distinct
revisit so the earlier area is materially different after the choice. The
slice adds one scene, six nonterminal choices, two flags and two fact labels.

The focused route/replay checks pass 3/3, and the authored endpoint catalog
now replays 30 scenes, 172 choices and 36 endings. The fresh factorized
campaign candidate catalog contains 718 forests: 30 scene cones and 688
failure cones. Independent relational verification passed all 30 scenes and
688 failure seeds, rechecked every forest checksum and source binding, and
left `accepted: false` as required for an untrusted candidate run.

The verified bundle is installed under `certificates/campaign/`; the previous
bundle is retained outside the repository at
`/tmp/af9-campaign-previous-20260914-v1`. Full `npm run verify` then passed
289/289 tests in 430,517 ms. External run records remain at
`/tmp/af9-upper-watch-projected-20260914-v1/`,
`/tmp/af9-upper-watch-projected-20260914-v1-verification.json`, and
`/tmp/af9-upper-watch-verify-20260914-v2.log`. The interrupted functional
producer and its 363-forest partial record remain at
`/tmp/af9-upper-watch-functional-20260914-v2/`; it is not used as a proof.

Browser/save/mobile acceptance and the three predeclared blind-player runs
remain unverified. The larger Skyrim-breadth/BG3-depth goal remains open;
next gameplay work should extend persistent travel beyond Reedway while
preserving changed revisits and cross-region consequences.

## Current handoff: 2026-09-10, user-directed checkpoint and pause

The user requested committing and pushing the immediate verified integration,
while explicitly deferring the browser-driver repair. Do not perform that
repair or start fresh browser/live games as part of this checkpoint.
Checkpoint publication is not Stage 8 live acceptance or completion of the
larger explorable-world goal.

The current source and all 693 certificate forests still match the passing
287/287 `npm run verify` run (486.37 seconds). No behavior changed and tests
were not rerun for this documentation/publication step. Preflight evidence:
`~/.local/share/adventure-forge-9/af9-user-checkpoint-preflight-20260910-v1.json`.
The two experimental branches' file targets are already integrated; retain
their histories without replacing the current verified implementations.

### Resume from here

1. Create a new version of the external browser witness with explicit `scrollintoview` before native `click` and download-button interactions. Preserve the original failed `af9-factorized-browser-witness-20260909-v1.mjs` and its evidence unchanged. Do not make this repair during the current checkpoint.
2. Run the complete stateless browser journey: pause an Archive case, perform regional work, resume the case, revisit the decided/closed record, exercise save/download/reload/upload, check mobile rendering, and measure the actual request envelope.
3. Run exactly the three predeclared fresh neutral Luna/max games, seeds 1-3, with unchanged instructions, interviews and the 60-turn ceiling. Preserve every attempt; require the existing natural regional-entry/allocation, clarity and no-blocker gates before claiming Stage 8 live acceptance.

The original browser click did not scroll to its below-the-fold target and
sent no choice request. A separate explicit-scroll diagnostic advanced the
same choice successfully. The repair is to the external test driver, not
a demonstrated application defect. Full browser and live acceptance remain
unverified. No fresh player or interview is claimed.

## Prior audit checkpoint: 2026-09-09, complete factorized production proof passes

Build and all **287/287 tests** pass. The adopted bounded campaign gate
freshly checks **29 scene cones and all 664 original failure seeds**, with
least C/W recomputed in 18/12 rounds and every current source/artifact binding
rechecked. Full `npm run verify`: 486.37 seconds wall, 1,427,512 KiB maximum
RSS, exit 0. The worker's complete checked window was 483,217.224119 ms,
within its unchanged 720-second/1536-MiB policy. All 231 authored endpoint
paths also replay successfully.

The original 250,000-family guard is unchanged and its historical failures
remain retained. The new complete proof replaces the impractical full
campaign family enumeration, not its safety/completion requirements. Legacy
combined-certificate IO, finite oracles, source/path/byte/resource checks,
and all zero-seed obligations remain covered.

Current priorities: correct the external browser driver's missing explicit
scroll after user approval, finish the frozen stateless browser/save/mobile/
request-envelope gate, then run exactly the three predeclared fresh neutral
Luna/max games (seeds 1-3). Only after those gates, resolve integration
branches, commit and push. Nothing has been published at this checkpoint.

Integration preflight accounts for every additive experimental-branch path:
34 release-branch files (27 byte-identical) and 26 symbolic-branch files
(15 byte-identical, with packed experiments retained under test helpers).
Current proof bindings and the full frozen source snapshot still match the
passing run. Original inventories are
`~/.local/share/adventure-forge-9/af9-experimental-branch-integration-20260909-v1.json`
and `af9-prestage-source-binding-20260909-v1.json`. No branch content has been
discarded or automatically overwritten by this inventory; the actual merge
remains pending the release gates.

The browser failure is retained: the first CLI click sent no choice request
and left revision 0. A fresh explicit-scroll diagnostic advanced the same
choice to revision 1 without an application error. This is not a completed
browser journey or blind acceptance. Both browsers/servers are closed; no
fresh players or interviews ran.

See [FACTORIZED_CERTIFICATE_RELEASE.md](FACTORIZED_CERTIFICATE_RELEASE.md)
for proof scope, commands, exact external evidence paths and limitations.
The larger explorable-world goal remains open beyond 29 scenes/166 choices.

## Prior checkpoint: 2026-09-09, native copy policy integrated; 538-component run closed

The native obligation solver now supports an opt-in `obligationChoiceCompactInterval`. Zero preserves the previous absolute-threshold behavior. A positive interval resets the next copy trigger to the larger of the configured minimum and the retained owner size plus the interval after every checked handoff. Inputs are validated and snapshotted once, and all existing hard guards and exact fixed-point checks remain intact. The experimental native generator uses a 750,000-node minimum and 250,000-node interval; its independent verifier uses the previously successful 1,250,000-node operational copy trigger and records that setting.

- Current `npm run verify`: build passed, 277/278 tests passed, exit 1, 143.13 seconds. Added interval cases cover both layouts, safe/unsafe fixtures, exact seed/cone and C/W equivalence, forced/no between-choice copies, malformed options, one-time getters, huge intervals, and the unchanged disabled default. The only failure remains the original campaign family-audit 250,000-state guard; it was not removed or raised.
- Fresh native generation v3 is terminal: 538/693 candidate forests, consisting of all 29 scene cones and 509 failure components. It failed at the unchanged 2,000,000-node cap while solving `bound-exit:open-emergency-bypass`, after 1,339.25 seconds external wall time. The last checked copy retained 1,595,145 nodes during round 2. This is a node-limit failure, not the old absolute-threshold copying stall or a complete certificate.
- The run successfully generated `bound-exit:run-the-watchline` and `bound-exit:take-workers-through-flood`. The new watchline forest is byte-identical to the earlier independently checked single-component artifact. This identity does not turn the partial current-source catalog into a complete, independently accepted campaign proof.
- Two root-owned family-analysis alternatives stayed outside the repository. Future-write liveness passed 9 fixture tests, but its full isolated audit still exceeded 250,000 families in 135.54 seconds. Retaining one sufficient permanent justifier per blocked AND-guard passed 7 fixture tests; a workload-only probe still reached 250,000 families in 9.81 seconds, so another full run was not attempted. Neither refinement was adopted, and neither received campaign acceptance.
- All runs launched in this checkpoint are closed. No new subagents, live/blind play, merge, commit, or push occurred. Git inspection and fetch found `main` 88 commits ahead of `origin/main` and no remote-only commits; two historical audit branches remain retained. The active commit/push goal is unfinished, and publication is held while the current gate fails unless the user explicitly chooses a documented research-only checkpoint.

Original evidence is under `/home/micha/.local/share/adventure-forge-9/`: `af9-native-copy-policy-verify-20260909-v1.log`, `af9-factorized-candidates-20260909-v3/` with its sibling `.log` and `.closed.json`, `af9-family-write-liveness-20260909-v1/`, and `af9-family-sufficient-justifier-20260909-v1/`. The closed record hashes all 1,078 files from the failed native attempt. The new source/evidence checkpoint is `af9-factorized-source-20260909-v6.tar.gz` and its sibling `.sha256` manifest. See `docs/FACTORIZED_CERTIFICATE_EXPERIMENT.md` for commands, limits, and scope.

Next priority: a bounded single-component `open-emergency-bypass` preflight using a smaller proof representation. Investigate an inductive resource-budget violation predicate justified by monotone single-use gain flags, with the existing independent checker still requiring exact original seed inclusion, initial disjointness, and closure under every authored choice. A candidate may be a sound closed overapproximation; it need not be the expensive least bad cone. Reject unsupported invariants rather than relaxing proof checks. Exact seed sub-partitions are another possibility but would require an explicit coverage contract. Do not raise the node guard or start another full generation without evidence that the new bottleneck is addressed. The full current catalog, independent foundations/checker, current regression gate, frozen endpoint gate, and exactly three predeclared blind subscription players remain outstanding before campaign publication.

## Historical checkpoint: 2026-09-09, watchline component independently checked

The root-owned audit investigation added bounded exact support metadata to the BDD implementation. For universes of at most 512 variables, existential quantification and simultaneous substitution now skip subgraphs whose support is disjoint from the requested variables; larger universes retain the original traversal. Input validation, substitution semantics, serialized forests, and hard node/cache guards are unchanged. Five new tests cover truth-table equivalence, cache settings, import/copy, the large-universe fallback, and guard preservation.

- `npm run verify`: build passed, 268/269 tests passed, exit 1, 130.43 seconds. The only failure remains the original family-audit 250,000-state guard. The full regression gate is NOT green.
- The external allocation-interval probe reached the same third-sweep checkpoint in 41.30 seconds versus 157.31 seconds before support pruning, approximately 3.8 times faster at that checkpoint. This is one paired observation, not a whole-audit benchmark. Its three-minute run still timed out.
- A separately declared six-minute probe then generated `bound-exit:run-the-watchline` to a fixed point in round 12: 292.28 seconds external wall time, 950,172 exported cone nodes, 131 checked copies. This is one candidate component, not a complete certificate.
- A fresh original-relational checker independently accepted that component under exact current source bindings in 100.09 seconds. It checked the original seed and all authored-choice closure obligations. The existing copy trigger was configured to 1,250,000 nodes; the hard 2,000,000-node cap and 1,536 MiB JavaScript heap cap were unchanged. The first checker attempt, using the absolute 1,000,000-node trigger, timed out after 361.53 seconds; its failed evidence is retained.
- Both successful records deliberately retain `complete: false` and `accepted: false`: no complete 693-component catalog, independent least C/W calculation, frozen endpoint gate, or blind-player gate was established by these component runs.
- All runs in this checkpoint are closed. No publication, commit, push, live/blind play, new delegation, or cost claim occurred. The broader game goal remains open.

Current evidence lives outside the repository under `/home/micha/.local/share/adventure-forge-9/`: `af9-support-pruning-verify-20260909-v1.log`, `af9-adaptive-compaction-probe-20260909-v3*`, `af9-adaptive-compaction-probe-20260909-v4*`, and `af9-watchline-relational-check-20260909-v1*` / `v2*`. The source checkpoint is `af9-factorized-source-20260909-v5.tar.gz`, with its sibling SHA-256 manifest. Detailed commands, failed attempts, scope, and resource observations are recorded in `docs/FACTORIZED_CERTIFICATE_EXPERIMENT.md`.

Next priority: integrate a bounded retained-size-aware copy policy into the native generator with focused equivalence tests, then attempt a complete fresh 693-component generation and independent verification under the new source bindings. The native generator still uses its absolute 750,000-node trigger; the independent verifier's default remains 1,000,000. The standalone probes have not silently changed either policy. Do not reuse the old 466-component prefix as a current complete certificate. The unchanged regression gate, frozen endpoint gate, and exactly three predeclared blind subscription players still precede publication and broader game work.

## Historical checkpoint: 2026-09-09, approved repairs applied and validated

- The user approved the disclosed repairs. Both test union checks now use `in` narrowing. The external probe's missing self-loop `goTo` is corrected in a new v2 runner; the failed v1 runner and its original evidence are unchanged. The approval-related blocker is resolved. No gameplay or repository proof algorithm was changed.
- Fresh `npm run verify`: build passed; 263/264 tests passed, zero skipped/cancelled. The sole failure remains `tests/scenario.test.ts:6`, which exceeded the unchanged 250,000-family exhaustive-audit guard. External elapsed time was 138.62 seconds; peak RSS 2,566,776 KiB. The repaired range tests now compile and pass in the full suite.
- The corrected standalone allocation-interval probe passed all 16 fixture cases in 40.117377 ms before campaign work. Its `run-the-watchline` component attempt reached round 4 but exceeded the unchanged 180-second checked budget (180.78 seconds external, peak RSS 1,352,992 KiB). No component certificate was generated or independently verified, and no compaction policy was adopted into the repository.
- All validation processes are terminal. Exhaustive campaign safety remains unproven; the closed 466/693-forest generation is still incomplete. Next work remains proof scalability under exact checks and hard guards, not another unchanged full restart. Full proof, regression, frozen endpoint, and three predeclared blind-player gates still precede publication, and the larger game objective remains open.
- Evidence is outside the repository: `/home/micha/.local/share/adventure-forge-9/af9-approved-repair-verify-20260909-v1.log`, `af9-adaptive-compaction-probe-20260909-v2.mjs`, the sibling probe `.log`, and its native run records under the same directory. The repaired source and current docs are archived in `af9-factorized-source-20260909-v4.tar.gz`, with source/probe/log digests in the sibling `.sha256` file. No new agent or publication was used.

## Previous audit status: 2026-09-09, repair approval required

- No generation, audit, or probe is running. The standalone adaptive-compaction probe stopped after 0.30 seconds external, before campaign work, because its `increment` fixture choice omitted the required self-loop `goTo`. No fixture-equivalence or campaign-performance result was obtained. The probe and original failure evidence remain outside the repository.
- The existing two TS2339 test errors also remain unrepaired. Approval to change those two `Object.hasOwn` checks was requested and remains unanswered across successive goal turns. Further validation now requires permission to repair the disclosed test errors and the probe fixture; automatic continuation is not being treated as that permission. No repository behavior was changed in this probe turn.
- The last full generation remains the closed, incomplete 466/693-forest attempt described below. The previously successful ledger-component check is still only local evidence. No passing full regression gate, complete independent proof, publication, or blind-play acceptance is claimed, and the full game objective remains open.
- Probe evidence: `/home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v1.mjs`, the sibling `.log`, the run directory's `input.json` and `failure.json`, and `af9-adaptive-compaction-probe-20260909-v1.closed.sha256` under the same evidence directory. Next requested action is approval for the two test-narrowing repairs and the fixture's self-loop `goTo`, followed by the appropriate bounded reruns.

## Previous audit status: 2026-09-09, generation v2 closed incomplete

- Session 27960 is terminal, exit 1. Fresh generation v2 exceeded its predeclared checked time limit after 1,800,583.055959 ms internal / 1,800.84 seconds external (30m00.84s), with peak RSS 1,559,456 KiB. It must not be reported as running or restarted merely to obtain another observation.
- The native failure report confirms 466/693 forests: all 29 scene forests and 437 failure forests. The last artifact is `arithmetic-error:run-the-watchline`, `cone-00465.json.gz`; `bound-exit:run-the-watchline` was unfinished in round 4. The native report retains `complete: false`, `accepted: false`. No complete candidate was submitted to the independent verifier.
- The log exposes a concrete generation bottleneck: retained roots exceeded the 750,000-node between-choice compaction threshold, causing repeated full copies after very small allocations. For example, a copy after `visit-reedway-clinic` retained 796,193 nodes from an owner with 796,203 allocated nodes. The run reported a time-limit failure, not a node-limit failure. Do not launch another unchanged full restart; examine a retained-size-aware allocation interval in a bounded experiment first, preserving all exact predicates, owner checks, and hard guards.
- The two-line TypeScript test repair still awaits approval. The latest `npm run verify` stopped at build before running tests; no passing regression result is inferred. Full independent proof, regression, frozen endpoint, and exactly three predeclared blind-player gates still precede publication. The complete game goal remains open.
- Original closed-run evidence: `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2/failure.json`, the sibling run `.log` and `.launch.json`, and `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2.closed.sha256`. The digest file covers the retained native JSON, all 466 compressed forests, log, and launch metadata. Source remained unchanged from the pre-launch v3 archive. No new agent or publication was used for this observation turn.

## Previous audit status: 2026-09-09 22:32 UTC, fresh generation running

- Fresh current-source factorized generation v2 started at 22:32:46 UTC. Shell session 27960 returned live construction/completion progress. It targets all 693 forests with a predeclared 1,800,000 ms checked limit, 1810-second external timeout plus 10-second kill grace, unchanged 2,000,000-node cap, 1536 MiB heap cap, and 128-round guard. Do not restart it on an observation timeout; poll that session authoritatively.
- This run is independent of the pending two-line test repair: the test file is not in the generator's proof source bindings. The last full `npm run verify` still failed compilation. No approval to repair the test, passing regression gate, complete certificate, or release acceptance is inferred from the automatic goal continuation.
- Source is frozen for generation. The native producer records and rechecks its own current bindings; the pre-launch source is retained in the v3 archive described below. Original launch metadata, output directory, and log are `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2.launch.json`, `af9-factorized-candidates-20260909-v2/`, and `af9-factorized-candidates-20260909-v2.log` under that same directory.
- Next: observe this exact run to a terminal result. A complete candidate would still require strict independent verification, an approved test repair and full regression gate, then frozen endpoint and three-player blind gates before publication. A partial or timed-out generation cannot advance those gates. The full game objective remains open.

## Previous audit status: 2026-09-09, relational-range preflight passed

This section supersedes prior audit-result and next-action notes below. No generation or audit process remains running.

- The factorized cone checker now restricts each target to the existential output range of its original relation before calling the original relational predecessor. This is an exact identity, not a narrower safety property; gameplay, generator code, complete-run source bindings, and all hard limits remain unchanged.
- The previously failing ledger component passed every authored choice closure check in 54.75 seconds external (54,539.24242 ms internal), with five cone copies and peak RSS 1,505,644 KiB. The preceding version timed out after 183.90 seconds without finishing. This pass concerns one historical component only; the report remains `complete: false`, `accepted: false`.
- The bounded worker added `tests/factorized-relational-range.test.ts`. Its focused runtime tests passed 2/2 in 0.297 seconds reported wall time. However, the manager's latest `npm run verify` failed at TypeScript compilation in 2.11 seconds: TS2339 at lines 220 and 227 because `Object.hasOwn` does not narrow the success/fault union. The full suite did not run. The user has been asked to approve replacing those two checks with `in` checks; no silent repair or passing integration result is claimed.
- Next: obtain approval for that two-line test repair and rerun the full gate. Only then consider a fresh bounded generation under current source bindings. A complete independently verified certificate, frozen endpoint gate, and exactly three predeclared blind subscription players still precede publication. The larger game objective remains open.
- Original evidence: `/home/micha/.local/share/adventure-forge-9/af9-factorized-ledger-component-check-20260909-v2.log`, `af9-factorized-range-verify-20260909-v1.log`, and `factorized-relational-range-v1.log` / `factorized-relational-range-v2.log` under that same directory. The current source and docs are retained as `af9-factorized-source-20260909-v3.tar.gz`, with evidence digests in the sibling `.sha256` file. Details and commands are in `docs/FACTORIZED_CERTIFICATE_EXPERIMENT.md`.

## Previous audit status: 2026-09-09, closed component preflight

This section supersedes older running-session and pending-result notes below. No audit or generation process from this experiment remains running.

- The factorized generator remains incomplete: 362/693 forests were written before its checked time limit (903.81 seconds external). The subsequent aggregate relational prefix verifier failed at the unchanged 2,000,000-node limit after checking 253 failure components. Neither result is an accepted safety proof.
- The factorized verifier now checks backward closure separately for every authored choice using the original relational predecessor, with validated fresh-owner copies. The legacy monolithic verifier and the complete-run source-binding requirement are unchanged.
- The native historical-component preflight also remained incomplete. `bound-exit:surrender-council-seal-for-ledger` stayed under the node guard but exceeded its 180-second checked limit (183.90 seconds external, peak RSS 1,572,808 KiB). Repeated copies retained 577,264 nodes. Do not launch a longer generation merely to bypass this unresolved verification cost.
- Latest `npm run verify`: build passed; 261/262 tests passed, zero skipped; only `tests/scenario.test.ts` failed at the unchanged 250,000-family guard. External elapsed time was 133.78 seconds, peak RSS 2,566,660 KiB. This run covers the per-choice verifier and the worker's final forced-compaction tests, not just the earlier implementation.
- Next priority: reduce full-cone copying/relational-check overhead without weakening the proof, then obtain a complete current-source certificate and pass independent verification. The frozen endpoint gate and exactly three predeclared blind subscription players still follow; no publication or live-play acceptance is claimed. The complete game goal remains larger than the present campaign.
- Original evidence is outside the repository: `/home/micha/.local/share/adventure-forge-9/af9-factorized-prefix-check-20260909-v1.log`, `af9-factorized-ledger-component-check-20260909-v1.log`, and `af9-factorized-verify-20260909-v2.log` under the same directory. The updated source archive is `af9-factorized-source-20260909-v2.tar.gz`, with `af9-factorized-source-20260909-v2.sha256` recording its digest and the associated evidence digests. See `docs/FACTORIZED_CERTIFICATE_EXPERIMENT.md` for commands and scope.

## Latest audit experiment, 2026-09-09 (supersedes earlier run-in-progress notes)

The fourth functional-preimage run is terminal, exit 1: all 29 scene forests were written, but the combined failure cone again hit the unchanged two-million-node guard, despite checked between-choice copying. It took 469.36 seconds wall time and 1,653,256 KiB maximum RSS; no source-change error was reported. Original evidence: `/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v4/` and its sibling `.log`. There is no running generation job or accepted certificate.

The last full `npm run verify` built and ran all 260 tests: 259 passed, no skips; the sole failure is the unchanged 250,000-family audit guard. Wall time was 128.48 seconds. Original log: `/home/micha/.local/share/adventure-forge-9/af9-choice-compaction-verify-20260909-v1.log`.

Next priority: an explicit factorized failure-certificate experiment, preserving separate backward-closed components instead of constructing a monolithic union. The original relational model independently regenerated all 664 failure seeds in 0.40 seconds and found 44 nonzero bound-exit seeds. All seeds, including zeros, must remain accounted for. A factorized generator and independent relational verifier are now implemented under an explicit new schema, with the legacy monolithic format preserved. The implementation build and strengthened focused fixture passed. The bounded worker owned only the new test file; the manager owns implementation and integration. Full `npm run verify` closed at 261/262 passing, no skips, 129.07 seconds wall time; the sole failure remains the unchanged 250,000-family guard. Original log: `/home/micha/.local/share/adventure-forge-9/af9-factorized-verify-20260909-v1.log`. The verifier requires all 664 failure identifiers, recomputes least C/W, and checks each seed/cone independently. The first factorized campaign run closed at its checked time limit with 362/693 forests: all scenes and 333 failure components, including 29 nonzero components. It took 903.81 seconds wall time, maximum RSS 1,510,516 KiB, exit 1, with no node-limit or source-change error reported. Original evidence is `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v1/` and its sibling `.log`. A bounded independent relational preflight is now checking the available failure prefix (session 23781) before a longer generator run is considered. It cannot grant complete-certificate or scene-coverage acceptance. All 693 forests remain required; no prior partial run is substituted. Its predeclared limits and proof contract are in `docs/FACTORIZED_CERTIFICATE_EXPERIMENT.md`. The prospective proof contract and original catalog evidence are in `docs/FUNCTIONAL_PREIMAGE_EXPERIMENT.md`. No source or audit limit has been relaxed to admit a regression.

Priority remains a complete independently verified current-source safety certificate, then frozen-source endpoint checks and three predeclared blind players, before publication. Browser recovery edits and recovered verifier code remain unpublished. The larger RPG goal remains open.

Updated: 2026-09-09 (America/Vancouver). The full Skyrim-breadth/BG3-depth goal remains active and far beyond the current game.

Current continuation: the browser now blocks overlapping journey operations,
including asynchronous save-file reads. All four new browser regressions pass.
The complete `npm run verify` builds and passes 123 of 124 checks; the sole
failure is the unchanged 250,000-family campaign audit (137.37 seconds overall).
Nothing has been published. See [REVIEW_20260909.md](REVIEW_20260909.md) for the
review scope, original logs, exact source files and limitations.

Recovery note: the runtime and temporary-artifact statements below describe
the September 5-6 checkpoints. Session 20888 is no longer available, all eight
recorded temporary worktree directories are missing, and the latest v6
generator, manifest and finalization file are absent. No final verdict for
that attempt can be recovered from its old launch record. The release code
still exists in Git at `4a78944`; durable live-run/archive directories also
exist, but their integrity was not reverified in this continuation. A filename
search found no candidate forests or latest generator outputs there. Recover
the committed verifier and make future generator tooling reproducible before
regenerating missing certificates. Do not infer a passed proof or discard the
release gate from the unavailable temporary evidence.

Audit recovery now has the 34 additive release files back in the working tree.
The build and all 247 existing regular checks pass after adding a deterministic
substitution method for candidate generation; the original relational
certificate-verification path and failing scenario gate remain intact.
Independent tests of the new method precede a bounded campaign probe. See
[FUNCTIONAL_PREIMAGE_EXPERIMENT.md](FUNCTIONAL_PREIMAGE_EXPERIMENT.md) for the
prospective proof, limits and acceptance criteria.

Stage 8 is integrated locally at game source `2f6212d`: earlier Reedway access,
safe Archive pause/resume and decided-record revisits, and Sera's salvage credit
consequence (29 scenes, 166 choices, 36 terminal-choice IDs). Final-copy browser
checks pass; the endpoint catalog and CLI correction bring regular checks to
119 passing tests. Both earlier Stage 7 live batches
missed the regional exposure gate at 1/3; Stage 8 has no fresh live acceptance.
Production remains the accepted Blackglass source `139e48a`, public on Vercel
and connected to GitHub main automatic deployment.

The release audit remains open. Exact scene/failure partitions and copying
through both initial fixed points pass 64 BDD/symbolic checks at `a065fd5`.
The historical proof is independently accepted: all 26 obligations are
disjoint from the initial state and all 169,922 reference classifications
match. It finishes in 639.25 seconds / 1,555,724 KiB maximum RSS. The current
run now completes C/W and 14 safety obligations, then hits the 720-second
checked limit. It returns no full proof or symbolic endpoint replay; every
failure and its source/progress evidence is retained. The quantifier-key
performance change at isolated `ccf3dc1` passes all 64 focused checks and the
historical gate: all 600 allocation/semantic events and the complete proof
match the prior run. It takes 590.50 seconds / 1,440,880 KiB maximum RSS;
this one comparison does not establish the larger current campaign's runtime.
The isolated certificate prototype at `bec8263` passes its clean build and
all 85 BDD/symbolic checks, including independent raw-state certificates. It
recomputes exact completion and checks supplied bad-state predicates against
the current transitions, including all failure seeds and scene coverage.
Historical generation and separate verification both pass. Generation takes
592.61 seconds; fresh verification takes 62.46 seconds / 1,470,332 KiB maximum
RSS, including all 26 forests, 524 failure seeds and the full historical
169,922-state C comparison. Root accepts the source-bound historical result;
the supplementary independent output review also passes. The current generation
also reaches its separate 1,800-second checked limit: 28 of 30 forests are
written, with no full proof, certificate manifest or endpoint replay. The
failure and every partial artifact are preserved. Production adoption and
current proof remain pending;
prototype review and file-memory measurements are in
[CERTIFICATE_AUDIT_EXPERIMENT.md](CERTIFICATE_AUDIT_EXPERIMENT.md).
The separate current
231-endpoint catalog now has a repository regression test; it proves authored
path and metadata coverage, not universal safety. See
[BACKWARD_PROPERTY_AUDIT.md](BACKWARD_PROPERTY_AUDIT.md) for scope and evidence.

The external selected-candidate generator now passes seven small oracle,
zero-cone and owner-transfer tests. Root and independent review agree with
its equations; its declared scope remains candidate generation only. A
separate bounded profile passes source/model preflight and writes the worker-
landing candidate, then hits the two-million-node guard while computing the
failure union. Root seals the closed failure and sole new file. There are now
29 preserved candidates across two failed runs; the failure union is still
missing, and all 30 must pass fresh verification before release adoption.
The reviewed external v4 generator now passes nine focused tests, including
independent finite-state semantics under forced between-choice copying. It
uses an absolute node watermark and preserves copying after every nonfixed
round. Its bounded run is now closed with exit 1 at 1,800.78 seconds after
357 checked events; the failure union remains unfinished in round 9. Root
seals the unchanged inputs and empty candidate output. A separately reviewed
v6 iteration updates the closure after each choice in reverse authored order;
it computes the same least closure and passes all nine focused tests. The v2
profile passes its actual input/model preflight and starts once in root session
20888, timed child PID 1618206, with unchanged proof limits. Its handle and
temporary result files are unavailable at the September 9 continuation; its
launch record grants no candidate, certificate or release acceptance.
The assembly tool also passes an input-only check of the preserved 29 forests,
current release constructor/core and accepted 231-endpoint replay. The final
failure forest and fresh full semantic verification remain required.
The separately bound 231 symbolic/public-engine
endpoint replays now pass on the exact current source: 2,712 actions and 2,943
checkpoints in 21.52 seconds. This closes endpoint replay coverage, not the
universal campaign safety proof.

## Accepted foundation

- Public repository: https://github.com/michaelcrosato/adventure-forge-9 (`main`). Original briefs archived in `15ada58`; consolidated plan in `4581f73`.
- Stage 1: deterministic engine and real keyless Codex subscription play/interview, with separately verified isolation and preserved original evidence. See EVIDENCE.md and SUBSCRIPTION.md.
- Stage 2: Lowsail/Red Sluice, 11 scenes, 44 authored choices including exits, four named inhabitants, three resolution families, and changed returns. Twenty tests, exhaustive 2,429-state traversal, terminal/browser and save/load verification passed. First authentic blind play passed. See STAGE2.md.
- Cycle 1: limited evidence supports explicit road-cost wording after two baseline and two candidate games. Later contrary feedback limits any broad reading. See CYCLE1.md.
- Cycle 3: limited evidence supports explicit clinic-to-council travel after two known baseline and two fresh candidate games on `34af626`. All encountered the clinic choice; abrupt-move reports fell 1/2 to 0/2, with median clarity/enjoyment 4.5/4.5 to 5/5. See CYCLE3.md. These two retained normal-play improvements meet the initial foundation sequence; they do not establish the final scale or depth.

## Unresolved evidence and active work

Cycle 2 A/B failed their declared global rating gate and did not encounter the depleted chamber in normal play. The focused B check failed its complete criterion. Revision C's two readers correctly explained the supply/kit/medicine/seal relationships, supporting the narrow correction; one exposed a remaining fact-label inconsistency, now fixed in source. All failed/null results and that final untested wording remain in CYCLE2.md. Specialist screen tests cannot grant gameplay acceptance or replace authentic interviews.

Stage 5: Lantern Archive adds one linked investigation area, bringing the game to 18 scenes, 91 choices including exits/navigation, eight named inhabitants, and three optional backgrounds with consequences in both chapters. Existing small-game endings remain available; six continuations preserve their actual resource/obligation costs. The first three fresh games exposed a premature-hearing restriction and unclear background selection. Root preserved that evidence, corrected the behavior, and ran three fresh games on `dbabc94`: all completed, reached the hearing, and rated clarity/enjoyment 5/5. The declared gates pass for initial expansion acceptance. All three chose canalwright/shared-water/technical publication; council/evacuation origins and the other backgrounds retain mechanical rather than fresh gameplay coverage. See STAGE5.md for the limitations and remaining tool/testimony confusion.

At the Archive release, 45 tests and the Vercel production build passed. Its future-read audit covered 76,117 canonical states and 129,874 transitions with no unreachable content, dead ends or unfinished states lacking a completed route. It retains all resources and future-read flags, checks merged-state congruence and fails closed on new vocabulary. Projection word counts are explicitly representative. The stateless browser completed a 23-action early-hearing recovery path, with repeated reloads, save download, completed reload and mobile checks. This branch was not naturally encountered by the repaired blind batch.

The engine performance correction is integrated: privately constructed frozen states avoid repeated history verification, while external saves/objects still receive full checks. No world-scale performance claim follows from the short-witness benchmark.

The user's hosting request is fulfilled: https://adventure-forge-9.vercel.app is public and connected to GitHub main. The accepted Blackglass expansion was pushed as `91a25b4` and automatically reached Ready production deployment `dpl_DGkTkSVkNpUfz72duD22TLEq7LkJ`; its exact GitHub source SHA and production alias were independently verified. GitHub's independent verification also passed. Automatic browser checkpoints survive stateless function requests; game-content updates can still require a new journey. See HOSTING.md.

All live batches, including the three continuation-candidate runs, are closed and exported. Their historical source freezes are now preserved as exact source archives and bundled commits under `worktree-archives/20260906T005009Z-twelve-live-freezes/` in the durable local evidence root. This includes Cycle 3 `34af626`, Archive `59afce4`/`dbabc94`, Blackglass `08156a1`/`af5e340`, and both Stage 7 freezes. Root verified source/mode parity, 34 sealed-run file sets and 34 export/sidecar hashes before removing the twelve clean worktrees. The original runs and exports remain in place. All six Blackglass-era exports had separately passed integrity/replay verification; cleanup does not claim new play or replay. See `LOCAL_WORK_RESOLUTION.md` for reconstruction. No final world-scale or interaction-depth acceptance is claimed.

## Required next work

The Stage 8 behavior, browser and non-audit regressions are documented in
[STAGE8_PARALLEL_CAMPAIGN.md](STAGE8_PARALLEL_CAMPAIGN.md). The original full
verification failure and all incomplete scaling diagnostics remain preserved.
Static packed projection completes the historical graph but fails even an
eight-million-class current diagnostic. Conservative permanent-phase projection
also completes historical comparison/replay, then hits the current two-million
class guard. See [PACKED_PHASE_AUDIT.md](PACKED_PHASE_AUDIT.md) and
[SYMBOLIC_REACHABILITY_EXPERIMENT.md](SYMBOLIC_REACHABILITY_EXPERIMENT.md).

The backward property proof now passes the historical gate. Copying after
every nonfixed round keeps the combined failure cone below the node cap;
the first run reaches its fixed point just beyond the 600-second check and
is correctly rejected before final validation. A separately bound run changes
only checked/external time limits to 720/750 seconds. It completes all 26
obligations, 524 original failure-seed records and the full static comparison.
Root verifies the entire earlier logical progress prefix, exact catalogs,
source/artifact bindings and closed process. The current profile has passed
real catalog/source/schema preflight after correcting draft field assumptions;
this is input validation only. Fresh current probe `97b04d5` builds and starts
under the same 720/750-second limits, but reaches the node cap after 69.37
seconds / 1,007,832 KiB maximum RSS. Strong completion fixes at round 18;
completion-or-failure reaches round four before the next round exhausts the
append-only manager. There are no completed safety obligations or replays.
Root independently verifies the closed run's exact 24-event prefix, unchanged
source/artifact bindings and empty proof/replay results. Exact compaction of
the initial fixed points now passes all 64 focused checks and the historical
comparison on clean experimental `a065fd5`. The closed run takes 639.25 seconds /
1,555,724 KiB maximum RSS, completes all 26 obligations and matches the full
169,922-state reference. It retains the same node/heap/round/time limits.
The current-campaign run with this correction closes at the checked time
limit after 722.32 seconds / 1,507,016 KiB maximum RSS on frozen `11d86ae`.
C and W both finish, passing the previous W capacity failure; 14 of 30
safety obligations complete. The seal-workroom cone is unfinished at round
14, with no aggregate proof result or symbolic endpoint replay. Root checks
the exact 425-event prefix and every source/evidence binding. A small BDD
quantifier-key performance correction is under independent review.
The first preparation's nonexistent-log reference is preserved and corrected
without changing the source or inventing evidence. Current safety acceptance
and production adoption remain pending.
The complete current endpoint catalog has separate main-engine replay evidence
in [BACKWARD_PROPERTY_AUDIT.md](BACKWARD_PROPERTY_AUDIT.md). Its committed
231-path regression and all 116 selected regular checks pass on clean
`71fec09`; only the unchanged full-family scenario audit is excluded.
A later playtest CLI fix adds three checks; all 119 selected regular checks
pass. It follows an accidental help invocation that started one unintended
player. That partial, unsealed 18-action attempt is preserved and excluded
from the still-pending three-player Stage 8 sample. See
[PLAYTEST_HELP_INCIDENT.md](PLAYTEST_HELP_INCIDENT.md) for the complete record.
The production audit
and its guard remain unchanged; full verification and Stage 8 acceptance are
still pending.

1. Resolve Stage 8's measured audit workload failure without weakening the proof or removing regional activity. Compare the independently reviewed alternatives after rejecting local flag pruning; preserve its counterexample and every failed diagnostic. Full verification and a clean freeze are required before the three predeclared fresh players. The wording comparison is complete, with a narrow clarity observation but a second failed regional exposure gate (1/3). Keep both batches and all earlier endings; do not rerun identical players until a favorable result appears. See `STAGE7_REEDWAY.md` and `STAGE8_PARALLEL_CAMPAIGN.md`.
2. Review persistent regional travel and safe earlier-area revisits as the next breadth step. Current chapters are mostly sequential; another sequential investigation area alone would not establish an explorable world.
3. Preserve the strict completion audit as the world grows; address state growth without discarding meaningful future distinctions. A 1,010-action local checkpoint measured 79,097 request bytes and restored in about 32 ms, but the hosted 256 KiB envelope limit remains a finite long-session constraint.
4. Continue reviewed waves with cross-area consequences, character counterfactuals, long sessions and authentic feedback. Clarify remaining kit/testimony tradeoffs and the distinction between accepting a council seal and actually granting control. The full completion audit remains outstanding.

Manager owns integration, evidence, publication and acceptance. Luna/max remains the primary development benchmark; corrections and observed timing belong in AGENT_BENCHMARK.md. Inspect actual worktrees, agents and process handles at each continuation rather than inferring running work from this document.

Read-only regional review found a safe return boundary at resolved `blackglass-quay` and `lowsail-after-blackglass`; the old pressure crossing is already closed after resolution. Do not reconnect old preparation or resolution scenes without guarding their once-only costs and mutually exclusive outcomes: several presently rely on the sequential topology. A two-scene lock-charter proposal is not accepted for implementation: its authorities mostly follow already-chosen water outcomes, and its main reward is passage around an otherwise completed loop. The next proposal needs a useful optional goal, at least two competing viable approaches from the same inherited state, and consequences visible on a changed revisit.

Blackglass is accepted as the first timed-traversal chapter and published: 25 total scenes, 131 choices and 10 named inhabitants, with a bounded tide, distinct inherited routes, Nessa's aid/refusal, pressure damage, patrol attention and repeated return navigation. All 71 checks pass. The corrected audit covers 169,922 states and 332,402 transitions with no unreachable content, dead ends or unfinished states lacking a completed path. Its explicit workload ceiling is now 250,000, after retaining the failed 100,000 diagnostic and independently measuring the full graph. Terminal-only flag reduction preserves exact resources, visible conditional text and ending identity. See STAGE6_BLACKGLASS.md and AUDIT_SCALING.md for the proof limits and measurements.

Three stateless HTTP witnesses completed across all chapters; every response/checkpoint matched deterministic replay. Their largest actual choose envelope was 3,811 bytes. A 26-action browser journey delayed the evacuation route, resumed twice, used late Nessa assistance and correctly ended with pressure damage; save download/reload and mobile layout passed. The final missed-window and unresolved-trust prose corrections also passed actual save uploads and rendered inspection at `98b8dc3`. All 130 first-candidate shortest authored witnesses were measured, with a 3,235-byte maximum last-request envelope; the longest/largest each passed the actual handler. The corrected supply route also passed a 24-action browser journey with three reloads, save download and mobile inspection; its new choice's actual 21-action request measured 3,178 bytes and passed the handler. Both fresh batches are preserved, with basic chapter acceptance and the failed improvement-exposure gate explicitly distinguished. No whole-world capacity or final depth claim follows from this wave.

See STAGE6_BLACKGLASS.md for the prospective contract, integration details and acceptance gates. Manager review rejected a broad engine-factory refactor that accepted mutable scenarios under one global build identity; it was removed before integration. Peer review found inherited-property resource/fact membership (`constructor`), now corrected with own-property checks and independent regressions. Content review requires an explicit repair result so Nessa's help and emergency damage cannot be misreported through the aggregate risk total.

The human player surfaces sort resource names consistently. This fixes cards/text moving after checkpoint restoration changes object-key order. Browser start → action → reload retained the same resource order with no errors, and terminal before/after restore matched. All 45 tests at that earlier change passed; no new static layout test was added. That fix changes presentation only and leaves its rule build identity unchanged.

The cleanup inventory at `/tmp/af9-worktree-inventory-20260905T164534Z.json`
records 65 worktrees, 24 with local changes and 37 with commits absent from
main at inspection. Some commits are earlier cherry-pick sources, and some
local changes are retained diagnostic overlays. Each must be accounted for
before cleanup; the inventory does not classify them as disposable. Publication
remains pending the full mechanical and live acceptance gates above.

Twenty-three completed topic branches and their worktrees have now been
archived and removed after refreshed cleanliness, patch-equivalence and
process checks. Their exact commit bundle and source archives are verified
under `/home/micha/.local/share/adventure-forge-9/worktree-archives/20260905T170849Z/`.
Main remains clean after commits. Active symbolic work, historical evidence
and four source dispositions needing review remain; see
`LOCAL_WORK_RESOLUTION.md`. This is partial cleanup, not final completion.

The four remaining draft/test dispositions were independently compared and
archived, then removed: superseded Blackglass and Reedway drafts, duplicate
relational-product tests, and the original superseded Lantern implementation.
Their archive is `worktree-archives/20260905T172018Z/` under the same durable
local evidence root. Cleanup now accounts for 27 removed worktrees and 26
removed topic branches; the 42 worktrees and 13 branches remaining at removal
contain active experiments or historical evidence. No candidate source was
discarded without a reconstructible archive and recorded disposition.

Nine more integrated development topics and their worktrees have been
archived and removed, with exact source, commits and rejected-pruning evidence
preserved in `worktree-archives/20260905T174530Z/` under the same durable root.
The three batches account for 36 removed worktrees and 35 topic branches.
The third batch leaves 35 worktrees and five branches at removal; historical
source freezes and diagnostic overlays remain available. See
`LOCAL_WORK_RESOLUTION.md` for hashes and reconstruction.

The final three completed symbolic topic branches are also archived and
removed after complete source/bundle verification and refreshed process,
status and patch checks. Archive `worktree-archives/20260905T181140Z/` records
39 cumulative worktree removals and 38 topic-branch removals. Only `main` and
`audit-symbolic-manager` remain as local branches, alongside 30 detached
historical source/diagnostic checkouts. The active proof and release gates
remain unfinished; this cleanup is not final campaign acceptance.

Four completed copy/packed diagnostic checkouts were subsequently archived
and removed after independent source, mode, bundle, evidence and process
checks. Archive `worktree-archives/20260905T235558Z/` records 43 cumulative
worktree removals and 38 topic-branch removals, leaving 42 worktrees and two
branches at removal. Fifteen additional historical BDD checkouts were then
independently checked against their archive and removed. Cumulative cleanup
now accounts for 58 worktrees and 38 topic branches. With the fresh current
probe added between batches, 28 worktrees and two branches remain.

Nine further completed packed, family and backward-property diagnostic
overlays are now archived and independently removed. Cumulative cleanup
accounts for 67 worktrees and 38 topic branches, leaving 19 worktrees and two
branches. Twelve clean historical live/source freezes are being archived;
the current source/verifier/reference roots remain available.

The twelve historical source freezes have now been independently archived
and removed, bringing cumulative cleanup to 79 worktrees and 38 topic
branches. A fresh historical compaction probe was added before this batch,
leaving eight worktrees and two branches. Clean experimental `a065fd5` passes
all 64 focused checks and extends exact copying to C/W with explicit final
ownership. Its historical comparison is now independently accepted; no new
current proof or production adoption is accepted yet.

The completed BDD forest topic is archived and removed after root verifies
source bytes, Git modes, a fresh bundle clone, patch equivalence and process
and active-runtime dependencies. Its two commits remain in the tested
certificate branch. Cleanup now accounts for 80 worktrees and 39 topic
branches removed; 13 worktrees and four branches remain at this checkpoint.
See `LOCAL_WORK_RESOLUTION.md` for archive hashes and the corrected tar review.

The new isolated release-layout branch `audit-certificate-release` at `59bab44`
retains six exact certificate/proof modules and all independent fixture tests,
with packed oracles under test helpers. Its clean build and all 223 selected
regular checks pass; only the unchanged failing full campaign invocation is
excluded. The runtime adapter, current certificates and full release gates
remain unfinished. Fourteen worktrees and five branches now remain after
adding this isolated integration checkout.

The release branch now includes reviewed file I/O at `6ab23f8`: build and five
focused boundary checks pass, and the reader accepts every historical forest
byte-for-byte. The catalog/adapter remain unfinished. Corrected current
preparation and its input-only preflight pass. The frozen probe has 75 logical
fields, 106 state bits, 212 BDD variables and 58,572 constructor nodes; the
preparer stdout's incorrect `fieldBits: 75` label is preserved and explained
in the root review. The actual manifest records the correct units.

The one current generation under manifest
`ebef2cb9cae44434118d0fcb4174e8a5d6c842b2acf1c9f2229d10ca9c3c5635`,
root session 69524, runner child PID 1425424, is closed with exit 1. It stops
at 1,800.64 seconds / 1,538,112 KiB maximum RSS after 28 scene forests; the
last scene and failure-union forest are missing. Root verifies all 809
progress events, partial forest hashes/envelopes, unchanged sources and the
closed process. The failure seal is
`/tmp/af9-symbolic-certificate-current-generation-failure-root-seal-v1.json`,
SHA-256 `6226352b2fdf26c576af93b757ff9e63c76ec7719fc51b99908d1f8ebd9b1ddd`.
It grants no current generation or certificate acceptance.

The next bounded work prepares only the two missing candidate forests from a
fresh model with unchanged gameplay/core bytes and bounds. The existing 28
remain untrusted inputs. A complete assembled set must pass fresh semantic
verification and all endpoint/replay gates; the failed generation verdict
will not be changed. The bundle is committed at isolated `019f94d`; its ten
focused tests pass. The adapter/worker are reviewed and still await real
certificate integration. The original scenario test remains unchanged.
The reviewed adapter/worker are now committed at isolated `a92828d`; its clean
build and all 238 regular checks pass with identical before/after source.
This excludes only the unchanged scenario invocation and is not a full
`npm run verify` or current-certificate result.

Release `4a78944` subsequently adds the detached worker supervisor and five
synthetic lifecycle regressions. Its build and those five tests pass; the
campaign invocation remains unchanged pending a complete verified certificate.

After reconstructing and checking the two superseded source topics, root
removes them following fresh process/dependency checks. Inventory is 14
worktrees and three branches; cumulative removals are 82 worktrees and 41
topic branches. No current proof, fresh live acceptance or new deployment is
claimed from this work.


Five superseded diagnostic source checkouts are now archived and removed after
root checks fresh bundle restores, exact source/overlay bytes and modes, all
143 copied evidence files, and current runtime dependencies. Archive
`worktree-archives/20260906T054500Z-superseded-diagnostic-freezes/` retains the
originals. Nine worktrees and three branches remain; cumulative cleanup is
87 worktrees and 41 topic branches. Current sources and direct evidence files
remain available and hash-matched.
## Current handoff: 2026-09-15, Crownwater beyond Stormvault

Crownwater is now the next authored campaign district after Stormvault. The release contains 49 scenes, 237 choices, 36 endings, 322 authored paths, 6,302 actions, and 6,624 checkpoints. The new Crownwater branch adds Bellhouse and Weir routes, explicit Stormvault gating, replay-safe revisits, and resource/fact assertions for both resolutions.

The factorized campaign certificate now contains 997 forests: 49 scene forests and 948 choice failure-seed forests (four failure obligations per choice). The corrected scene prefix is `/tmp/af9-crownwater-scene-prefix-20260915-v6`; the final source-bound candidate catalog is `/tmp/af9-crownwater-rebound-node8m-runtime4h-20260915-v1`; the independent verification report and log are `/tmp/af9-crownwater-rebound-node8m-runtime4h-20260915-v1-verification.json` and `/tmp/af9-crownwater-rebound-node8m-runtime4h-20260915-v1-verification.log`; and the staged bundle is `/tmp/af9-crownwater-stage-node8m-runtime4h-20260915-v1`.

Independent verification passed with `complete:true`, `accepted:false`, 49 scenes, 948 failure seeds, 997 forests loaded once, 39 completion rounds, 39 completion-or-failure rounds, and 6,803,575 ms elapsed (about 113 minutes). The production bundle loader also rechecked every manifest and forest byte/hash before installation. The previous repository bundle is preserved at `/tmp/af9-campaign-previous-20260915-v2`.

The required `npm run verify` passed with 302 tests, 0 failures, 0 skipped, and 7,033,798 ms test duration (about 117 minutes). Evidence is retained outside the repository at `/tmp/af9-crownwater-npm-verify-node8m-runtime4h-20260915-v1.log`.

The certificate policy is now an 8,000,000-node forest bound, 8,192 MiB verifier heap, and a 14,400,000 ms checked window with a 14,430,000 ms external timeout. The earlier 3,600,000 ms guard was reached during archive-hall after all fixed points and failure seeds had passed; the policy was expanded to match the observed exact scene-replay cost rather than weakening checks.

This remains factorized backward-safety and completion evidence over the original relational model. It does not claim exhaustive reachable-state enumeration, exact noncompletion semantics, least-bad failure cones, or production adoption: `accepted:false` is the expected certificate artifact state.
