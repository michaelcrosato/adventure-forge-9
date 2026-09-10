# Factorized campaign certificate experiment

Status: implemented for experiments, not adopted as a release gate. The legacy
monolithic format remains available. All campaign content and engine audit
limits remain unchanged. See `FUNCTIONAL_PREIMAGE_EXPERIMENT.md` for the failed
monolithic runs and their preserved evidence.

## Scope and independent proof

The factorized schema is `af9-symbolic-factorized-certificate-v1`. It names
exactly every authored scene, followed by a separate identifier for each of
the four original failure kinds for every choice. All 664 failure seeds remain
mandatory, including zeros. Each artifact contains exactly one BDD root.
Forest IDs must be unique across the scene and failure catalogs.

The generator uses the existing per-choice obligation solver and functional
predecessor strategy. The independent verifier constructs the original
relational `SymbolicModel`; it does not use the generator subclass. Existing
relational verifier helpers are exported without behavioral changes and
reused for completion, regenerated failure seeds, validated fresh owners,
current-only roots, seed inclusion, and backward-closed bad cones.

The verifier independently computes least C from completed states, then least
W from C and all original failure seeds. Both fixed points retain bounded
round counts and checked owner transfers. Each scene cone must include
`playing AND atScene(scene) AND NOT W`. Each failure cone must include its own
regenerated seed. Every supplied cone must be playing-only, current-only,
backward-closed under all authored choices, and initial-disjoint.

If a reachable playing state were outside W, initial-state exclusion of its
scene cone would be contradicted. Inside least W there is a finite route to C
or an original failure seed. The latter contradicts initial-state exclusion
of that seed's backward-closed failure component. The remaining route reaches
C and therefore completion. This preserves the original safety property
without requiring one materialized union of all failure cones. Recomputing
least W is essential; accepting an arbitrary supplied fixed point would not
prove the property.

## Source and file binding

`symbolic-factorized-certificates.ts` has an explicit `runtimeVerifier` source
role. The generator records both its own hash and the imported functional
generator's hash, plus all current campaign bindings. Every artifact has
bounded size and content hashes. Both native entrypoints recheck source and
artifact integrity before a successful report. Candidate generation and
experimental verification retain `accepted: false`; endpoint replay,
production adoption, blind play, and publication remain separate gates.

## Predeclared first campaign run

- Candidate schema: `af9-factorized-candidate-generation-v1`.
- Expected artifacts: 29 scene forests plus 664 failure forests, 693 total.
- Generation: 900,000 ms checked deadline, 910-second external timeout, 10-second kill grace.
- Heap: 1,536 MiB; BDD node guard: 2,000,000; cache entries: 500,000.
- At most 128 sweeps; copy after nonfixed rounds and between choices at 750,000 allocated nodes.
- All authored scenes, choices, failure kinds, and existing resource bounds remain included.
- Artifact limits: 2,000,000 nodes, 128 MiB decoded JSON, 32 MiB compressed per forest.
- Output: `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v1`.
- Independent verification: 720,000 ms checked / 750-second external deadline, unchanged heap and node guards.

A failed run's partial forests are evidence of that failed run only. No prior
29-scene set is substituted into this source-bound experiment. Full build and
regression results, original source archive, commands, elapsed time, and any
live process handle must be recorded alongside the run before claiming its
status or acceptance.

## Focused fixture and integration evidence

A bounded worker owned only `tests/factorized-certificates.test.ts`. Its two
focused tests exercise four layout/field-order combinations and compare the
playing-state projections of C/W and every failure seed against a small raw
DSL oracle. The fixture includes genuine bound exits, safe-integer overflow,
and disconnected noncompletion. Manager review requested raw-derived seed
metadata and explicit reachable-failure/reachable-noncompletion rejection,
zeroed nonzero failure components, and cross-catalog duplicate forest IDs;
those checks were added without removing existing assertions.

Other rejection cases include omitted/reordered IDs, descriptor mismatch,
shrunken scene cones, nonclosed failure cones, next-state variables, malformed
numeric loader output, and round/compaction limits. The numeric loader case
tests the serialized-forest boundary, not an incompatible fresh model. This
fixture does not by itself exhaust the campaign or all terminal-state forms.

Original worker logs are retained outside the repository:

- `/home/micha/.local/share/adventure-forge-9/factorized-certificates-v1.log`: failed fixture expectations; raw C initially included terminal anchors in a playing-state comparison, and the selected nonclosed cone initially lacked a predecessor.
- `/home/micha/.local/share/adventure-forge-9/factorized-certificates-v2.log`: passed after limiting the oracle comparison to playing states and adding a disconnected bridge predecessor.
- `/home/micha/.local/share/adventure-forge-9/factorized-certificates-v3.log`: passed with an explicit zero-seed metadata assertion.
- `/home/micha/.local/share/adventure-forge-9/factorized-certificates-v4.log`: passed after manager-requested strengthening, 2/2 tests, no skips, 291.49553 ms test-runner duration. Worker-reported command wall time was 0.315 seconds.

Focused command: `npx tsx --test tests/factorized-certificates.test.ts`.
The manager's implementation build passed before the fixture was finalized;
full `npm run verify` is now running against the integrated source and final
fixture. Its result is not inferred from the focused test result.

## Full integration check closed and first probe launched

