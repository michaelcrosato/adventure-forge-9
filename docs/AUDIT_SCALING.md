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
