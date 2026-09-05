# Scalable exhaustive audit

`src/engine/audit.ts` still traverses every legal choice, checks input
immutability and revision progress, rejects invalid resource balances, checks
terminal receipts, records scene and choice witnesses, and computes the
backwards completion set. It changes only the state identity used by the
traversal.

For each possible current scene, the audit first follows every authored
`goTo` effect, including effects on conditionally available choices. This
static closure is an overapproximation of future scenes. It then retains every
flag read by a choice condition or a conditional scene-text line in that
closure. The key also retains the current scene, every resource balance,
status, and terminal kind/summary. A flag absent from the state is normalized to
`false`, matching the engine's condition semantics.

The key is sound for this engine's closed vocabulary. Conditions read only
flags and resources, and effects write only scene, flags, resources, and
facts. If two states have the same key, their legal choice IDs, conditional
scene text, and every reduced successor key are the same. Every successor's
retained flags are a subset of its predecessor's static future read set, so
an omitted flag cannot later change legality or conditional text. Facts
and history affect the public facts/journal projection but do not gate an
action or change an effect. The audit keeps one engine state as a
representative for those fields and checks every collision's relevant text,
choice projection, and successor keys at runtime.

The word metric is explicitly `projectionWordsExhaustive: false`: it counts
scene text, facts, and choices on canonical representatives and does not claim
the maximum over every fact-list or journal variant. The reduced key also does
not preserve history, receipt hash, or revision metadata; canonical terminal
representatives still pass the existing receipt hash check. A future content
or engine vocabulary that reads facts, history, seed, receipt metadata, or a
new state field must extend the key and its read analysis before this audit is
sound.

On the Stage 5 source plus the Archive path repair (`756b295`), the audit
produced 93,491 canonical states and 149,690 transitions. Distinguishing
document omission from personal protection (`bf6c7f1`) produced 95,213 states
and 150,838 transitions. The final hearing repair (`dbabc94`) removes an
obsolete one-time navigation guard and yields the following current measurements:

| Measure | Result |
| --- | ---: |
| Canonical future-relevant states | 76,117 |
| Legal transitions checked | 129,874 |
| Merged successor visits checked | 53,758 |
| Congruent successor comparisons | 159,487 |
| Authored scenes / choices | 18 / 91 |
| Unreachable scenes / choices | 0 / 0 |
| Dead ends / no-completion states | 0 / 0 |
| Maximum legal choices | 8 |
| Representative projection word maximum | 412 |
| Audit test wall time in manager verification | 14.97 seconds |

The archived full traversal for the original Stage 5 source is recorded as
713,703 states with 168 no-completion states at `d1cd95c`; the older `2179a18` source is
recorded as 727,927 states with zero no-completion states. This branch did not
rerun either old implementation and includes the later Archive repair commit,
so these are raw historical/current measurements rather than an apples-to-
apples percentage reduction. The Stage 5 CI limit was 100,000 canonical states because
the reduction is substantive and the measured result fits under that bound;
that snapshot fit within the measured workload budget. Blackglass exceeded it;
the failure and explicit later adjustment are recorded below.

`tests/audit-scaling.test.ts` uses a miniature graph to prove that a flag read
only in a late branch is retained from its predecessor while a flag read only
in a past scene is dropped after leaving that scene. It also checks resource,
status, ending, and absent/false-flag distinctions. The existing scenario audit
test remains responsible for the full production reachability, transition,
dead-end, and completion assertions.

## Blackglass terminal projection

The seven-scene expansion initially measured 221,614 states and 332,382
transitions. The old 100,000 workload ceiling failed, without claiming full
coverage. Independent larger diagnostics found all 25 scenes and 130 choices
reachable and no unfinished state without a completed path. Overwrite-aware
backward flag liveness produced no reduction.

After a journey ends, legal choices and future actions are absent. Terminal
keys therefore retain only flags read by the current scene's conditional
text, along with every exact resource balance, scene, status and ending
kind/summary. Playing keys keep the previous conservative future closure.
Every collision still checks relevant text, choices and successor keys;
successor keys use their own scene/status read sets. Facts, history and
receipt metadata retain their previously documented representative limits.

The reduction yields 169,922 states, 332,382 transitions, 162,461 merges and
297,171 congruent successor checks. A manager run passes all 69 checks in
30.8 seconds, with no unreachable content, dead ends or missing completion
paths. The representative projection maximum is 414 words. Tests distinguish
terminal text flags, resources and ending identity, preserve playing choice
flags, and confirm an intentionally low workload limit fails explicitly.

The manager explicitly raised the workload guard to 250,000 after those
measurements, before new live acceptance. It does not relax functional
invariants or establish world-scale capacity. See STAGE6_BLACKGLASS.md for
the failed diagnostic, comparison artifacts and final source references.

