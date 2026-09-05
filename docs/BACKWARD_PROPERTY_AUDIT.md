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

## Failure absorption

Let `F` be the union of all failure source seeds and let
`W = Pre*(completed ∪ F)`. This means a state can complete **or reach a failure**;
it must not be called a completion or reachable-state predicate. Since
`W = C ∪ Pre*(F)`, replacing the non-completion seed `playing ∩ ¬C` with
`playing ∩ ¬W` removes only states already covered by the separate failure
closures. Keeping every failure obligation preserves the exact aggregate bad
set. The strong completion root `C` remains separately computed and returned.

Implementation `5904eec` adds opt-in `nonCompletionMode: "failure-absorbed"`.
Default direct mode preserves its operation order and result shape. The new
mode starts the additional fixed point from already-computed `C ∪ F`, which
has exactly the same closure as `completed ∪ F`. Its reported rounds start
from that accelerated seed; the original strong completion predicate remains
separate. Every failure cone still follows every authored choice.

Build and all 54 BDD/symbolic checks pass on an unchanged clean freeze in
20.87 seconds. The test command takes 19.03 seconds / 991,720 KiB maximum RSS.
The independent raw DSL oracle checks every seed and closure, exact global
`W`, and full bad-union equality across finite fixtures and layouts. It includes
non-completing paths that reach a fault, unrelated non-completing states that
must remain, and synthetic invalid/uncovered failures outside `C`. Separate
checks exercise the new fixed-point cap after `C` converges, observer failure,
mixed current/next bits, option snapshotting, and fresh owner/domain rejection.

Root caught two gaps in the first test draft: a fixture labelled only-fault
also had completed exits, and synthetic failures already covered by `C` could
not detect their omission from `W`. The corrected fixtures address both. A
development assertion then incorrectly expected the entire residual to be
empty; the preserved failure shows three unrelated parameter states remain.
The corrected test requires exact residual membership and aggregate parity.
This is a fixture correction, not an observed game defect. Development logs
are `/tmp/af9-symbolic-properties-absorption-pre-fix-v1.log`,
`/tmp/af9-symbolic-properties-absorption-development-v2.log`, and
`/tmp/af9-symbolic-properties-absorption-focused-v1.log`; acceptance rests on
the separate clean 54-check freeze below.

Fresh historical probe `/tmp/af9-symbolic-absorbed-historical-139e48` contains
only the three tested verifier modules and its own locked dependencies.
Its 14-file source hash is
`3dbe4f796bc3bf848859bc13a87088200fe84a7af675f95286ec3875af8aed0b`.
The original variable order, two-million-node guard, cache/heap/round limits,
120-second checked limit and 150-second external backstop are unchanged.
The first profile was prepared but not run; preserved profile v2 adds
same-model absorption consistency checks after the full proof, separately
labelled from the independent finite oracle.

The run completes strong `C` in 18 rounds at 1,307 ms / 118,895 allocated
nodes, then `W` in 10 additional rounds at 2,530 ms / 195,044 nodes.
The first residual non-completion closure completes 13 rounds, reaching
1,973,267 nodes at 45,141 ms, then hits the node guard during round 14.
External time is 46.04 seconds / 1,359,536 KiB maximum RSS. No obligation
finishes; the post-proof consistency checks, static comparison and witness
work are not reached. This gets farther in that calculation but does not
complete the historical proof or establish a runtime improvement.

