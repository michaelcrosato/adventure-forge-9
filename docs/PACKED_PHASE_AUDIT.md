# Permanent-phase packed audit experiment

This isolated experiment is frozen at
`9df0cf7af661a17aa3a14a4623b1bb735badc863` in
`/tmp/af9-symbolic-manager`. It has complete historical control validation,
but the current campaign still exceeds its diagnostic state cap. Main's
verifier, production guard and game behavior are unchanged. Stage 8 is not
accepted or published. Earlier static and BDD attempts remain indexed in
`SYMBOLIC_REACHABILITY_EXPERIMENT.md`.

## Representation and corrected proof

The new explicit scope is `phase-future-flags`. Every resource, scene, status
and ending stays exact. Full packed representatives and actual BFS parent
paths are retained; only indexing clears flags outside the future read set.
Keys contain both the retained-mask identity and the normalized code. Complete
codes are validated before normalization or membership lookup.

The helper analyzes its validated immutable scenario without importing the
current engine's dynamic audit API, which historical `139e48a` lacks. A flag
is monotone only if every authored write sets it true. Resource guards and
resettable flags never justify pruning. The future closure follows every
authored route except a choice permanently disabled by a currently true
monotone flag required to be false.

Review found a counterexample to the initially proposed subset argument:
a route requires both `a=false` and `b=false`; after setting `a=true`, the
existing resolver retains only `a` for that pruned route. A legal action then
sets `b=true`, making the resolver retain both justifiers. Its retained set
grows. This disproves the claimed subset invariant; it does not by itself
disprove congruence of the existing resolver's mask-aware keys.

The corrected rule, explicitly named `all-monotone-false-gates`, retains
**all** monotone false-gate flags of a pruned choice, including those still
false. An unpruned choice already reads every guard; once pruned, its phase
guard set remains fixed, while the reachable scene closure only shrinks.
Successor retained sets therefore stay within predecessor sets. This is a
conservative extension of the existing resolver, not exact read-set equality.
The current engine analyzer is unchanged.

Every legal graph edge checks that containment. Identical full-code collisions
are trivially deterministic. Every nonidentical collision compares exact
non-flag fields, current text flag inputs, authored choice IDs/order, all
disabled/success/fault results and every successful successor key. Equal text
flag inputs and exact resources imply equal selected scene lines. A divergent
collision fails the traversal. Dead-end and completion analysis retains every
representative edge. Facts, history, revisions and hashes remain outside this
control proof and require the separate engine/replay checks.

## Corrections and focused verification

Root caught a draft normalization expression that set retained flag bits true
instead of preserving their values; both key and normalization were corrected
before acceptance. The first two root counterexample fixtures failed content
validation: missing self-navigation, then an unwritten text flag. Those attempts
are preserved as `/tmp/af9-packed-phase-justifier-expansion-v{1,2}.mts` and
their `.failure.json` records. The valid counterexample is
`/tmp/af9-packed-phase-justifier-expansion-v3.json`, SHA-256
`7e6bcab368c8769ae6cbe64760b119747d34942f81fe8d55136bcca1d99d7f04`.
Its exact model/helper/graph and failing test source are archived in
`/tmp/af9-packed-phase-justifier-expansion-source-v1/`.

The independent four-fixture test run initially passes three and reproduces
the handoff failure in the fourth. Preserve
`/tmp/af9-packed-phase-projection-focused-v1.log`, SHA-256
`2af9f14aa9860be5eba754f86881fbb66e25158e7b99675627d05421e5f4b124`.
After correction, all four pass. Root adds conservative-superset and nested
immutability checks, then freezes the combined implementation.