The graph enumerates authored choices. The separate exported `end()` action
has focused engine coverage but is not added to this graph's witnesses or
transition count. Full-observation equivalence is not claimed: facts, journal,
receipt revision and receipt hash remain representative metadata as above.

## Reedway phase pruning

Source `b49fb6d`, integrated as `c9655d1`, adds a state-specific conservative
closure. A flag qualifies as monotone only when every authored write sets it
to true. If it is already true, a choice requiring it to be false can never
become legal again. The closure excludes that choice, retains every true
pruning justifier, and follows every other possible destination. Resettable
flags such as Sera's hostility cannot justify this pruning. False or absent
flags retain their branches; the analysis does not speculate about later
writes.

The cache uses the current scene and the mask of monotone false-gate flags in
its original static closure. Flags outside that mask cannot affect the
resolution. Collision checks independently resolve the retained sets and
keys of both states and both successors. Every resource balance remains in
the key. Independent review found no correctness blocker; focused tests cover
resettable gates, false-first paths, different phase justifiers, irrelevant
history and unknown vocabulary. This refines the earlier static closure; it
does not establish full-observation equivalence.

Reedway still exceeds the existing 250,000-state guard. Preserved worker
measurements on `b49fb6d` are 42.87 seconds / 1,024,940 KiB maximum RSS at
250,000, and 50.95 seconds / 1,165,480 KiB at 300,000. Neither completed.
After reviewing those failures, the manager explicitly authorized one
1,000,000-state diagnostic with a 4,096 MiB Node heap ceiling. It also failed
after 3:31.15 with 3,626,260 KiB maximum RSS. Logs are
`/tmp/af9-audit-monotone-250k.log`,
`/tmp/af9-audit-monotone-300k.log` and
`/tmp/af9-audit-monotone-1m.log`. No complete result or witness map was emitted
by these attempts. The production guard remains 250,000.

## Prospective verification through conserved parameters

The million-state failure motivates a different proof representation before
further world expansion. A preparatory analysis is being implemented
separately from the active audit. It identifies every field read by a future
choice or potentially written by a future effect, using the conservative
phase closure. All such values must remain concrete. Other resources and
text-only flags may be future-constant parameters: their exact current values
would be carried unchanged through every continuation, rather than
enumerating their Cartesian product with independent new activities.

This is not yet an accepted audit mode. Before adoption it needs explicit
conservation checks, proof that parameters cannot affect choice legality or
future writes, exact conditional-text templates under parameter substitution,
adversarial tests for late reads/writes and resettable gates, and real
whole-campaign witnesses for every authored choice. Reverse completion must
hold for all represented parameter bindings, not only a convenient example.
Reported counts must distinguish parameterized families from concrete states;
the earlier resource-exact state counts cannot be relabeled as equivalent
coverage. No sampling, changed resource balances or skipped completion
obligations are authorized by this investigation.

The narrower implementation contract is in `CONSERVED_PARAMETER_AUDIT.md`.
Preparatory future-influence and text/binding/frame helpers are integrated in
`12a4ae2` and `8ada86d`, with 11 component checks and 96 passing non-audit
checks overall. No family key has replaced the concrete audit yet.

## Opt-in family traversal

`339b45a` implements the conserved-parameter traversal separately from the
release audit. `d351b52` adds isolated real-engine parity tests, and `e9d93d4`
excludes globally unread flag markers from active dimensions. Such markers
remain representative metadata; they are not falsely labeled constant.
All choice/text readers, exact resources and pruning justifiers retain their
specified classification. The refined focused suite passes 22 tests.

On the unchanged historical Blackglass engine/content, the initial family
method completes with 33,004 families / 94,556 transitions versus 169,922
resource-exact states / 332,402 transitions. All scene, choice and ending
sets, completion results and replayed witness hashes match. Current Reedway
still failed the first full family attempt at 250,000 families (4:55.67,
1,051,244 KiB). A separate size-only traversal finished at 260,622 families;
after removing globally unread flags it finishes at 243,426 families and
703,812 transitions (15.80 s, 993,940 KiB). This diagnostic skips safety,
congruence, witness replay and completion checks. It is evidence about
workload only, and does not approve the release.

See `CONSERVED_PARAMETER_AUDIT.md` for the implementation contract, exact
historical source/code provenance and preserved artifacts. The original
resource-exact release guard is unchanged. Complete verification of the
current family method remains required before adopting it for releases.

The subsequent complete refined Reedway run passes at 243,426 families /
703,812 transitions, with every one of 160 choices and 36 endings reached
and no dead ends or missing completed routes. All 160 choice witnesses replay
exactly. After that evidence, `998a214` adopts the separately reviewed cached
family method in the release test. `npm run verify` passes all 108 checks
with identical family/transition/congruence counts. The older resource-exact
method remains available; counts from the two representations are labeled
separately. See `CONSERVED_PARAMETER_AUDIT.md` for exact source, measurements,
code provenance and the full result artifacts.
