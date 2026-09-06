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
cap survive every copy. No further node, heap or time-limit increase is selected.

## Exact per-obligation compaction

Clean experiment `301c5e88eb547b3b23ed609fb17359cd6d47792c` adds
`obligationCompactEvery`, a nonnegative safe integer snapshotted once. Zero
preserves the disabled behavior and summary shape. A positive interval copies
the updated nonfixed closure, original seed and four static identity anchors
from the current owner to a fresh equivalent model. Every copy validates
distinct ownership, layout, scenario, transition mode, bounds/lifecycle anchors
and current-only support before publishing the new owner. Fixed-point identity
is checked before copying. The final callback owns the latest roots; no
historical frontier or old owner is retained by the initial-copy binding.
All completion and failure seeds, fault precedence and predecessor choices
are unchanged. Zero seeds report zero compactions when enabled.

Independent finite-oracle checks cover intervals one and two, direct/global
and absorbed/scene modes, exact per-seed closures and aggregate bad membership,
strong completion and `W`, repeated ownership changes, second-copy alias and
bound defects, limits and observer failures. Independent review finds no
correctness blocker. The clean build and all 57 BDD/symbolic checks pass in
20.73 seconds overall; the test command takes 18.88 seconds / 942,812 KiB.

The fresh historical probe
`/tmp/af9-symbolic-compact-obligations-historical-139e48` uses its own locked
dependencies and the exact three tested modules. Its manifest keeps the
two-million-node, 500,000-cache, 128-round, 1,536 MiB heap and 600/630-second
checked/external limits, with compaction every four nonfixed rounds. Source
hash is `d2844d5f54a525704e2faddf7214df76209aea05d4942e8f43c6e5267174d61a`.
The campaign run closes at the checked elapsed-time limit after 426/549
obligations, including all 25 scene cones and 46 nonzero seeds. Every completed
cone is disjoint from the initial state. It performs 159 compactions and
observes at most 1,191,157 allocated nodes in any progress event. The last
event is `bound-exit:cross-the-flooded-road`, round 18, at 1,186,309 nodes and
606,904 ms; round 16 had copied 1,132,521 nodes down to 184,055. External
runtime is 607.14 seconds / 1,229,396 KiB maximum RSS. This attempt reaches
the time guard rather than the node guard; the full proof, post-proof
consistency checks and historical comparison remain incomplete.