`npm run verify` built successfully and ran all 262 tests with no skips:
261 passed; the sole failure remains the unchanged 250,000-family audit guard.
External wall time was 129.07 seconds, test-runner duration 126,633.059112 ms,
maximum RSS 2,566,760 KiB, exit 1. Original log:
`/home/micha/.local/share/adventure-forge-9/af9-factorized-verify-20260909-v1.log`.
This is not a passing publication gate.

Source archive:
`/home/micha/.local/share/adventure-forge-9/af9-factorized-source-20260909-v1.tar.gz`.
Archive and focused-log digests: the sibling
`af9-factorized-source-20260909-v1.sha256`.

The first factorized probe is launched with the predeclared command:
`timeout --kill-after=10s 910s node --max-old-space-size=1536 --import tsx src/tooling/generate-factorized-candidates.ts --output /home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v1 --max-ms 900000`.
Its log is the output directory's sibling `.log`. A launch is not completion;
all 693 forests and a source-rechecked closed result are required even before
independent verification can begin.

## First campaign probe closed at its deadline

The first factorized run is terminal, exit 1, with the checked deadline error
`Factorized generation checked time limit exceeded`. It wrote 362/693 forests:
all 29 scene forests and 333 failure forests. Of the completed failure
components, 29 were nonzero. The run stopped while solving
`bound-exit:publish-vask-and-name-mara`, after six sweeps; its immediately
preceding zero arithmetic seed is the last saved artifact.

Generator elapsed time was 903,605.4449260001 ms; external wall time was
903.81 seconds, maximum RSS 1,510,516 KiB. No source-change error or node-limit
failure was reported. This is incomplete generation, not safety acceptance.
Original `failure.json`, per-component summaries, and compressed forests are
retained in `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v1/`;
the original log is its sibling `.log`. Tool session 25407 is terminal.

Before spending a larger generation budget, a separately bounded relational
preflight was started against the available failure prefix. It uses the
original model and the new verifier's real C/W and component checks, reads the
actual bounded/hash-checked artifacts, and stops at the first unavailable
component. The expected missing-component sentinel cannot be interpreted as
full verification: any success report must state `complete: false`, list only
checked failure IDs, and explicitly exclude scene checks and global acceptance.
The preflight is limited to 180,000 checked ms / 190 external seconds, 10-second
kill grace, the unchanged 1,536 MiB heap and two-million-node guard. Its live
handle at launch was 23781; result not yet claimed. Log:
`/home/micha/.local/share/adventure-forge-9/af9-factorized-prefix-check-20260909-v1.log`.

## Closed prefix failure and per-choice component preflight

These results supersede the earlier note that prefix-check session 23781 was running. It terminated with exit 1: the aggregate relational check reached the unchanged 2,000,000-node guard while loading/checking `bound-exit:surrender-council-seal-for-ledger`. Exactly 253 failure components had passed; no scene cones had been checked. External elapsed time was 154.25 seconds, internal elapsed time 154,015.023654 ms, and peak RSS 1,186,972 KiB. The prefix experiment is incomplete, not accepted. Its original log and failure report are `/home/micha/.local/share/adventure-forge-9/af9-factorized-prefix-check-20260909-v1.log` and `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v1.prefix-check-failure.json`. The prefix script was supplied through stdin; it was not a saved, native source-bound entrypoint.

The factorized verifier subsequently replaced its aggregate cone-closure check with exact per-choice checks. For each authored choice, the original relational predecessor must be a subset of the cone. This is equivalent to checking the union of all predecessors, without constructing that temporary union. Current-only support, playing-state containment, initial-state exclusion, seed inclusion, exact catalogs, least C/W computation, and checked owner/anchor handoffs remain mandatory. The legacy verifier is unchanged. `coneCompactAt` defaults to 1,000,000 allocated nodes; zero disables copies. The node guard remains 2,000,000. A zero cone has an empty predecessor and still undergoes artifact, seed, and catalog checks.

`src/tooling/check-factorized-component.ts` now provides a reproducible local preflight for one named component from a failed historical generation. It deliberately does not assert complete campaign coverage. It records both producer and current bindings and allows a historical binding difference only for `src/verification/symbolic-factorized-certificates.ts`; every other binding, catalog, bound, configuration, and selected artifact must match. It rechecks current sources, its own entrypoint, metadata bytes, and compressed artifact integrity. Its reports retain `complete: false` and `accepted: false`. The native complete-run verifier still requires all producer/current bindings to match exactly; this local experiment cannot adopt the older partial generation as a current complete certificate.

Command run from `/home/micha/dev/adventure-forge-9`:

```sh
set -o pipefail
/usr/bin/time -v timeout --kill-after=10s 190s \
  node --max-old-space-size=1536 --import tsx \
  src/tooling/check-factorized-component.ts \
  --candidates /home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v1 \
  --seed bound-exit:surrender-council-seal-for-ledger \
  --output /home/micha/.local/share/adventure-forge-9/af9-factorized-ledger-component-check-20260909-v1.json \
  2>&1 | tee /home/micha/.local/share/adventure-forge-9/af9-factorized-ledger-component-check-20260909-v1.log
```

Result: exit 1, checked time limit exceeded, 183.90 seconds external, peak RSS 1,572,808 KiB. The run emitted 28 successful compaction progress records before the time failure; each retained 577,264 nodes. The last emitted record followed `give-red-sluice-to-council`. It did not finish all authored choices, so even this single component is not reported as verified. No node-limit failure occurred in this run. Repeated whole-cone copying remains a practical bottleneck; a longer generation run has not been launched.

