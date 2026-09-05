# Conserved-parameter audit contract

Status: implemented as an opt-in method, still awaiting full Reedway
acceptance. The release audit still retains every concrete resource balance,
and Reedway has not passed its complete mechanical or live gates. This document narrows the method
to immutable parameters; it does not authorize interval widening, guessed
entry states, symbolic arithmetic for mutable resources, or sampled routes.

## Representation

For a current state, derive a conservative transitive scene/choice closure.
Exclude only choices requiring false for a globally never-false-written flag
that is already true. Keep all such pruning justifiers. Inspect unknown
vocabulary before pruning so an unreachable branch cannot hide unsupported
behavior.

The active core contains the current scene/status/ending identity and the
joint concrete values of:

- every resource read by a potentially reachable choice condition;
- every resource potentially written by a reachable effect, including a
  declared clock's resource;
- every flag read by such a choice, potentially written, or used to justify
  permanent pruning.

Globally unread flag markers are an explicit exception to the writer rule:
if no authored choice or scene-text condition reads a flag anywhere in the
validated scenario, its value remains representative metadata. Current
effects only assign constant flag values; no effect reads a flag. Such a
marker cannot affect a future legal action, effect, text or ending identity.
It is omitted entirely, not labeled a conserved parameter, and the actual
engine still records its writes. This rule does not discard a writer with a
late reader or a read behind a currently closed gate. Unknown vocabulary is
checked before this classification. Source `e9d93d4` adds this refinement.

Every remaining resource is an immutable parameter, retaining its exact
current integer value as a binding. Future text-read flags outside the active
core are likewise immutable parameters. Their values can affect displayed
resources or text, but cannot affect a future legal choice or effect. Other
facts/history/flags retain the existing audit's explicitly documented
representative limits. No full-observation or arbitrary-length revision
overflow proof is claimed.

Two states can share a core only when their active field names, joint active
values, and parameter declarations agree. Their parameter bindings may
differ. A family denotes behavior for every such conserved binding; it is
not a claim that every possible binding is reachable. Each stored family
must have a real reachable engine representative, and every authored-choice
witness must replay from the actual campaign start. No synthetic resource
valuation may create a witness.

## Required proof and runtime checks

1. **Independence.** Every potentially reachable choice condition and effect
   is covered by the active core. Therefore equal cores have the same legal
   choices and active successors, regardless of parameter bindings. The
   closure cannot reopen a discarded branch: its monotone justifier remains
   true and remains in the key.
2. **Conservation.** Every legal transition must preserve the exact binding
   of each incoming parameter. A parameter cannot become active later. When
   an active field becomes a parameter, bind its actual successor value;
   never substitute a threshold bucket or an independent marginal range.
3. **Rendered text.** Partially evaluate conditional text using concrete core
   values and retain conditions on parameters as exact predicates. Compare
   both collision states' symbolic text templates and verify that
   substituting each state's own bindings reproduces its observed text.
   Displayed resources are the exact union of concrete active values and
   conserved bindings.
4. **Successors.** For every collision, compare legal choices, active
   successor cores, new parameter declarations, and newly bound values.
   Existing parameters retain their respective original bindings. Check
   both states independently; one representative's read set must not be
   imposed on the other.
5. **Completion.** Reverse traversal starts only at completed families.
   Since legal choices and active successors are independent of bindings,
   a valid completion path for a core is valid for every represented binding.
   Departed/dead states and the separate global end operation do not count
   as completed resolutions.
6. **Concrete evidence.** Preserve input immutability, resource safety,
   revision increment, terminal receipt checks and real replayable witnesses
   on the engine representatives and visited candidates. Keep the existing
   facts/journal/revision metadata coverage limits explicit. Unknown
   vocabulary or a violated conservation claim fails the audit.

## Adversarial acceptance

The preparatory analysis needs late-branch resource reads/writes, clock
writes, resettable gates, false-first phase changes, and unsupported
conditions/effects hidden behind a closed gate. Parameter tests must show
that two different exact displayed balances can share behavior while each
display remains correct, and that changing a parameter during a transition
is rejected.

Keep active correlations intact: if one reachable entry has supplies=0 and
seal=false while another has supplies=1 and seal=true, a later choice
requiring supplies>=1 and seal=false must remain unreachable. Both fields
are future choice reads, so both remain jointly concrete; independent
marginals cannot fabricate the missing combination.

Before adoption, compare actual choice/ending witnesses and universal
completion results against existing finite exact audits on tractable
snapshots, then run the entire current authored campaign. Report family
counts separately from concrete-state counts. Only a complete validated run
can satisfy the mechanical gate; this design and its component tests cannot.