Build, 21 packed checks and nine existing audit-scaling checks pass on unchanged
clean `9df0cf7`: 30 total, 2.36 seconds / 337,700 KiB maximum RSS. The independent
finite class oracle checks exact legal sets, projected successors, resources,
terminal text, resettable gates, dead/no-completion sets and witness paths.
Artifacts are `/tmp/af9-packed-phase-focused-tests-v1.log` (SHA-256
`988ed34491e1c80f767c2353ed86e8ad4740aa38d80465037af50b6a9beaf907`)
and `/tmp/af9-packed-phase-test-provenance-v1.json` (SHA-256
`4e01bfe7619502b6cebd1bd96fcd2aaa544fbbe769f73ecdf56eba8ae4556583`).

The four exact verifier files are:

| File | SHA-256 |
| --- | --- |
| `packed-model.ts` | `7a48c708400ebf771125c78f890a4b5f5d4627fefdf4a0e62fd48ecd1e58aeb8` |
| `packed-projection.ts` | `9ed68147c7e5b466301e9c9f405094beca18ae477004958b2c1c9367c85aa807` |
| `packed-phase-projection.ts` | `95fafad506d03ab3217678fe0d31a3f0902c205601234e842e6a269c3284b1ec` |
| `packed-reachability.ts` | `935346707bf5d0cd4d31d3919a7311cd5de7b4a4252697a86a2ea0d5fca2d8c6` |

## Complete historical comparison and trusted replay

Detached `/tmp/af9-packed-phase-historical-139e48` has only those four modules
over historical `139e48a`, with its own locked dependencies and a successful
build. All non-verifier files match the separate clean trusted historical
checkout. Source preparation is
`/tmp/af9-packed-phase-historical-source-preparation-v1.json`, SHA-256
`a4ca43d7fb3c0574a17e1ed277c08ac5b4c0d7142fd741cd9d6aca44eaeafdea`.

The reviewed comparison harness
`/tmp/af9-compare-packed-phase-historical-v3.mts` independently derives phase
closures from authored content, maps every complete static representative into
the new classes, compares every member's text, resources, legal choices,
fault/transition results and completion classification, and checks every
static and phase edge. Root added the known historical completion counts and
all-edge accounting to the worker's V2; V1's earlier retention contract is
preserved unchanged. No earlier harness variant was launched.

| Complete graph | Classes | Transitions | Completable classes |
| --- | ---: | ---: | ---: |
| Historical static reference | 169,922 | 332,402 | 134,108 |
| Historical permanent-phase quotient | 156,103 | 298,433 | 120,289 |

Both graphs have zero dead ends, no-completion states and unreachable content.
All 169,922 static members and 332,402 original transitions are compared;
509,766 classification checks agree. The phase run records 142,331 collisions,
77,975 nonidentical congruence checks and 260,272 choice-pair comparisons.
The whole comparison takes 53.35 seconds / 1,781,524 KiB maximum RSS, including
both graphs and the independent oracle. This is not the phase traversal's
standalone runtime. Its 250,000-state / one-million-edge limits are per graph;
the wrapper uses a 1,536 MiB heap and external TERM at 150 seconds, KILL after
five. Exit is zero and PID 1291527 is absent.

The complete comparison is
`/tmp/af9-packed-phase-historical-comparison-v1.json`, SHA-256
`d73532b097bba3e1d9327168a4fac774c2e53b0ee6fd534a1b6d4e8a4d9db6a5`.
Its `.manifest.json`, `.finalization.json` and `.log` share that prefix.
Finalization SHA-256 is
`d5265b6191eb7fc92e46ca2c2de9b878709bba15a979a86d732947684e46ed72`;
all source, script, artifact and process checks pass.

The separate witness profiler and runner are
`/tmp/af9-packed-phase-historical-{profile,runner}-v2.mjs`. The independent
projection descriptor is `/tmp/af9-packed-phase-historical-projection-v2.json`.
Manifest `/tmp/af9-packed-phase-historical-manifest-v1.json` has SHA-256
`8e653311c677dc1e3c27f9ce380048bf26e702d673ed43b1c698d0beeb679cfb`.
It binds the complete comparison, full 544-bit layout and corrected phase
descriptor. Limits remain two million states, eight million edges, 1,536 MiB
heap, 120-second checked time and external TERM at 150 seconds plus five.