## Latest regression gate and retained source

The updated implementation built successfully with `npm run build` in 2.22 seconds, peak RSS 401,528 KiB. Original log: `/home/micha/.local/share/adventure-forge-9/af9-factorized-component-build-20260909-v1.log`.

The existing bounded test worker extended its factorized fixtures to force threshold-one copies, require compaction progress, reject negative/fractional/NaN thresholds, and assert that zero disables copying. Its reported focused command was `npx tsx --test tests/factorized-certificates.test.ts`: 2/2 grouped tests passed, 353.968682 ms test-runner duration, 0.375 seconds reported wall time. This is fixture evidence, not a campaign proof, live play, or an independently measured worker cost.

The manager then ran the full unchanged gate:

```sh
set -o pipefail
/usr/bin/time -v npm run verify 2>&1 | \
  tee /home/micha/.local/share/adventure-forge-9/af9-factorized-verify-20260909-v2.log
```

Result: build passed; 262 tests, 261 passed, 1 failed, zero skipped/cancelled. The sole failure was `tests/scenario.test.ts:6`, which exceeded the unchanged 250,000 conserved-parameter-family limit. Test-runner duration was 131,289.145722 ms; external elapsed time was 133.78 seconds; peak RSS was 2,566,660 KiB; exit status was 1. Browser VM regression tests and authored endpoint witnesses passed, but neither is a substitute for universal safety or blind live play.

The current source and these documentation updates are retained outside the repository at `/home/micha/.local/share/adventure-forge-9/af9-factorized-source-20260909-v2.tar.gz`, with evidence digests in the sibling `.sha256` file. No complete certificate, production-gate adoption, publication, interview, or live-play completion is claimed. Next work must make complete independent verification feasible before advancing the frozen endpoint and three-player gates.

## Exact relational-range restriction: component pass, integration repair pending

The next bounded change touches only the factorized component check. Before calling the unchanged relational `preimage` for each authored choice, it computes the relation's existential output range, renames that range to current-state bits, and intersects the target cone with it. For any relation R and target B, `Pre_R(B) = Pre_R(B intersect Range(R))`: any witness to R already has its output in Range(R). The range is derived from the original relation, not the functional compiler or assumed scene destinations. Current-only range validation is explicit; every authored choice, seed/playing/initial check, and checked fresh-owner copy remains required. This avoids renaming unrelated cone branches without dropping any transition from the closure obligation. No engine, content, generator, complete-run binding rule, or hard limit changed.

The manager reran the same native historical-component preflight with only new output names:

```sh
set -o pipefail
/usr/bin/time -v timeout --kill-after=10s 190s \
  node --max-old-space-size=1536 --import tsx \
  src/tooling/check-factorized-component.ts \
  --candidates /home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v1 \
  --seed bound-exit:surrender-council-seal-for-ledger \
  --output /home/micha/.local/share/adventure-forge-9/af9-factorized-ledger-component-check-20260909-v2.json \
  2>&1 | tee /home/micha/.local/share/adventure-forge-9/af9-factorized-ledger-component-check-20260909-v2.log
```

Result: exit 0, `componentVerified: true`, all authored choice closure checks completed, five copies retaining 577,264 nodes each. Internal elapsed time was 54,539.24242 ms; external elapsed time was 54.75 seconds; peak RSS was 1,505,644 KiB. The node cap remained 2,000,000, the heap cap 1536 MiB, and the checked/external time limits 180/190 seconds. This replaces the earlier timeout for this single historical component only. Report fields remain `complete: false` and `accepted: false`; no complete catalog or campaign safety is established.

The existing worker created only `tests/factorized-relational-range.test.ts`. Its compact raw DSL fixture compares relation ranges and both full/range-restricted predecessors to raw output/source sets across both layouts and default/custom field order. It covers hops, a self-loop, flag writes, resource adjustment/reset, intermediate arithmetic failure, zero relations, terminal outputs, an unreachable backward-closed cone, and a nonclosed cone that must be rejected. Forced and disabled copying are exercised; an instrumented fresh-owner subclass records the targets actually passed by the verifier. These are fixture-level tests, not an exhaustive campaign proof. Root read the new file once for integration scope.

The worker ran `npx tsx --test tests/factorized-relational-range.test.ts`. Its first run failed a fixture flag-declaration constraint; the retained rerun passed 2/2 grouped runtime tests in approximately 275 ms runner time and 0.297 seconds reported wall time. Original logs: `/home/micha/.local/share/adventure-forge-9/factorized-relational-range-v1.log` and `factorized-relational-range-v2.log` under the same directory. Actual served model identity, total worker elapsed time, and monetary cost were not independently measured.

A manager `npm run build` before the worker's final integration passed in 2.26 seconds (peak RSS 402,580 KiB), with log `/home/micha/.local/share/adventure-forge-9/af9-factorized-range-build-20260909-v1.log`. That earlier build does not establish that the final added test compiles. After receiving and reading the worker's final file, root ran:

```sh
set -o pipefail
/usr/bin/time -v npm run verify 2>&1 | \
  tee /home/micha/.local/share/adventure-forge-9/af9-factorized-range-verify-20260909-v1.log
```

