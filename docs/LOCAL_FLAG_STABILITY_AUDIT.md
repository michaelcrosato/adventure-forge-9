# Local flag stability — prospective audit refinement

Status: design, independent proof review and isolated size-only prototype.
Not adopted. The full game goal, current rules and 250,000-family release
guard remain unchanged. This contract precedes a release implementation.

## Measured problem

The Stage 8 full audit at `c64c47c` exceeded 250,000 families. A separate
exact-key diagnostic reached its 500,000 bound after visiting 287,397 families
and 908,913 transitions, without finishing. Most visited families were in
the freely interleaved Archive/Reedway scenes. See
`STAGE8_PARALLEL_CAMPAIGN.md` for source identities, retained failures,
artifacts and the distinction between diagnostics and full verification.

The existing analyzer permanently excludes a false-gated choice only when
its flag is already true and no authored effect anywhere writes it false.
That is sound but can retain an impossible positive gate when its true
writer is in an earlier area that cannot be revisited. It also retains a
resettable flag's branch when the only opposite writer is outside every
possible continuation from the current scene.

## Candidate rule

Begin with a conservative scene/choice closure that includes every possible
continuation from the current state. For each flag used by a choice condition,
inspect every potentially reachable effect in that closure. If none writes
the opposite of the flag's current value, that value is stable throughout
the closure. A choice requiring the opposite value can then be removed.

Recompute the reachable closure and its possible writers after proven
removals, repeating until no more choices can be removed. Each round uses
the preceding sound overapproximation. A choice must not be removed first
in order to claim that its own opposite write is unreachable. Mutual or
self-enabling cycles receive no speculative reachability conclusion.

The current vocabulary writes only constant boolean flag values. Unknown
conditions and effects must be rejected before any pruning, including in
branches the candidate would remove. No resource threshold, interval,
arithmetic abstraction or guessed entry valuation is introduced.

## Proof obligations

1. Each retained closure overapproximates every actual future transition.
   Prove each elimination using an already established closure, and retain
   enough information to explain all earlier elimination rounds.
2. Keep each pruning cause's name and exact current boolean value. The
   current active flag bindings may carry those values if the existing API
   can express the proof without ambiguity. A list that assumes every
   pruning value is true is insufficient for the new false-value case.
3. Derive active fields from the proven closure plus necessary pruning
   causes. Preserve joint concrete active values and every exact resource
   balance. Text-only conserved parameters keep their own exact bindings.
4. Recomputing after an actual legal transition must not activate a discarded
   field or change an incoming conserved binding. Keep the existing runtime
   handoff checks. Do not omit earlier proof causes merely because their
   associated scene is absent from the final reduced closure.
5. Cache results using all current values that can affect the new analysis.
   The old cache's globally monotone false-gate mask is insufficient.
   Normalize missing flags according to actual engine semantics and retain
   immutable validated source snapshots and immutable cached results.
6. Family collisions must still compare independently derived closures,
   active cores, parameter declarations, exact residual text templates,
   legal choices and successors. Newly conserved values must agree where
   required; existing parameter bindings remain separately exact.
7. Completion still starts only from completed families, not departures,
   deaths or global End. Every witness must originate from an actual engine
   start and replay exactly. Existing metadata/long-revision coverage limits
   in `CONSERVED_PARAMETER_AUDIT.md` remain explicit.

## Decision and verification

First review the prototype and adversarial proof cases, then measure whether
the candidate actually reduces the observed workload. A capped or size-only
run cannot grant release acceptance. If the rule is unsound or insufficient,
retain the evidence and choose further work based on that result.

Before adoption, independently test local false and true stability, late
writers, mutually enabling and self-dependent writers, multi-round pruning,
cache separation, absent/false semantics, earlier pruning causes, resettable
flags, clock/resource conservation and unsupported vocabulary behind a gate.
Use the existing isolated real-engine harness for transition, collision and
completion obligations rather than a second invented game interpreter.

Compare the candidate with the prior audit on tractable historical content
and adversarial fixtures. Preserve their actual reachable choices, endings,
completion results and real replayable witnesses. Any witness-path difference
needs inspection; equal counts alone are not proof. Then run the full current
campaign with safety, collision, successor, witness and reverse-completion
checks at the existing release guard. Full `npm run verify`, final rendered
checks and a separate clean source freeze remain prerequisites for the
predeclared fresh Stage 8 players.
