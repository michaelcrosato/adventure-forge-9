# Backward completion and safety proof

The release audit remains open. The first backward symbolic implementation is
frozen at experimental commit `5b2e320`; all 47 BDD/symbolic checks pass, but
its historical safety calculation reaches the two-million-node cap. No current
campaign symbolic proof or release adoption is accepted.

## Property and limits

For the exact bounded control model, let `Pre` include every successful authored
choice transition. Compute the least fixed points:

```
C = completed ∪ Pre(C)
Bad0 = (playing ∩ ¬C) ∪ faults ∪ invalidSuccess ∪ uncoveredEnabled
B = Bad0 ∪ Pre(B)
```

`faults` includes arithmetic errors and every resource-bound exit, including an
intermediate exit before a later reset. `invalidSuccess` detects successful
transitions leaving the valid domain. `uncoveredEnabled` detects enabled
sources with neither a fault nor a successful valid successor. A complete
result with the initial state outside `B` proves that every reachable playing
state has a finite completed route and no reachable authored action violates
these safety conditions. Bounds are obligations to prove from the initial
state, rather than assumptions used to ignore escaping transitions.

Completion is existential. An optional dead/departed outcome and a player
choosing to repeat an escapable cycle are allowed. This does not prove that
every play terminates. Global `end()`, metadata, revisions, save integrity,
receipts and actual authored reachability retain separate engine checks.
Global predicate assignment counts must not be described as reachable counts.

The helper checks current-only BDD support in both transition modes. Canonical
handle equality establishes fixed points. Node/round/time limits and observer
exceptions leave the proof incomplete; no partial result grants acceptance.

## Clean implementation check

The new modules/tests are isolated from main in `/tmp/af9-symbolic-manager`.
At `5b2e320`, build plus all 47 BDD/symbolic tests pass with identical clean
pre/post source. Total wrapper time is 20.78 seconds; the test command itself
takes 19.01 seconds with 1,055,784 KiB maximum RSS. This includes older BDD and
forward-experiment checks and is not a campaign timing.

Independent raw-DSL finite graphs check complete predicate equality, cycles,
reachable traps, unreachable faults, terminal semantics, both layouts and
transition strategies, and reversed field order. Root added isolated arithmetic
failure, bound crossing followed by reset in the same action, mixed-phase
predecessor rejection and observer interruption cases. All five new property
tests pass. Synthetic compiler-defect tests cover nonzero invalid-success and
uncovered-action seeds; ordinary validated DSL fixtures have neither defect.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-properties-focused-tests-v1.json` | `44861a6263ea79eab3dd20988a47e60484cfe9d44d4d71eeab57826c2ad44d33` |
| `/tmp/af9-symbolic-properties-focused-tests-v1.log` | `6065874ee2a6f2e8b5ae3d9cf4b9dc62c3eb65d15a06ba9722820c58e6a74126` |

## Historical diagnostic

The fresh detached `/tmp/af9-symbolic-properties-historical-139e48` uses
historical `139e48abc7288bf4a3e352fc726bbbf32d8ae553`, its own locked dependencies,
and exactly the tested `bdd.ts`, `symbolic-model.ts` and
`symbolic-properties.ts`. Engine/content match the separate clean trusted
historical checkout and accepted packed reference byte for byte. Probe build
and native TypeScript startup pass. Its 14-file source hash is
`7ba764c17c65aacaabfe0ca8eb3a27aae32d0193e2a305b9cbc308bf34a27bd7`.

Configuration: two million BDD nodes, 500,000 cache entries, 128 iterations per
fixed point, default interleaved field order, relational transitions, 1,536 MiB
Node heap, a checked 120-second limit and external 150-second timeout. Checks
occur between operations; the external timeout is the backstop. No compaction
or forward reachability calculation is used.

The first harness version imported `SCENARIO` from the raw data module rather
than `src/engine/content.ts`. It failed validation before compiling a model:
0.20 seconds, 95,432 KiB. Its script, manifest, report, progress, finalization
and log are preserved under the unversioned historical output prefix. V2
changes only those two import paths and uses fresh output names.

The real V2 run computes `C` in 18 rounds, reaching its fixed point at 1,369 ms
and 122,663 allocated nodes. The safety calculation completes eight rounds
(1,746,698 nodes at 26,312 ms), then fails the node limit during round nine.
External elapsed time is 30.23 seconds and maximum RSS is 1,005,504 KiB.
The full result is incomplete. The planned comparison against all 169,922
accepted historical static representatives never starts. Previously accepted
190 historical witness replays were bound as reusable evidence, but no new
replay or historical acceptance follows from this failed run.

Source, script, manifest and evidence bindings match after both attempts.
Processes 1303442 and 1303860 are closed and absent. V2 artifacts use prefix
`/tmp/af9-symbolic-properties-historical-139e48-v2`.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-properties-historical-manifest-v2.json` | `16ae8ef87b1f6ef151b8d9b8836e428682e500d86ef5067ff02035e566ad711d` |
| `/tmp/af9-symbolic-properties-historical-139e48-v2.json` | `fd03ab203638fd3e94612bb72cdd5836452f811950390e274661fecfc0032d78` |
| `/tmp/af9-symbolic-properties-historical-139e48-v2.finalization.json` | `13d3ed178fd62737a1c75576e892dc320e8448cccac3ee2ddee8ab7a85fe4044` |

## Current authored witnesses

A separate current-engine catalog now covers all 29 scenes, 166 authored
choices and 36 terminal-choice IDs. All 190 historical paths remain valid on
the current engine; current prefixes and a bounded search supply the additional
41 endpoints. The search hits its 50,000-state cap and explicitly reports
`boundedSearchComplete: false`. Endpoint coverage is complete because every
required endpoint has an actual replayed path; this is not exhaustive state
coverage.