## Preparatory components

`12a4ae2` adds the independent future-influence analysis; `8ada86d` adds
exact parameter bindings, frame checks, partial text evaluation and binding
substitution, with manager hardening and integration tests. Neither changes
the active audit's resource key. The resolved shared-water shore state has
seven active resources and three conserved ones: Archive Evidence, Evacuees
and Tide. Eight historical flags are conserved text parameters. This is a
measurement of one current future closure, not a claim that those fields
are constant throughout the campaign or that the new audit already scales.

Eleven component tests pass, including actual changed-hub text substitution,
late resource and clock writes, resettable gates, unsupported behavior behind
a closed branch, different exact displayed balances, and rejection of changed
or missing bindings. Build and all 96 non-audit tests pass on `8ada86d`.
Artifacts: `/tmp/af9-conservation-components.log` and
`/tmp/af9-conservation-nonaudit-tests.log`.

## Implemented traversal and validation

`9a02591` integrates a compiled analyzer over a detached, frozen content
snapshot with a scene/status/monotone-gate cache and immutable results.
`339b45a` adds `auditScenarioFamilies()` in `src/engine/family-audit.ts` as an
opt-in traversal; `d351b52` adds five isolated real-engine adversarial tests.
Each visited transition checks exact parameter frames, shrinking active
field sets, resource safety and input/revision invariants. Collisions compare
both independently derived cores, schemas, text templates, legal choices and
successors, including newly conserved bindings. Every choice witness replays
from `start(1)` and matches the full recorded state hash. Ending witnesses
are recorded before terminal merging, preserving distinct authored actions
even if their ending identity is identical.

Independent review found no current-vocabulary soundness blocker. The tests
compare both methods on small validated scenarios using isolated copies of
the actual engine, with different exact display bindings, correlated active
fields, resettable gates, clock writes, no-completion cycles and merged
terminal actions. The original five tests pass in manager integration;
the refined influence/projection/family suite also passes (22 tests).

An independent historical comparison of `339b45a`'s method against the
published Blackglass content at `139e48a` completed with both 250,000 guards:

| Measure | Existing audit | Family audit |
| --- | ---: | ---: |
| Canonical states / parameter families | 169,922 states | 33,004 families |
| Transitions | 332,402 | 94,556 |
| Reachable scenes / choices / endings | 25 / 131 / 34 | 25 / 131 / 34 |
| Dead ends / no-completion results | 0 / 0 | 0 / 0 |
| Wall time | 32.47 s | 29.40 s |
| Maximum RSS | 818,072 KiB | 259,408 KiB |

All 131 choice and 34 ending witnesses from each method replayed; pairwise
final hashes match. Historical engine/content were untouched. Verification
modules were copied under `src/verification/`; manager inspection proved
only engine import paths changed from `339b45a`. The original result export
and checksums are in `/tmp/af9-family-crosscheck-results-go-20260904/`, with
`VERIFIER_SOURCE.json` and `verification-source/` preserving the exact proof
code independently of the unchanged historical game build identity. This
comparison predates the globally unread marker refinement.

The first complete-check Reedway attempt still exceeded 250,000 families:
4:55.67, 1,051,244 KiB maximum RSS, on `339b45a`'s method. Preserve
`/tmp/af9-family-audit-first.log` and its source checksum file. A separate
size-only probe finished at 260,622 families and 756,568 transitions in
17.47 seconds, using 1,068,264 KiB. It deliberately omitted safety,
congruence, witness replay and reverse completion and therefore cannot
approve a release. Its script/result/log are
`/tmp/af9-family-size-profile.{mts,json,log}`. Full current validation remains
required. The release audit and its original state guard are unchanged.

After the globally unread marker refinement, the separate size-only probe
finishes at 243,426 families / 703,812 transitions, within 250,000 families
(15.80 s, 993,940 KiB maximum RSS). Preserve
`/tmp/af9-family-size-profile-refined.{mts,json,log}`. This is still only a
workload measurement; it does not satisfy the full mechanical gate.

The independent historical comparison was repeated with `e9d93d4` in a new
checkout and export, preserving the first results. The refined method uses
27,304 families / 76,920 transitions (22.96 s, 234,000 KiB), with the same
25 scenes, 131 choices, 34 endings and empty dead-end/no-completion results.
Every paired witness hash and final projection matches the old audit. The
old result is reused byte-for-byte on the unchanged historical engine.
`/tmp/af9-family-crosscheck-results-refined-20260904/` includes code hashes,
import-only copy diffs, full results, replay checks and verified checksums.