Report `/tmp/af9-packed-phase-historical-139e48.json` completes with the same
phase counts and all 190 scene/choice/terminal witness paths. It performs
2,255 state/legal/save/hash/observation checks, 13,896 transition checks,
68 receipt checks and all 190 full engine replays. External runtime is
2.50 seconds / 216,012 KiB maximum RSS, exit zero, absent PID 1292304.

The separate checker `/tmp/af9-check-packed-phase-historical-v2.mts` imports
only the clean trusted historical engine, binds the complete graph comparison
and replays all 190 witnesses again. It passes in 0.52 seconds / 111,128 KiB
maximum RSS. Output
`/tmp/af9-packed-phase-historical-independent-check-v1.json` has SHA-256
`7544e01c8c13b62e64c112672e492bb1a20fb91c4841ab4a3a2cc4b11093ecca`.
Root acceptance and current artifact/process checks are recorded in
`/tmp/af9-packed-phase-historical-root-check-v1.json`, SHA-256
`33f6d6e5a7c688308f8352b172fe801ec2f99eabea6ee7517e2496422b092758`.
These establish historical control semantics plus metadata correctness on
the replayed paths, not universal full-history equivalence.

## Current campaign remains incomplete

The new current probe is `/tmp/af9-packed-phase-current-7428b75`. It reuses
the separate clean trusted `/tmp/af9-packed-static-trusted-current-7428b75`
checkout. Both source roles are at `7428b75`; all 12 engine/content files match
the tested manager and current main, with game source `2f6212d` and build
`af9-dce7b1dc57b6d6febcc9bb72`. Only the four frozen verifier files are added
to the probe. Its full layout remains 605 bits, 29 scenes, ten resources,
62 flags, 166 choices and 36 terminal-choice IDs.

Source preparation and independently derived projection are
`/tmp/af9-packed-phase-current-source-preparation-v1.json` and
`/tmp/af9-packed-phase-current-projection-v1.json`. Manifest
`/tmp/af9-packed-phase-current-manifest-v1.json` has SHA-256
`1b9903d5deb3b09fcd94f24ef05645be59e0f083b2cd0b98fd1bd533fa3cf709`.
It reuses the exact successful historical V2 profile/runner and the same
two-million-state configuration, with current source/layout/projection bindings.

The run fails the state cap in 21.32 seconds / 1,195,016 KiB maximum RSS.
Last sampled progress is forward depth 21: 1,228,800 visited, 1,996,917
discovered and 3,632,738 transitions at 21,039 ms. These samples precede the
actual two-million-state failure. No backward completion analysis or witness
replay completes. Source/artifact provenance matches; exit is one, signal
null and PID 1293479 is absent. Report, progress, finalization and log use
the `/tmp/af9-packed-phase-current-7428b75` prefix. Root check
`/tmp/af9-packed-phase-current-root-check-v1.json` has SHA-256
`dc5e1724ab5a3874de4a5a082c49e69a989977441919f405440010791c9dbc52`.
The independent current checker remains preparation only:
`/tmp/af9-check-packed-phase-current-v1.mts`, SHA-256
`284603b554a53f3af123e66b4b782d563fa4159db825929a25f2bce00a4dd23b`.
Typecheck/help pass. It requires complete output before importing the trusted
engine and is prepared to replay all 231 current witness IDs; it was not run.

No further capacity increase is selected. Read-only reviews are considering
an exact backward symbolic property proof: first derive states with a completed
route, then all predecessors of a playing state without such a route or of an
arithmetic/bound-exit failure. Excluding the initial state from that bad set
could prove safety/completion without enumerating every reachable state.
Resource-bound exits must remain failures; all authored reachability still
requires actual current-engine witnesses. This is a proposal under review,
with no new implementation or campaign run. Full current verification, fresh
players, publication, final scope acceptance and cleanup remain unfinished.