Root verifies source/artifact/test bindings, the exact completed authored
subset, progress-file parity, every compaction event and per-summary copy
count, and closed/absent PID 1335580. There is no accepted historical or
current property proof. The current-profile draft is syntax-checked only;
it has no probe, manifest or campaign result.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-compact-obligations-focused-tests-v1.json` | `d89f65e3a1bfd2f02979dd4a11bcfe690e4423cf8e361d0a1dccfb4691d3d58d` |
| `/tmp/af9-symbolic-compact-obligations-focused-tests-v1.log` | `2abe56e8b9383d0280721ba36eb82d6d8cbadf5710f9ae8ca01c0d69dee78170` |
| `/tmp/af9-symbolic-compact-obligations-historical-manifest-v1.json` | `6be6f0d4f0a5fc8ee7f18fbf1e9f19d27f94e9e35b284fa6724048d7779021c0` |
| `/tmp/af9-symbolic-compact-obligations-historical-139e48.json` | `5375b8d38624471bff7f661238a333712516fb703845172af00a407ccdb5b9fd` |
| `/tmp/af9-symbolic-compact-obligations-historical-139e48.finalization.json` | `aad161fced04bed604d8beb3848b9f3c58860c57d44ab856267529486f34c059` |
| `/tmp/af9-symbolic-compact-obligations-historical-root-check-v1.json` | `2a96482014ae454516ebc9c43e0134dfdfd15d0e93ac580b620d9ea18c05f8ab` |

The next reviewed change combines the original failure seeds into one exact
failure cone: `Pre*(union F_i) = union Pre*(F_i)`. It retains every arithmetic,
bound-exit, invalid-success and uncovered-enabled seed and its catalog metadata,
without claiming that each individual cone was calculated. With scene
non-completion partitioning, historical closure obligations become 26 rather
than 549. Default per-choice behavior remains available for attribution. The
union may itself be larger, so focused checks and a fresh bounded historical
run must establish its cost. No memory or time allowance is increased.

## Combined failure cone

Clean `b8f1b3cfd61baa1190932bad0ee258125d01b41a` adds optional
`failurePartition: "choice" | "combined"`. The default preserves prior
shape, order and callbacks. Combined mode constructs the same four seeds
for every authored choice, then solves their exact union under the explicit
`failure-union:` ID and kind. Its frozen `failureSeeds` metadata retains each
original ID, kind, choice ID and emptiness, with no owned roots or individual
closure claim. It preserves strong completion, `W`, scene partitions,
compaction, limits and original effect-order fault classification.

Independent checks exercise both failure modes, both transition compilers,
both layouts and field orders, direct/global and absorbed/scene modes,
overlapping and zero seeds, intermediate bound failure, compaction intervals
one and two, recursive metadata freezing and synthetic compiler failures
outside strong completion. Root adds an explicit synthetic `W = C ∪ Pre*(F)`
check. Independent review finds no blocker. Clean build and all 59 focused
checks pass in 20.96 seconds overall; the test command takes 19.10 seconds /
1,033,852 KiB maximum RSS.

The fresh grouped historical probe retains its own locked dependencies and
the three exact tested modules; source hash is
`4a8b22f4ef41f97d60d34890a9ff10f6561b3396fa7c3fd3ac7b6c47b118a667`.
With compaction every four nonfixed rounds, all 25 scene cones complete.
The combined failure cone reaches two million nodes during round 15.
Round 12 copies 1,885,160 allocated nodes down to 217,722; round 14 reaches
1,887,297 nodes before the next scheduled copy. External runtime is 240.35
seconds / 1,378,340 KiB maximum RSS. Root checks the complete original C/W/
scene logical progress prefix, all bindings and closed/absent PID 1344920.
The combined cone, full proof and static comparison remain incomplete.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-grouped-failures-focused-tests-v1.json` | `ef12562207dde3e18e9b8008171766b68f6d2a5b9b12fc65fccebd97619773b8` |
| `/tmp/af9-symbolic-grouped-failures-focused-tests-v1.log` | `0bae424db677e7fe13aec61aebb5c5be8fed63d611b1ebfdae45d0faefa88cab` |
| `/tmp/af9-symbolic-grouped-failures-historical-manifest-v1.json` | `e540507fe839bf1058277fa713b1512a7bc83c86cee7d91927043fe204c2dadd` |
| `/tmp/af9-symbolic-grouped-failures-historical-139e48.json` | `6587a29e42ebc04f6c73381f9555739268d53637ac7d4df9060f4c548b8f914c` |
| `/tmp/af9-symbolic-grouped-failures-historical-139e48.finalization.json` | `6192e6d6b9b077dd1cfc50d0492253c9217967492f3edd089f4bf0a5eab3ae5f` |
| `/tmp/af9-symbolic-grouped-failures-historical-root-check-v1.json` | `fa1a5c210588c6af563ebab3213a4dbcee0228560ea4287b475dfc031135066f` |

Measured allocation growth between copies motivates one diagnostic with
compaction after every nonfixed round. Source, node/cache/round/heap/time
limits, order, seeds and semantics are unchanged. Interval one already passes
the focused exact-oracle checks. The new manifest is
`/tmp/af9-symbolic-grouped-failures-historical-every-round-manifest-v1.json`
(SHA-256 `dcd62f3fa5a22452e580d4328296366033b78816717c3ebc086cb4cf5e7726e1`).
It reuses the unchanged probe, with fresh output paths and bound prior failure
evidence. Its final result and the subsequent time-only extension follow.

### Every-round result and accepted historical proof

The 600-second run completes all 25 scene cones and 224 compactions. The
combined failure cone reaches its fixed point at round 32, 950,901 allocated
nodes and 613,119 ms. The elapsed-time observer throws before the initial
intersection, final cone summary and reference comparison, so this run is
not accepted. External runtime is 613.35 seconds / 1,496,764 KiB maximum RSS.
Root preserves and validates this failed result and the closed process.