This latest integration attempt failed at build, before running the suite. TypeScript reported TS2339 at test lines 220 and 227: `Object.hasOwn` does not narrow the success/fault union, so accesses to `result.success` and `result.fault` are not type-safe to the compiler. External elapsed time was 2.11 seconds, peak RSS 391,384 KiB, exit status 1. The manager disclosed the introduced test bug and requested approval to replace those two checks with `in` narrowing; no repair has yet been applied. The previous 261/262 full-suite result does not cover this latest range restriction and new fixture.

No longer generation was launched. Next work is the approved test repair and a fresh full gate, followed by a decision on fresh current-bound generation. Source and documentation as they stand, including the failing test, are retained at `/home/micha/.local/share/adventure-forge-9/af9-factorized-source-20260909-v3.tar.gz`; the sibling `.sha256` file records source and original evidence digests. No complete proof, production adoption, publication, or blind-play completion is claimed.

## Fresh current-source generation v2, predeclared 30-minute checked budget

At 2026-09-09 22:32:46 UTC, root launched a fresh generation under the range-restricted verifier's current source bindings. Shell session 27960 returned live construction and completion progress. This is an actual started process, not a planned or completed result. Poll this exact handle; observation timeouts do not authorize replacement runs.

The previous turn made concrete progress by verifying the ledger component under unchanged hard limits, but the two-line test narrowing repair still lacks user approval. Root has not changed that test. Generation can proceed independently because the test file is outside proof source bindings; this does not waive the failed regression gate or infer permission from an automatic continuation. The producer's accepted flag remains false. The generator implementation, node/heap/round guards, and proof requirements are unchanged. Only this attempt's checked runtime allowance increases from 900,000 to 1,800,000 ms, recorded before launch, to give the full 693-component run more time after the component-verifier feasibility result.

Command run from `/home/micha/dev/adventure-forge-9`:

```sh
set -o pipefail
/usr/bin/time -v timeout --kill-after=10s 1810s \
  node --max-old-space-size=1536 --import tsx \
  src/tooling/generate-factorized-candidates.ts \
  --output /home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2 \
  --max-ms 1800000 \
  2>&1 | tee /home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2.log
```

Predeclared launch metadata is `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2.launch.json`. The native producer writes its source/configuration bindings into the exclusive new output directory and must recheck them before claiming a complete candidate. The pre-launch source is retained in `af9-factorized-source-20260909-v3.tar.gz` in the same external evidence directory; its test compile failure is preserved, not silently repaired. Source files will remain frozen during this run.

The checked limit is 1,800,000 ms; external timeout is 1810 seconds with a further 10-second kill grace; heap cap is 1536 MiB; BDD node cap is 2,000,000; round guard is 128. Initial construction reported 58,724 nodes at 93.830889 ms. No terminal duration or result is claimed here. A complete candidate would still need the unchanged strict native independent verifier and every remaining regression/endpoint/blind-play gate. No new agent, publication, or live player was started for this generation.

## Generation v2 closed: 466/693 forests, checked time failure

Root repeatedly polled the original live session 27960 without restarting it. Its terminal tool result was exit 1 after the checked time limit. The native failure report was then read once and confirms `complete: false`, `accepted: false`, error `Factorized generation checked time limit exceeded`, and internal elapsed time 1,800,583.055959 ms. `/usr/bin/time -v` recorded 1,800.84 seconds external (30m00.84s), user CPU 2260.45 seconds, system CPU 59.20 seconds, and peak RSS 1,559,456 KiB. No node-limit failure was reported. No source files were changed during the run.

Exactly 466 of the required 693 forests were retained: 29 scene forests and 437 failure forests. The final written artifact is the zero `arithmetic-error:run-the-watchline` component, `cone-00465.json.gz`. Generation was still processing `bound-exit:run-the-watchline` in round 4 when it failed. All catalog coverage remains mandatory; this prefix is not a complete certificate and has not been presented to the strict complete-run verifier. The process is terminal, not a verified wait still in progress.

This attempt supplies a specific next performance question rather than a reason for another unchanged full restart. The fixed 750,000-node between-choice threshold is below the retained owner size for this component, so even very small allocations trigger another complete owner copy. Examples from the original log:

- At 1,735-1,743 seconds, several Reedway choices repeatedly copied approximately 792,000 retained nodes despite allocating only hundreds or a few thousand additional nodes.
- At 1,791,440.092478 ms, the copy after `visit-reedway-clinic` retained 796,193 nodes from an owner with 796,203 allocated nodes.
- At 1,796,020.764443 ms, the copy after `return-to-archive-record-from-reedway` retained 796,193 nodes from an owner with 796,247 allocated nodes.

These are allocation/copy observations, not a CPU profile or a proven counterexample to the game. A bounded retained-size-aware compaction experiment is the next candidate optimization; it must preserve every exact predicate, fixed-point requirement, fresh-owner/anchor check, and hard node/round guard. No such change has been applied in this turn, and no replacement generation has been started.

Original evidence is retained outside the repository:

- `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2/failure.json`
- `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2.log`
- `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2.launch.json`
- `/home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v2.closed.sha256`

The closed digest list was generated with `sha256sum` over the run's native `*.json`, all 466 `*.gz` forests, original log, and launch metadata. The pre-launch source remains in `af9-factorized-source-20260909-v3.tar.gz` under the same evidence directory. The manager made no gameplay changes, started no agent, and ran no new regression suite while observing this process. The latest full gate still stopped at TypeScript compilation in the new range test, and the disclosed two-line repair remains pending approval. No publication, blind play, complete safety proof, or completion of the larger game objective is claimed.

