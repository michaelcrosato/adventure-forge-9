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

On the Stage 5 source plus the subsequent Archive path repair, the default
audit produced:

| Measure | Result |
| --- | ---: |
| Canonical future-relevant states | 93,491 |
| Legal transitions checked | 149,690 |
| Merged successor visits checked | 56,200 |
| Congruent successor comparisons | 159,315 |
| Authored scenes / choices | 18 / 91 |
| Unreachable scenes / choices | 0 / 0 |
| Dead ends / no-completion states | 0 / 0 |
| Retained flags at the initial scene | 40 |
| Maximum legal choices | 8 |
| Representative projection word maximum | 391 |
| Wall time (`npx tsx -e ... auditScenario()`) | about 18 seconds |

The archived full traversal for the original Stage 5 source is recorded as
713,703 states with 168 no-completion states at `d1cd95c`; the older `2179a18` source is
recorded as 727,927 states with zero no-completion states. This branch did not
rerun either old implementation and includes the later Archive repair commit,
so these are raw historical/current measurements rather than an apples-to-
apples percentage reduction. The CI limit is 100,000 canonical states because
the reduction is substantive and the measured result fits under that bound;
the limit remains a failure if future content exceeds it.

`tests/audit-scaling.test.ts` uses a miniature graph to prove that a flag read
only in a late branch is retained from its predecessor while a flag read only
in a past scene is dropped after leaving that scene. It also checks resource,
status, ending, and absent/false-flag distinctions. The existing scenario audit
test remains responsible for the full production reachability, transition,
dead-end, and completion assertions.