That measured final fixed point just beyond the time check supports one
separate time-only extension: 720 seconds checked and 750 seconds external.
The user imposed no 600-second limit. Source, bounds, node/cache/round/heap
limits, ordering, failure seeds and every-round copying remain identical.
The fresh output binds all earlier failure evidence. It exits successfully
in 616.66 seconds / 1,490,792 KiB maximum RSS. Strong completion converges in
18 rounds; completion-or-failure adds ten rounds. All 26 obligations finish,
including 17 nonzero seeds, with 224 compactions and at most 1,857,073 nodes
in a progress event. Every initial intersection is empty. All 524 original
failure-seed records remain present; all 262 invalid-success and uncovered
seeds are globally empty. Individual failure closures are not claimed.

Comparison covers all 169,922 static reference states for domain, strong
completion, completion-or-failure and fault classification. The reference
has 332,402 transitions and complete 25/131/34 authored endpoint coverage.
The 190 accepted historical actual-engine witnesses are explicitly reused
under unchanged engine bytes, not rerun. Global BDD assignment totals are
not reachable-state counts; there is no aggregate bad root or per-state
bad-root comparison. Root independently verifies exact catalogs, compaction
accounting, all source/test/artifact bindings, the entire 529-event earlier
logical progress prefix, and closed/absent PID 1348377. The historical
property proof is accepted; no current proof or production adoption follows
automatically.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-grouped-failures-historical-139e48-every-round.json` | `6c9e71ac34882e4c1f77db627c9e024a3f3ab6037247718625d76db84a3c3677` |
| `/tmp/af9-symbolic-grouped-failures-historical-every-round-root-check-v1.json` | `2e259b9da24e55beecce56525544dc1aa19303f1151a7c7f9725d17960f8f73a` |
| `/tmp/af9-symbolic-grouped-failures-historical-every-round-720s-manifest-v1.json` | `cf5e93b4f8f77a1646b790f0b52eda65df431f07ab25358b8090be11ded24a24` |
| `/tmp/af9-symbolic-grouped-failures-historical-139e48-every-round-720s.json` | `d14a087d40664f21e13e3c0569f2755deedc0707a7765c1cca04d4e9ce8d87ca` |
| `/tmp/af9-symbolic-grouped-failures-historical-139e48-every-round-720s.finalization.json` | `90162fe95289ebd28d9829a5926b4950d78eab7a8f80a2392fc3c642dc6dd5f3` |
| `/tmp/af9-symbolic-grouped-failures-historical-every-round-720s-root-check-v1.json` | `701c00047ef6e2e67e7208af6b52bf6a87b6e5e7fbb91c046ff29e183f180317` |

The current-profile drafts received independent review and real artifact
preflight. Earlier assumptions about report fields and catalog coverage
counts were incorrect: the catalog stores coverage ID arrays, while the
independent report stores counts. Corrected v4 validates the actual catalog,
independent report and unchanged source maps; its preflight executes no
symbolic model, proof or witness replay. Report
`/tmp/af9-current-profile-artifact-preflight-v2.json` has SHA-256
`f22ee3841b2a604c237f9eb389004f9a32d2e23e1c5764f76b7cc7b3b8944e79`.
The preparation script requires this preflight, accepted historical proof,
clean main and the clean 59-test experimental freeze before creating a
separate current probe with its own locked dependencies. The intended current
run retains all 30 closure obligations, 664 original failure-seed records and
all 231 authored witnesses, using a fresh model per replay path. Candidate
resource bounds remain obligations to prove; endpoint samples do not establish
universal bounds.

### First current grouped run

Fresh detached `97b04d56a38e0a9324ca5c052d9a42dff7e44afa` has its own locked
dependencies and a passing build. Its four symbolic modules match the clean
59-test freeze; engine/content/package bytes match the accepted current
catalog and trusted source, with build ID `af9-dce7b1dc57b6d6febcc9bb72`.
Source hash is `f8d713200b9fdfd64a03b197f453d4c2d074ce86c6fbd653826b1f90cfcba299`.
The constructor reports 58,572 nodes and 29 scenes / 166 choices / 10 resources /
62 flags. Independent preparation review finds no launch blocker. The frozen
profile specifies all 30 obligations, all 664 seed records and 231 subsequent
symbolic/actual-engine paths. Root launches while the independent output
checker is being completed; acceptance criteria remain frozen in the profile.

The run closes at the two-million-node cap during completion-or-failure round
five, before any safety obligation completes. Strong completion fixes at
round 18 with 1,366,218 nodes and 51,351 ms. Completion-or-failure round four
reaches 1,883,639 nodes at 66,169 ms. External runtime is 69.37 seconds /
1,007,832 KiB maximum RSS. The runner records unchanged source, input and
artifact bindings and closed PID 1354666; root has polled the closed process.
The proof and all 231 symbolic witness replays are incomplete. The independent
checker validates the incomplete evidence with no errors and denies acceptance.
Root additionally checks the exact 24-event phase/round/fixed-point prefix,
the full runner command, zero proof/replay output, all input/output hashes and
unchanged source snapshots. This is a capacity failure, with no accepted
current safety verdict. Existing copying applies only within later bad-state
obligations; exact copying of the initial C/W calculations is the next reviewed
change. Bounds and memory/round/time guards are not increased.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-grouped-failures-current-manifest-v1.json` | `413a953f2c8bce4c6a6138c73f28b6492c9fce7d429bc3e9d623aa47c4f6d967` |
| `/tmp/af9-symbolic-grouped-failures-current-profile-v5.mjs` | `e4d261b7b9914818eeebcea31a31e88bdb9458eaae10889e1e13fa37cc613178` |
| `/tmp/af9-symbolic-grouped-failures-current-97b04d5.json` | `29191d3b5339609dd18b756f87e3de8e4a93054cc3e3289c57cb5e5511fd2da3` |
| `/tmp/af9-symbolic-grouped-failures-current-97b04d5.finalization.json` | `a6e802122696c09c5c447b3ef8209a867c38d16dd265eefbd08c94c5ce96627d` |
| `/tmp/af9-symbolic-grouped-failures-current-failure-root-seal-v1.json` | `9adee126cafac90803eeab55e597690ed6603fe41e8796e0d52bebffb0336eb9` |