## Standalone allocation-interval probe v1: fixture validation failure

Root created a standalone probe outside the repository to investigate the repeated-copy behavior without modifying the production generator, verifier, or pending test file. Its proposed policy uses `max(750000, retainedNodes + 250000)` as the next between-choice copy threshold, retains round-end copies, and preserves the 2,000,000-node and 128-round guards. It targets only the `bound-exit:run-the-watchline` closure, not all campaign obligations. Before campaign work, it is intended to compare absolute and allocation-interval copying against an explicitly enumerated six-state fixture across both layouts and default/custom field orders, including a reachable-fault rejection case.

The intended checks did not run successfully. The first fixture model failed content validation because the authored nonterminal `increment` choice lacked its required self-loop `goTo`. This was an introduced fixture error, not a campaign counterexample or evidence about the proposed compaction policy. Root disclosed it and did not silently repair it. No campaign model was constructed by the probe, no component was generated, and no performance improvement is claimed.

Command run:

```sh
set -o pipefail
/usr/bin/time -v timeout --kill-after=10s 190s \
  node --max-old-space-size=1536 --import tsx \
  /home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v1.mjs \
  2>&1 | tee /home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v1.log
```

Result: exit 1; `ContentValidationError: scenario.choices[2]: a non-terminal choice must have exactly one goTo effect`; external elapsed time 0.30 seconds; peak RSS 95,428 KiB. The 180-second checked budget and 190-second external timeout were not reached. The script captures current proof bindings and hashes its own source plus the functional-generator dependency, writes exclusive input/failure records, and makes no release-acceptance claim.

The original runner is `/home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v1.mjs`; original log is the sibling `.log`; native records are in `af9-adaptive-compaction-probe-20260909-v1/input.json` and `failure.json` under the same evidence directory. Digests are retained in `af9-adaptive-compaction-probe-20260909-v1.closed.sha256`. No repository implementation or test was changed, no agent was started, and no new full regression command was run in this probe turn.

The earlier request to repair the two TypeScript narrowing errors still lacks approval. The new probe fixture also needs an explicit repair decision under the working instructions. All known processes are terminal. Further validation is being held for that user input rather than starting another costly experiment around known introduced errors. The full objective, required safety proof, and regression/endpoint/blind-player publication gates are unchanged and unmet.

## Approved repairs and bounded reruns

The user explicitly approved the disclosed repairs with `yes go ahead`. Root replaced the two `Object.hasOwn` union checks in `tests/factorized-relational-range.test.ts` with `in` checks so TypeScript can narrow `result.success` and `result.fault`. The external probe's required `goTo` back to `trap` was added in a new runner, `/home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v2.mjs`, with a new exclusive v2 output directory. The original v1 runner, failure records, and digests were not overwritten. These repairs resolve the approval-related blocker; they do not establish campaign safety or change gameplay, generator code, verifier code, or safety limits.

Root ran the complete unchanged regression command before the probe:

```sh
set -o pipefail
/usr/bin/time -v npm run verify 2>&1 | \
  tee /home/micha/.local/share/adventure-forge-9/af9-approved-repair-verify-20260909-v1.log
```

Result: TypeScript build passed; 264 tests, 263 passed, 1 failed, zero skipped/cancelled. The repaired range tests passed within this full suite. The sole failure was `tests/scenario.test.ts:6`, reporting `Audit exceeded 250000 conserved-parameter families; exhaustive coverage is not established`. Test-runner elapsed time was 135,846.307184 ms; external elapsed time 138.62 seconds; peak RSS 2,566,776 KiB; exit status 1. No checks were skipped or weakened to admit a regression, and the full gate remains failed.

Root then ran the corrected standalone probe:

```sh
set -o pipefail
/usr/bin/time -v timeout --kill-after=10s 190s \
  node --max-old-space-size=1536 --import tsx \
  /home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v2.mjs \
  2>&1 | tee /home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v2.log
```

The probe emitted `fixtures-passed` for all 16 cases at 40.117377 ms: twelve exact six-state closure comparisons spanning both layouts, default/custom field order, and three copy policies, plus four reachable-fault rejection cases. The fixture's content-validation error is resolved. This is a tiny explicit-state check, not campaign coverage.

The subsequent campaign component did not finish. It completed three reverse sweeps and reached round 4 before `Adaptive component probe checked time limit exceeded`. Its last emitted copy followed `release-council-water`, retaining 828,909 nodes from 1,083,940 allocated nodes and setting the next threshold to 1,078,909. External elapsed time was 180.78 seconds; peak RSS 1,352,992 KiB; exit status 1. The run did not report a node-limit failure. It generated no component artifact and makes no complete-certificate, independent-verification, or performance-acceptance claim. The allocation-interval policy remains solely in an external experiment; it has not been adopted into repository behavior.

Both validation processes are terminal. No new agent or replacement full generation was started. Original evidence is the full gate log above, the corrected v2 runner and its log, and v2 `input.json` / `failure.json` under `/home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v2/`. The repository source, repaired test, and these documentation updates are retained in `/home/micha/.local/share/adventure-forge-9/af9-factorized-source-20260909-v4.tar.gz`, with associated source and evidence digests in the sibling `.sha256` file. The earlier 466/693-forest full-generation attempt remains incomplete. No publication, blind-play acceptance, complete safety proof, or completion of the larger game objective is claimed.

