# Conserved-parameter audit contract

Status: prospective implementation contract. The current audit still retains
every concrete resource balance, and Reedway has not passed its complete
mechanical or live acceptance gates. This document narrows the next method
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

The next steps are a compiled analysis with a detached immutable scenario
snapshot and safe phase cache, independent semantic review, and an explicit
family-audit implementation. That implementation must replay actual
authored-choice witnesses and compare completed results against tractable
earlier exact audits before it replaces a release check. The existing
250,000 concrete-state guard is unchanged, and full Reedway acceptance
remains pending.