### Exact copying of completion fixed points

Clean `a065fd5e8d79181a5e54666cd3dfd465716a46fc` adds optional
`fixedPointCompactEvery`. Zero retains the original owner, operation order
and result shape. Enabled mode first hands construction roots to a validated
fresh owner, then copies after every configured nonfixed C/W round. The
initial handoff is excluded from the separate C/W compaction counters.
Every copy retains C, current W, the failure union, every original choice
seed and four static anchors as applicable. It verifies current-only roots,
layout/scenario/mode equivalence and copied-versus-regenerated anchors before
publishing the owner. All returned numeric roots belong to `result.model`.
Later obligations retain their existing local ownership and exact semantics.

Independent tests cover multiple C/W rounds, both transition compilers,
layouts and field orders, intervals one/two, all proof/failure partition modes,
flag/resource fixtures, exact raw-oracle cones and seed metadata. Negative
checks target initial, C, first-W and later-W alias/layout/bound failures;
the bound case preserves bit width and a valid initial value to exercise
anchor validation. Limits, observer failures and one-read options are checked.
Root requested the W-boundary and flag/resource coverage after reviewing the
first focused test draft. Independent source and historical-profile reviews
find no material blocker. Clean build and all 64 BDD/symbolic checks pass in
21.29 seconds overall; tests take 19.42 seconds / 1,111,232 KiB maximum RSS.