## 2026-09-09: exact support pruning and independently checked watchline cone

This root-owned investigation followed explicit user approval to continue investigating the audit bottleneck. No subagent was started, and no model identity, token price, total cost, live play, or full completion is inferred from these results.

### Repository change and regression gate

`src/verification/bdd.ts` now maintains exact structural support masks for BDD managers with at most 512 declared variables. `exists` and simultaneous `compose` use those masks to skip disjoint subgraphs after validating all arguments. Constant substitution pruning already existed and was not the missing optimization. Managers with more than 512 variables use the original traversal, including extremely large declared variable universes without allocating proportional bitmasks. Forest formats, canonical node semantics, cache bounds, and hard node guards are unchanged.

`tests/bdd-support-pruning.test.ts` adds five tests: disjoint-operation and invalid-input behavior; exhaustive 32-assignment quantification/substitution comparisons under three cache settings; support after import/copy; large-universe fallback; and the unchanged node guard. No gameplay/content changes were made in this checkpoint.

Command: `npm run verify`. The build passed and 268 of 269 tests passed. The original family audit alone failed at its unchanged 250,000-state guard. Exit status was 1, external wall time 130.43 seconds, test-runner duration 127,545.515945 ms, and maximum RSS 2,567,324 KiB. Original output: `/home/micha/.local/share/adventure-forge-9/af9-support-pruning-verify-20260909-v1.log`. No subsequent repository implementation change preceded the component checks below; later documentation and external runner configurations do not change those source bindings.

### External generation probes

The immutable external runners are `/home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v3.mjs` and `af9-adaptive-compaction-probe-20260909-v4.mjs`, with same-stem output directories and sibling `.log` files. Both run via `node --max-old-space-size=1536 --import tsx RUNNER`. Each records current source bindings and its own hash, checks 16 tiny fixture cases, and uses an exact reverse in-place fixed-point sweep for the single `bound-exit:run-the-watchline` seed. Checked fresh copies retain the cone, original seed, and four anchors. The copy trigger after each copy is `max(750000, retainedNodes + 250000)`; node cap 2,000,000 and round cap 128 remain fixed. This allocation-interval policy is still external, not the native generator default.

- Baseline v2, before support pruning: the third sweep finished at 157,306.434837 ms with 792,304 retained nodes, 25 copies, and 23 between-choice copies; its checked 180-second run timed out at 180.78 seconds external wall time.
- Current-source v3: all 16 fixture cases passed in 41.553474 ms. The identical third-sweep checkpoint finished at 41,301.271864 ms with the same retained node/copy counts, about 3.8 times faster in this one paired comparison. The run reached round 8 but still timed out: exit 1, 180.79 seconds external wall time, maximum RSS 1,292,396 KiB. The checked budget was 180 seconds. This is not a statistical benchmark or whole-campaign speedup claim.
- Separately declared v4: checked budget 360 seconds, external timeout 370 seconds. All 16 fixtures passed in 40.150081 ms. The cone reached a fixed point in round 12, with 131 copies including 120 between-choice copies, and a final owner of 1,008,850 nodes. Internal completion was 292,090.565115 ms; external wall time 292.28 seconds; maximum RSS 1,340,340 KiB; exit 0.

The v4 directory contains `input.json`, `candidate.json`, and `cone-00000.json.gz`. The exported cone has 950,172 nodes, 4,359,667 compressed bytes, and 16,570,254 JSON bytes. Compressed SHA-256: `f8a816c3399737be9724a88b39ba81de879b83c09b29b774bbf10a4ead2a9fcc`. JSON SHA-256: `9e6ba4d7cecf6358da0dd4f1453ec6b8777b5b36539a4db614c23a4cf410063d`. Its generation record has `componentGenerated: true`, `independentVerification: false`, `complete: false`, and `accepted: false`.

### Independent original-relational checks

External checkers `/home/micha/.local/share/adventure-forge-9/af9-check-standalone-component-20260909-v1.mjs` and `af9-check-standalone-component-20260909-v2.mjs` require exact equality of all current source bindings, not the historical-prefix exception. They validate the authored component descriptor, bounded artifacts, compressed and JSON hashes, producer hash, generator dependency hash, and candidate scope. A fresh original `SymbolicModel` regenerates the original failure seed, then `verifyFactorizedComponent` checks the imported cone, seed inclusion, current/playing scope, initial disjointness, and closure under every authored choice using the original relational predecessor. Source, runner, producer, dependency, metadata, and artifact bindings are rechecked before success.

The first check used the existing absolute 1,000,000-node copy trigger with a 360-second checked budget and 370-second external timeout. It failed on elapsed time: exit 1, 361.53 seconds external wall time, maximum RSS 1,583,428 KiB. Its retained 1,008,850-node owner was already over the trigger, causing copies after even tiny allocation increases. The first 95 recorded copy events reached at most 1,389,111 allocated nodes and a largest temporary increase of 380,261 nodes. This failed run is retained, not replaced.

A new immutable v2 checker changed only the existing operational copy trigger to 1,250,000 and the checked time budget to 180 seconds. Its external timeout was 190 seconds. The hard node cap remained 2,000,000 and the JavaScript heap cap remained 1,536 MiB; the trigger is not a raised node guard. Exact command:

```sh
/usr/bin/time -v timeout --kill-after=10s 190s \
  node --max-old-space-size=1536 --import tsx \
  /home/micha/.local/share/adventure-forge-9/af9-check-standalone-component-20260909-v2.mjs \
  --candidates /home/micha/.local/share/adventure-forge-9/af9-adaptive-compaction-probe-20260909-v4 \
  --output /home/micha/.local/share/adventure-forge-9/af9-watchline-relational-check-20260909-v2.json
```

The v2 checker passed all component obligations: `componentVerified: true`, internal elapsed 99,808.048887 ms, external wall time 100.09 seconds, maximum RSS 1,604,536 KiB, exit 0. It emitted 20 checked-copy events; the largest recorded allocated owner was 1,389,213 nodes. The output intentionally retains `complete: false` and `accepted: false`. Reports and timed logs are `/home/micha/.local/share/adventure-forge-9/af9-watchline-relational-check-20260909-v1.json` / `.log` and corresponding `v2.json` / `.log`. The JVM-style heap figure above is a JavaScript old-space setting, not a process RSS cap; RSS includes other allocations.

### Scope, evidence, and next work

This proves one current-source factorized failure cone with the independent relational checker. It does not provide all 693 components, independently least C/W, a passing original family-audit regression, a frozen endpoint gate, or blind-player evidence. No complete campaign acceptance, publication, commit, or push occurred. All runs listed above are terminal. The measured current-source command wall times total 1,065.12 seconds, excluding editing/orchestration and older runs.

The native generator's absolute 750,000-node trigger and the verifier's default absolute 1,000,000-node trigger remain unchanged. A next bounded implementation can integrate retained-size-aware copying with equivalence tests, followed by a new complete source-bound generation and independent verification. Earlier prefixes under different BDD bindings remain historical evidence, not a current complete certificate. The original game goal remains larger than the current 29 scenes and 166 choices.

Source and evidence checkpoint: `/home/micha/.local/share/adventure-forge-9/af9-factorized-source-20260909-v5.tar.gz` and its sibling `.sha256` manifest. The manifest retains the current regression log, both current-source generation attempts, both independent checker attempts, and their original runner/input/output artifacts outside the repository.

## 2026-09-09: native allocation interval and closed 538-component attempt

The user resumed the explicit goal to finish the current work at a logical stopping point, resolve unfinished work, integrate on main, commit, and push. This checkpoint makes implementation and evidence progress toward that goal; it does not claim the publication requirements are complete.

### Native integration

`SymbolicObligationOptions.obligationChoiceCompactInterval` is an optional non-negative safe integer. Its zero default preserves the original strategy. A positive interval requires an enabled `obligationChoiceCompactAt`, is snapshotted once, and makes the next between-choice copy threshold `max(minimum, min(Number.MAX_SAFE_INTEGER, retainedNodes + interval))`. The threshold is reset after the initial copy, every between-choice copy, and every round-end copy. The same six roots, owner compatibility checks, current-only checks, entire-sweep fixed-point criterion, round cap, and model node guard remain in force.

The native experimental generator selects minimum 750,000 and interval 250,000. The native experimental verifier selects its existing 1,250,000-node copy trigger and records its `verificationStrategy`; the library default remains unchanged. Neither operational setting increases the hard node or heap caps.

`npm run verify` passed the build and 277/278 tests, with only the unchanged current campaign family-audit guard failing. Exit 1; wall time 143.13 seconds; test duration 140,096.227726 ms; maximum RSS 2,569,720 KiB. The expanded interval matrix checks both bit layouts, safe and reachable-unsafe variants, seed/cone equality against the original relational solver, C/W equality, forced and avoided within-sweep copies, malformed options, getter snapshotting, huge safe intervals, and default compatibility. Original log: `/home/micha/.local/share/adventure-forge-9/af9-native-copy-policy-verify-20260909-v1.log`.

### Full native attempt v3

```sh
/usr/bin/time -v timeout --kill-after=10s 1810s \
  node --max-old-space-size=1536 --import tsx \
  src/tooling/generate-factorized-candidates.ts \
  --output /home/micha/.local/share/adventure-forge-9/af9-factorized-candidates-20260909-v3 \
  --max-ms 1800000
```

The checked limit was 1,800 seconds, external timeout 1,810 seconds, heap setting 1,536 MiB, node guard 2,000,000, and round guard 128. The implementation remained frozen for this run. It terminated naturally with exit 1 at the BDD node guard: `BddLimitError: BDD node limit 2000000 reached`. Internal failure elapsed was 1,339,061.028429 ms; external wall time 1,339.25 seconds (22:19.25); maximum RSS 1,610,996 KiB. The source recheck reported no source error.

The attempt retained 538 candidate forests: 29 non-completion scene cones and 509 choice/failure components. The final artifact was `arithmetic-error:open-emergency-bypass`, `cone-00537.json.gz`. The unfinished component was `bound-exit:open-emergency-bypass`; its last progress event was a round-2 copy after `ask-clinic-before-leaving`, retaining 1,595,145 nodes from an owner with 1,916,680 allocated nodes. A subsequent operation hit the hard cap. No complete `candidates.json`, independent complete-catalog acceptance, or release acceptance was produced.