Root independently verified source/artifact bindings and that PID 1319354
is closed and absent. The report remains incomplete. No current campaign
run or main verifier adoption follows this result.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-absorbed-focused-tests-v1.json` | `4006f916f2bfbc095aaf1f8a360d0583fd382c3691074af79c5fd6b2eba2ff6d` |
| `/tmp/af9-symbolic-absorbed-focused-tests-v1.log` | `8a771182880b86e7ed77d19faaa4f3a6d259324aeebfe8928a65bb04b9279efb` |
| `/tmp/af9-symbolic-absorbed-historical-manifest-v2.json` | `d3a69578883e1c3512ed82c25afe4f2bcd480823e4184daf6ccac969b809ea88` |
| `/tmp/af9-symbolic-absorbed-historical-139e48-v2.json` | `6a869cbfdf90591bf00db964bd15017d60c09ec3b38cd7a96fc0830cb8cf991e` |
| `/tmp/af9-symbolic-absorbed-historical-139e48-v2.finalization.json` | `74fee0075a9e11da890b5052ae2a001dc0769cb2179a99adab9e6e2ae5b0eec7` |
| `/tmp/af9-symbolic-absorbed-historical-root-check-v2.json` | `c29254343ed86b011d307c16cdfccc146b125e131d0182f971c345b1b81d5830` |

## Scene partitions

Implementation `2a994f3` adds opt-in `nonCompletionPartition: "scene"`, for
either direct or absorbed mode. It divides the residual seed by every authored
scene and solves each cone independently. Every cone still follows all
authored choices across scene boundaries. Current-only scene predicates,
pairwise disjoint seeds and exact union coverage are checked before solving.
Distribution of predecessor closure over unions preserves the aggregate bad
set. All authored scenes emit a summary, including zero seeds; the historical
obligation catalog has 25 scene seeds plus 524 per-choice failure seeds.

The independent finite oracle checks each scene seed and entire cone against
raw state membership, plus exact full bad-union equality. A nonzero trap cone
reaches an initial state in another scene, and all symbolic layouts/modes are
checked. Missing, overlapping and mixed-phase scene predicates fail closed.
Exact summary IDs, zero seeds, options and owner metadata are also checked.
Build and all 55 BDD/symbolic checks pass on an unchanged clean freeze in
20.60 seconds; the test command takes 18.80 seconds / 959,952 KiB maximum RSS.

Fresh probe `/tmp/af9-symbolic-scene-obligations-historical-139e48` uses the
same historical engine, its own locked dependencies and only the three
tested verifier modules. Its 14-file source hash is
`d62fe4cc540a6927176df8b794e96b8a13f21fa9e24ae098527a1506225f7e85`.
All initial diagnostic limits remain unchanged.

Strong `C` converges in 18 rounds at 1,304 ms / 118,895 nodes, and `W` in 10
additional rounds at 2,533 ms / 195,044 nodes. Fourteen scene obligations
finish, each disjoint from the initial state; two are zero seeds. The largest
completed cone is `archive-hall`, at 21 rounds / 1,202,254 nodes. The run then
hits the checked 120-second limit during `seal-workroom` round 19, at 771,115
nodes. External time is 121.63 seconds / 1,231,892 KiB maximum RSS. No node
guard is reached in this attempt. No failure obligation, full proof, static
comparison or witness work completes.

Root verifies the 14 completed IDs against the exact authored 549-ID catalog,
all source/artifact bindings, and that PID 1324626 is closed and absent.
These are completed parts of an incomplete diagnostic, not acceptance of
the full historical or current campaign.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-scene-obligations-focused-tests-v1.json` | `976f1e13d15cc27379ade87a53cc34c43d1ce24f345dc5cd8ad0b701c6639e81` |
| `/tmp/af9-symbolic-scene-obligations-focused-tests-v1.log` | `b01aae86d1b8e8f014cb8e2e53b4761cb6bb75d8958ff0a8223a4d9c3c7d90bf` |
| `/tmp/af9-symbolic-scene-obligations-historical-manifest-v1.json` | `5ee0bef3e0cfa3db9b3fee00f6e0992c6a6601b92737afe550a01f6b55f1101a` |
| `/tmp/af9-symbolic-scene-obligations-historical-139e48.json` | `b36faf9539f3ba4fff556e0fe3a9c5735258bc10b73b618dcae5313a1682034b` |
| `/tmp/af9-symbolic-scene-obligations-historical-139e48.finalization.json` | `977db2ad764d7aa4815f5323e1172f0681151846fa1c54702673709e3b8f26f7` |
| `/tmp/af9-symbolic-scene-obligations-historical-root-check-v2.json` | `b5d66c49009781619b51080dc6a5d885c095ac056b610ed4b0b43986c69420d2` |

Because 14 separate cones completed without a node-limit failure, root
selected one extended diagnostic on the identical frozen probe: 600 seconds
checked elapsed time and a 630-second external backstop. Node, cache, heap,
round limits, variable order and semantics remain unchanged. The original
timeout evidence is retained and bound as input; the root checker must also
compare its entire logical progress prefix. Manifest
`/tmp/af9-symbolic-scene-obligations-historical-600s-manifest-v1.json` has
SHA-256 `79ef918def6492715ad6ce368a87aa7dd83e6f250092cb7a31c3b916827a25c5`.
The extended run finishes all 25 scene obligations and 426 of the 549 total
obligations, including 46 nonzero seeds. Every completed cone is disjoint from
the initial state. `bound-exit:publish-vask-and-name-mara` finishes in 26 rounds
at 1,967,065 allocated nodes. The run later hits two million nodes during
round 18 of `bound-exit:cross-the-flooded-road`; the last completed round is
17, at 1,681,141 nodes and 566,428 ms. External time is 576.31 seconds /
1,406,792 KiB maximum RSS. This is a node-limit failure within the longer
time allowance, not another elapsed-time failure.

Root verifies all bindings, the exact 426-ID authored subset, the entire
original run's logical progress prefix, and closed/absent PID 1325121.
The full historical proof, post-proof consistency checks and static comparison
remain incomplete; no current property run or verifier adoption follows.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-scene-obligations-historical-139e48-600s.json` | `b408ff3cb5d969869fe30a87e05bb7999f3616907e6d77bc1faab47728fcf016` |
| `/tmp/af9-symbolic-scene-obligations-historical-139e48-600s.finalization.json` | `20b0661d608dc7c49391ab6734d7843edb3eb2063bd887c899022122e676adea` |
| `/tmp/af9-symbolic-scene-obligations-historical-600s-root-check-v1.json` | `1b55176b9511ac68e21da622e0d4fe22b31eaba2c2db78776853c81ec5f219b9` |

The next implementation periodically copies only the current bad-set root and
its seed into another exact fresh manager during each obligation. Unlike the
earlier forward experiment, this calculation needs no retained frontier history.
Exact owner/domain/current-only checks, all predecessors and the fixed-point
cap must survive every copy. Independent finite checks are in progress;
there is no compacted-obligation campaign result yet. No further node, heap
or time-limit increase is selected.

## Repository endpoint regression

The accepted current path maps are materialized in
`tests/authored-witnesses.ts`; `tests/authored-endpoints.test.ts` executes them
against the actual current engine without runtime `/tmp` inputs or a symbolic
verifier dependency. It requires exact authored target sets and checks raw
effects, legal choices, text, facts, public resources, journal, revisions,
immutability, receipts, save/restore and full replay. Each run reports its actual
build ID; the fixture's original build ID remains path provenance rather than
a restriction against compatible future changes. Existing universal campaign
and reserved-end/player tests remain separate. The worker build and new test
pass for all 231 paths; root clean-freeze verification is pending.