The fresh historical probe retains its own locked dependencies and passing
build, with source hash
`275f22102012cba416528be0abf042ed681175d51f497efc6d09fe66a2134025`.
It adds only `fixedPointCompactEvery: 1` to the prior accepted configuration;
node/cache/round/heap/time bounds remain unchanged. Its profile uses the actual
returned owner, checks C/W and later-cone metadata, and compares all 169,922
reference states. The independent checker compares prior semantic phase/
round/fixed-point progress, all completed obligation classifications, complete
C/W assignment totals and original seeds. Allocated node histories may differ
under copying. PID 1365898 closes with exit zero after 639.25 seconds /
1,555,724 KiB maximum RSS. Root polls the closed process and independently
accepts its source/artifact bindings, complete semantic progress comparison
and all 26 obligation classifications. C fixes at round 18 after 17 copies;
W fixes at round 10 after nine copies. The 224 later-obligation copies,
32-round failure closure, 524 seed records and global C/W assignment totals
match the prior accepted proof. All 169,922 reference states pass completion,
completion-or-failure, domain and fault checks, with 332,402 reference edges
and the complete 25/131/34 endpoint sets. The 190 historical actual-engine
witnesses are reused as unchanged accepted evidence, not replayed anew.
This accepts the historical correction only; a subsequent current proof
and fresh symbolic/engine endpoint replay remain required before adoption.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-fixed-point-compact-focused-tests-v1.json` | `c7a6ca08397fc061ebf8b61a444d1d851811f62f70f0d9d322cd6f7ea23fb312` |
| `/tmp/af9-symbolic-fixed-point-compact-focused-tests-v1.log` | `2bf7467bc452b4a7d6b5b2dc4294f11e9c94092fa8a5fad447a13e7bf08bd339` |
| `/tmp/af9-symbolic-fixed-point-compact-historical-manifest-v1.json` | `bfb30458ff09eb1df8600bc6c42e78c4ea0be467e3662eb91cc3532b49b03bf4` |
| `/tmp/af9-symbolic-fixed-point-compact-historical-139e48.json` | `0d1dd1026fff01761bd44bbce90458717c0416eb34e663f58697ebb76545130e` |
| `/tmp/af9-symbolic-fixed-point-compact-historical-139e48.finalization.json` | `5f7b7610c9f87c7df36e96bf3808e8a399ccae30ef49ba264605c9c94b440aeb` |
| `/tmp/af9-symbolic-fixed-point-compact-historical-root-check-v1.json` | `bf9376d805d76f29d6647c1f3096e73cfe32925a9da4b3eff10c5af5b9dae315` |

### Current fixed-point-compaction run

Fresh current source `11d86ae9e0c0a9ff90a8547f2861d08395e44e97`
retains build `af9-dce7b1dc57b6d6febcc9bb72` and all 15 accepted
engine/content/package file hashes. Preparation v1 creates the probe, installs
locked dependencies, builds and passes the constructor check, then stops
before writing a manifest because it names a preflight log that does not
exist. The actual preflight script and passing JSON are preserved. Root's
v2 validates the unchanged, never-run probe and all four tested modules,
builds again and binds the real preflight artifacts plus the original failed
preparation script/log. No log is reconstructed or invented.

The resulting source hash is
`dfafe65a01bfc634e98deb4056ec0db6967e1def7f4d0ecc87c90573ab38f3d7`.
The manifest binds 49 evidence files, the accepted historical correction and
the clean 64-test freeze. It retains 2,000,000 nodes, 500,000 cache entries,
128 rounds, 1,536 MiB old-space and checked/external limits of 720/750 seconds,
with both copying intervals set to one. C fixes at round 18 after 53,413 ms,
and W fixes at round 12 after
89,688 ms, passing the previous W capacity failure. PID 1372054 then closes
with exit one at the checked time limit: 722.32 seconds / 1,507,016 KiB maximum
RSS. Fourteen of 30 obligations complete; `non-completion:scene:seal-workroom`
reaches nonfixed round 14 at 840,662 nodes before the elapsed observer throws.
No aggregate proof or symbolic replay result is returned. The reported BDD
statistics are explicitly constructor-only, not the copied active manager.
The independent v3 checker validates the incomplete evidence and denies
acceptance. Root separately checks all 425 phase/round/copy events, completed
summaries, the final elapsed overrun, exact runner command, process absence
and every source/input/output hash. The node/heap guards do not fail; the
performance correction under review hoists an unchanged quantifier-cache key
out of recursive joins. No current universal verdict or production adoption
is accepted.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-prepare-symbolic-fixed-point-compact-current-v1.log` | `2e624afd00738ae76d3d3f1558fc3e9e9679ba1b7a8581a59d14d90c94f43b34` |
| `/tmp/af9-prepare-symbolic-fixed-point-compact-current-v2.py` | `30fe0eafaece0dafed6623dded854d8b6fc45db6026daaf28f6954f37da06053` |
| `/tmp/af9-symbolic-fixed-point-compact-current-manifest-v1.json` | `1d57094f4689f8c02f83f0fe85bb6fb5620cdffb5daaebe648fb75ed9cfb5fd7` |
| `/tmp/af9-symbolic-fixed-point-compact-current-11d86ae.json` | `8162a3a0c4fee4e93016c8db6c69be6f0f8b01c8ea8a922ea25526c584b8c081` |
| `/tmp/af9-symbolic-fixed-point-compact-current-11d86ae.finalization.json` | `8bb5753812980ddaf33475621665c90d24a6a9f1bcd5326de43de8fb5f060703` |
| `/tmp/af9-symbolic-fixed-point-compact-current-root-check-v3.json` | `a2ea513a7d08d28bfc912f67b056b5ec4e4dba04cf7ccc70423aef5b2ca12363` |
| `/tmp/af9-symbolic-fixed-point-compact-current-failure-root-seal-v1.json` | `ed97e7edcb773474cefe4a3ba3aff80a35bd54d435df9007ce70d3687e5dc0c2` |