The largest retained successful artifact was `bound-exit:take-workers-through-flood`, `cone-00514.json.gz`: 1,014,284 nodes, 4,752,056 compressed bytes, SHA-256 `c02092a65cbc37e493014f30dfb7dfb6e283b2882e019b9ad85499e432cb5160`. Watchline is `cone-00466.json.gz`, 950,172 nodes, compressed SHA-256 `f8a816c3399737be9724a88b39ba81de879b83c09b29b774bbf10a4ead2a9fcc`, byte-identical to the previously independently checked standalone forest. Its old single-component result is not a complete current-source campaign certificate.

Original native input, failure, 538 per-candidate records, and 538 forests remain in the output directory. Its sibling `.log` retains timed process output. Its sibling `.closed.json` records terminal exit status, limits/strategy, exact failure, counts, and SHA-256 hashes for all 1,078 files in the failed attempt. No earlier attempt was overwritten or silently resumed.

### Isolated legacy-family alternatives, not adopted

While the native process ran, two bounded root-owned experiments used detached engine/content copies outside the repository. This concurrency is recorded; these are not controlled timing comparisons with prior standalone measurements. No original engine or content file changed.

The first prototype delays flag-writer activation until the same conservative reachable closure contains a choice/pruning read or a text read. All original pruning justifiers remain active. It passed the five existing raw-exact/family parity fixtures plus four added cases for past-only writers, future conditional text, return edges, and permanent-pruning guards: 9/9, 1.16 seconds, maximum RSS 96,616 KiB. A complete isolated campaign audit then used the original 250,000-family guard and all original projection/conservation/congruence/completion/replay checks. It still failed at the family guard: exit 1, 135.54 seconds, maximum RSS 1,593,856 KiB, external timeout 190 seconds, heap setting 2,048 MiB. Evidence: `/home/micha/.local/share/adventure-forge-9/af9-family-write-liveness-20260909-v1/`, including source snapshots, input, runner, fixtures, source-bound failure record, and timed logs. No adoption followed this failed campaign result.

The second prototype retains the first actually true globally monotone flag that falsifies a choice's AND-guard, instead of retaining every possible permanent blocker. That sufficient justifier remains in the active core and pruning certificate. It passed the five original fixtures and two exact-audit parity cases for multiple blockers, exact displayed bindings, and differing first actual blockers: 7/7, 0.98 seconds, maximum RSS 97,060 KiB. A deliberately workload-only traversal stopped at 250,000 families and 448,061 transitions: internal 9,582.605486 ms, external 9.81 seconds, maximum RSS 938,840 KiB, exit 2. The 120-second external limit and 2,048 MiB heap setting were declared in advance. It omitted safety/projection/congruence/completion/replay checks, retained `complete: false` and `accepted: false`, and cannot approve a release. The workload still exceeded the unchanged guard, so no second full audit was run. Evidence: `/home/micha/.local/share/adventure-forge-9/af9-family-sufficient-justifier-20260909-v1/`. This prototype also remains outside the repository.

The fixture commands were `node --import tsx --test DIRECTORY/tests/family-audit.test.ts`; the full isolated audit used `timeout --kill-after=10s 190s node --max-old-space-size=2048 --import tsx DIRECTORY/probe.mjs`; the size-only traversal used the corresponding 120-second timeout and `DIRECTORY/profile.mjs`. Each command's original timed output is retained alongside its immutable input/source artifacts.

### Integration state and next decision

Git commands run were `git status --short --branch`, `git log -5 --oneline`, `git remote -v`, `git fetch origin`, `git rev-list --left-right --count origin/main...main`, `git branch --no-merged main --format=...`, and history/stat comparisons for `audit-certificate-release` and `audit-symbolic-certificates`. Fetch succeeded; the comparison was 0 remote-only / 88 local-only commits. Main was already active. Historical branches and recovered working-tree changes were preserved. No merge, staging, commit, push, new subagent, live play, or blind-player run occurred. No cost or model-identity claim is made.

All processes launched for this checkpoint are terminal. The full safety and publication gates are not satisfied. The next bounded investigation should address the emergency-bypass cone, not repeat the entire prefix or increase the guard. One candidate direction is a smaller inductive resource-budget violation predicate using monotone one-time gain flags. The existing certificate checker permits closed overapproximations, but must still independently prove original seed inclusion, playing/current scope, initial disjointness, and closure under every authored choice. Unsupported resource effects or an unproved invariant must reject. Exact seed sub-partitioning is an alternative only with an explicit complete-coverage proof. Neither approach is implemented or accepted here.

Current source/evidence archive: `/home/micha/.local/share/adventure-forge-9/af9-factorized-source-20260909-v6.tar.gz`, with sibling `.sha256`. The manifest includes this attempt and both isolated alternatives; older source archives remain historical checkpoints. The broader game goal and the requested commit/push goal remain open.

## Superseding production result: 2026-09-09

Conservative resource/control projections supplied all 693 factorized
candidates. A full independent original-relational check passed, followed by
production bundle integration and fresh `npm run verify`: build and 287/287
tests passed. The existing family guard and all historical failures above
remain unchanged. Source/catalog/byte/resource checks and every zero-seed
obligation remain mandatory. No least bad-cone or reachable-state count is
claimed. See `FACTORIZED_CERTIFICATE_RELEASE.md` for the proof, commands,
original evidence, browser-driver limitation and remaining three-player /
publication gates. No fresh live acceptance or publication has occurred.