Root independently replays all 231 selected paths against the clean main
checkout, whose 12 engine/content files match the separate current trusted
checkout. On build `af9-dce7b1dc57b6d6febcc9bb72`, the checker validates 2,712
actions, 2,943 full save/restore, legal-choice and conditional-text checkpoints,
2,712 raw authored-effect comparisons, 72 receipts and 231 full engine replays.
All endpoint IDs/hashes/revisions/observations match. External time is 0.78
seconds with 107,956 KiB maximum RSS; source and input hashes remain unchanged.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-current-authored-witness-catalog-v1.json` | `b8fea95d2c362b0b46577257a0ca8a027d6198212ab7c053c7b231ff4d81141b` |
| `/tmp/af9-current-authored-witness-catalog-independent-v1.json` | `597a355b202646bfcebf64c10b10300e080e00905f0f1f91a321abb3d047dea3` |

The worker corrected script parsing/newline issues and overwrote intermediate
catalog JSON while preparing the final artifact. Those intermediate bytes were
not preserved and are not reconstructed as evidence. Current acceptance rests
on the fresh independent root checker and its new log/output, not on an assumed
unchanged worker execution. No live-player run was involved.

## Separate obligations

Both reviewers accept splitting `Bad0` into separate predecessor-closure
obligations: existential `Pre*` distributes over finite unions. Every closure
still follows all authored choices and retains its zero-step seed.

Implementation `830b29e` uses a fresh exact manager for each nonzero seed.
It checks distinct owners, field layout, scenario, transition mode and copied
valid-domain/initial/playing/completed predicates before copying is accepted.
The domain check rejects different bounds that happen to use the same bit
width. Returned summaries retain no disposable roots or managers; the original
strong completion root remains tied to its original manager.

Build and all 50 BDD/symbolic checks pass on an unchanged clean freeze in
20.76 seconds. The test command takes 18.96 seconds with 1,164,836 KiB maximum
RSS. Independent finite graphs compare each seed and closure, then copy their
roots into one owner only in small fixtures to check exact union equality with
the original proof. Invalid fresh owners/domains and a per-obligation cap
reached after completion converges are checked explicitly.

A fresh historical probe at
`/tmp/af9-symbolic-obligations-historical-139e48` contains only tested
`bdd.ts`, `symbolic-model.ts` and `symbolic-obligations.ts`, with its own locked
dependencies and a passing build. Its 14-file source hash is
`3be367f0aa9c444fa9d42ff33ea167a5d55e2320146111182cee66b998a9c57f`.
The node/cache/round/heap/time bounds and original variable order are unchanged.

The completion predicate converges in 18 rounds at 1,304 ms and 118,895
allocated nodes. The first non-completion obligation completes eight rounds
(1,697,404 nodes at 31,347 ms), then reaches the two-million-node cap during
round nine. External time is 37.64 seconds with 1,302,760 KiB maximum RSS.
No obligation finishes; no static comparison or witness replay runs. Source
and artifact bindings match, and PID 1311315 is closed and absent. Splitting
faults alone therefore does not resolve the observed workload.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-obligations-focused-tests-v1.json` | `e3519ac3e9c60cb4bfa705ea7296fabd89bf8752235df0249b01e6a9dade5105` |
| `/tmp/af9-symbolic-obligations-focused-tests-v1.log` | `0d0ef8b60f7294d5c2d4515756e16497f156351c4f9a94bd6ed742dae9ea1839` |
| `/tmp/af9-symbolic-obligations-historical-manifest-v1.json` | `220383ea637c7dab5fd51cbc40fdd3735073a0c2d8c5d9df6326205dadb4bd04` |
| `/tmp/af9-symbolic-obligations-historical-139e48.json` | `e049fd3dbd48fc8d243f59a060b84315b5b0a15286d2896450373d66278d2063` |
| `/tmp/af9-symbolic-obligations-historical-139e48.finalization.json` | `17fec336a4fd6c9d9f60b82da6d3223bcc0d550e14c83a09d53804a3c8ed1419` |

Root independently checked all three failed attempts' closed processes,
source snapshots and artifact bindings, plus both clean test freezes and the
accepted current witness catalog. The aggregate check is
`/tmp/af9-backward-property-root-check-v1.json`, SHA-256
`cdc7328fbeca085c21848e62ab4ffae843315c07ff44e2dc22c6d7f516a2aa17`.
The worker catalog correction disclosure is preserved separately at
`/tmp/af9-current-authored-witness-catalog-provenance-note-v1.json`, SHA-256
`767c886efe12723d7867613ced31315ac6561b74591de1fda0169efa3e101eb0`.

## Next reviewed simplification

Let `F` be the union of all failure source seeds and let
`W = Pre*(completed ∪ F)`. This means a state can complete **or reach a failure**;
it must not be called a completion or reachable-state predicate. Since
`W = C ∪ Pre*(F)`, replacing the non-completion seed `playing ∩ ¬C` with
`playing ∩ ¬W` removes only states already covered by the separate failure
closures. Keeping every failure obligation preserves the exact aggregate bad
set. The strong completion root `C` remains separately computed and returned.

Both independent reviewers accept this exact simplification. It has no
implementation or run yet. It could reduce bound-induced non-completion states; its own fixed point
could also be expensive. Independent finite-oracle union equality and bounded
historical evidence are still required. Full verification, fresh Stage 8
players, publication, world-scope acceptance and final cleanup remain pending.