### Quantifier-key hoist historical acceptance

Experimental `ccf3dc1abec85cd3da1c8e258b9d3121325a1593` moves the unchanged
existential-quantifier cache-key string construction outside recursive calls.
It changes neither cache keys nor BDD operation/allocation order. Root's clean
build and all 64 focused checks pass in 21.35 seconds overall. The small
alternating eight-pair benchmark matches truth, canonical handles and manager
statistics. Its original v3 report calls upper-middle samples medians; the
preserved correction note gives the true even-sample medians as 18.7858695 ms
before and 15.605057 ms after. Those are microbenchmark measurements only.

The separately prepared historical run on `139e48a` retains the same bounds,
node/cache/heap/round limits and checked/external 720/750-second limits. Its
probe source hash is
`0ec3b46732f3f75a186e545a00f9cf1336ed76d811e5398163799d6a34af3916`.
Input-only preflight passes against the actual manifest and evidence.
PID 1386170 closes with exit zero: 590.50 seconds / 1,440,880 KiB maximum RSS
(the Python wrapper measures 590.523 seconds). Root polls the closed session
and verifies the exact command, source/evidence hashes and all 600 progress
events against the prior accepted run, excluding only elapsed time and RSS.
The complete proof and static comparison are identical: 26 obligations, 524
original failure seeds, 262 zero compiler-closure seeds, C/W rounds 18/10,
17/9 C/W copies, 224 obligation copies, 169,922 classified states and 332,402
reference edges. Every initial intersection is empty. The 190 historical
engine witnesses remain reused unchanged evidence, not new executions.
The independent checker also passes with zero errors. This accepts the
historical optimization; it does not accept the current campaign or change
the production release audit.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-exists-key-hoist-focused-tests-v1.json` | `edbb5389755bef6f6bb45c41334be2615481e38978d9c50b0c0e58788f580ea3` |
| `/tmp/af9-symbolic-exists-key-hoist-benchmark-root-median-note-v1.json` | `d72475fa13349c19004a58b25eec6a5482908c3efb11eb655e160431887592fe` |
| `/tmp/af9-symbolic-exists-key-hoist-historical-manifest-v1.json` | `845a50e26335908dd2fcba58118a9eb2cdeb837abc71e5d8b01dab817ddc29ea` |
| `/tmp/af9-symbolic-exists-key-hoist-historical-input-preflight-v1.json` | `eadc7b28add67c67c5b28baa45e2988048c0c43b28da502cdcf5cfe8e06a860a` |
| `/tmp/af9-symbolic-exists-key-hoist-historical-139e48.json` | `08983cac3f227239bd563e68ecd1011f2803722bd14f1220671cbfcc04d3e14d` |
| `/tmp/af9-symbolic-exists-key-hoist-historical-139e48.finalization.json` | `f32d1166b3e0a83ab5234243b06bfcd7cc74cd4b2f8af45d9dec042925bae840` |
| `/tmp/af9-symbolic-exists-key-hoist-historical-root-check-v1.json` | `06cfddf2fce834f44a61c5dc731a3662637deb6365d23b6267394c972bff1540` |
| `/tmp/af9-symbolic-exists-key-hoist-historical-root-seal-v1.json` | `0b36b9da79f0801012d7349a36af8b057f980622579592f0c4ea89c25e02f25a` |

### Certificate verification prototype

The current timeout occurs after 14 of 30 obligations, so a single historical
speed improvement is insufficient evidence to repeat the same current
720-second attempt. Two independent reviews support a different measured
optimization: generate bad-state predicates once, then validate them with
exact symbolic inclusions against the current model. For failure predicate
`B_F`, require all four freshly generated failure sources for every choice
to be contained, `Pre(B_F) ⊆ B_F`, and `initial ∩ B_F = ∅`. Freshly compute
exact strong completion `C`. For every authored scene, require
`P_s \ C ⊆ B_s ∪ B_F`, `Pre(B_s) ⊆ B_s`, and `initial ∩ B_s = ∅`, where
`P_s` is the complete valid playing-state slice for that scene. Every `Pre`
uses every authored successful choice, including cross-scene predecessors.
These conditions prove the same safety and finite completed-continuation
property without claiming that the supplied cones are least fixed points or
that an unverified `W` is exact.

The prototype needs a strict dense BDD forest boundary, exact current-only
ownership and model/configuration binding, disposable managers, adversarial
finite fixtures, and measured historical/current generation and verification.
A closed overapproximation of `C` is insufficient and must never be accepted.
Certificate claims, sampled paths and old verdict fields are not proof inputs.
Source/byte limits, incomplete generation and absent or malformed artifacts
must fail closed. No production command, workload budget, acceptance criterion
or game behavior has changed. The review is preserved at
`/tmp/af9-backward-certificate-proposal-v1.md`, SHA-256
`494647ca7cae605b720e4d20876f4393c4d358d47658e3f5789944006ed111ce`.
Implementation and the source-bound historical/current gates remain pending.

## Repository endpoint regression

The accepted current path maps are materialized in
`tests/authored-witnesses.ts`; `tests/authored-endpoints.test.ts` executes them
against the actual current engine without runtime `/tmp` inputs or a symbolic
verifier dependency. It requires exact authored target sets and checks raw
effects, legal choices, text, facts, public resources, journal, revisions,
immutability, receipts, save/restore and full replay. Each run reports its actual
build ID; the fixture's original build ID remains path provenance rather than
a restriction against compatible future changes. Existing universal campaign
and reserved-end/player tests remain separate. Clean main freeze `71fec09`
passes the build and all 116 selected regular checks, including all 231 paths,
in 2.50 seconds overall. The test command takes 1.12 seconds / 114,940 KiB
maximum RSS. The selection excludes only `tests/scenario.test.ts`, whose
unchanged full-family audit still exceeds its workload guard; this is not a
passing full `npm run verify`. Before/after source snapshots are identical.
Root also checks that the committed fixture exactly matches the accepted
catalog's path maps and its 29/166/36 authored target sets.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-authored-endpoints-non-audit-tests-v1.json` | `c558b595a7cdfd86763a87fd02a70fea254f5966aa4c9caa7e8604156457ba06` |
| `/tmp/af9-authored-endpoints-non-audit-tests-v1.log` | `1c9e4c25c706574ee8a7701f526dcc21e31fa50a5ebe94eaea71b73bbeedd642` |
