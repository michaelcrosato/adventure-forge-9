# Exact symbolic reachability — isolated experiment

Status: selected for a bounded experiment, not adopted as a release audit.
The existing family audit and its 250,000 guard remain unchanged. The local
flag-pruning prototype was rejected; its failure remains in
`LOCAL_FLAG_STABILITY_AUDIT.md`. Exact prefix partitioning is being measured
independently as another alternative.

## Basis and limits

Ordered, reduced binary decision diagrams can represent exact Boolean sets
and operations without enumerating every assignment. Their worst-case size
is still exponential, and variable order matters; a tiny result does not
predict campaign performance. See [Bryant's primary paper](https://www.cs.cmu.edu/~wklieber/15817-f08/ieeetc86.pdf).
Representing a transition relation and computing forward/backward fixed
points is the relevant established technique; see the [CMU symbolic model
checking lecture](https://www.cs.cmu.edu/afs/cs.cmu.edu/academic/class/15414-f06/www/lectures/newlecture6.pdf).
Its suitability for this game is an inference to test, not a result supplied
by either source.

A temporary table-built fixture found five reachable states under two
variable orders and detected deliberately invalid arithmetic. It did not
compile the actual content DSL or establish production correctness. Preserve
`/tmp/af9-bdd-feasibility.mjs` and its diagnostic output. The next experiment
must use a real DSL compiler and independent exhaustive oracle, not merely
encode a transition table previously obtained by enumeration.

## Exact modeled fields

Model the current scene, lifecycle status, terminal receipt identity, every
authored flag and every resource. Absent flags normalize to false using
own-property semantics. No independent marginal ranges may invent a joint
resource/flag combination. Facts, journal, full history, revision and save
hashes remain outside the symbolic set, with explicit limitations. Real
paths must reconstruct them through the actual engine and verify replay.

For the first bounded compiler experiment, each resource has a declared
finite domain. A reachable transition leaving that domain fails the run as
an insufficient model bound; it must not be discarded, wrapped or clamped.
An arithmetic underflow or unsafe integer is separately an engine-semantic
error. Every intermediate effect is checked even if a later assignment
would reset the balance. Only declared clock advancement uses saturation.
Initial resources and explicit assignments must also be covered.

The manager's naïve once-writer inventory does not prove the campaign's
bounds: ten positive writers remain unproved by that simple check. Preserve
`/tmp/af9-resource-bound-inventory.{mts,json}`. A guessed small bound is not
evidence. A complete exact forward fixed point with no reachable bound exit
could establish coverage of that finite domain, subject to compiler
correspondence; the experiment must fail until that is actually shown.

## Transition semantics and correspondence

Compile one relation per authored choice. It requires playing status, the
choice's source scene and all pre-state conditions. Apply effects in order,
including effects after `goTo`; the final `goTo` determines the scene. Apply
all effects before a terminal outcome. Unwritten fields remain equal to
their pre-state values. Preserve actual receipt status/summary and each
terminal choice's separate witness even when two summaries coincide.

The closed vocabulary has independent flag and integer predicates, constant
flag assignments, constant resource assignments/additions, bounded clocks,
facts and navigation. Correspondence needs a structural argument over these
operations and their ordered composition, plus independent checks against
production semantics. Exhaustively comparing primitive predicates and unary
resource-effect folds over the complete finite input domains is a possible
compositional check. Miniature examples alone cannot prove the full compiler.
Unknown vocabulary, invalid content or unsupported bounds fail before use.
No mutable alternate-scenario engine or weaker save authority is introduced.

## Fixed points and witnesses

Forward reachability starts only from the exact initial modeled state.
Repeated image/union operations must reach equality before reporting an
exhaustive result. Keep graph-node, operation and time bounds explicit; a
limit failure is an incomplete experiment, never a successful approximation.

Backward reachability starts only from completed modeled states. Require
every reachable **playing** state to have a completed continuation. Departed
and dead terminal states are allowed outcomes and do not seed completion;
they must not be incorrectly required to continue. Global End remains a
separate operation with existing tests, as in the current authored audit.

Check authored scene/choice reachability, playing dead ends and every terminal
choice. Extract paths using the symbolic frontiers and choice relations,
then execute each path through actual `start`/`choose` with legal revisions.
Compare modeled successors, terminal receipts, save/restore and state hashes.
Do not manufacture a game state by decoding an arbitrary satisfying tuple.

## First implementation boundary

Use an isolated checkout and opt-in verification modules. A small TypeScript
ROBDD module owns canonical ordered nodes, Boolean operations, existential
quantification, simultaneous variable substitution, satisfying assignments,
exact selected-variable counting and explicit resource limits. Independent
tests cover truth tables, quantifier/substitution semantics, counts beyond
32 bits and failing limits.

The compiler experiment covers every condition/effect kind, resettable flags,
multiple ordered writes, clocks, endings and an intentional bound exit.
Compare full forward and backward sets with an independent finite oracle
on small validated scenarios; use the existing isolated real-engine harness
for replay. Test at least interleaved current/next and blocked orders, with
recorded source and node counts. No campaign-scale or release claim follows
until historical comparison, full current traversal, semantic correspondence
and every existing mechanical/rendered/evidence gate pass.
