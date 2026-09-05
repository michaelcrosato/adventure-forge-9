# Exact symbolic reachability — isolated experiment

Status: selected for a bounded experiment, not adopted as a release audit.
The existing family audit and its 250,000 guard remain unchanged. The local
flag-pruning prototype was rejected; its failure remains in
`LOCAL_FLAG_STABILITY_AUDIT.md`. Coarse exact prefix partitions also hit their
100,000-family diagnostic limits; the evidence is retained below.

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
including effects after `goTo`. Validation permits exactly one `goTo` in a
non-terminal choice and none in a terminal choice; the experiment must retain
those restrictions. Apply all effects before a terminal outcome. Unwritten fields remain equal to
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

## Prefix partition alternative

The independent read-only probe on `c64c47c` found 1,363 pre-outcome playing
states, 1,448 real first-water-outcome cut states and 1,984 earlier terminal
states. Every suffix root was reached through the real engine. Three initial
background/origin cones and three finer sets of water-outcome roots all hit
their 100,000-family diagnostic guard. The probes took 4.58–6.70 seconds and
approximately 461–478 MiB maximum RSS; they omitted congruence, safety,
completion and witness checks and are not release audits. Hitting 100,000
does not itself prove that a shard exceeds the 250,000 release guard.

One sampled frontier per label can be smaller, but that suggests up to 1,448
duplicated suffix traversals, without evidence that every root fits. Although
the background/origin/outcome path labels are disjoint, the existing family
projection can merge concrete states from different labels once their old
flags become irrelevant. A correct partition would therefore need complete
real prefixes, all earlier terminal edges, shared family ownership and
cross-partition completion checks; summing independent family counts is
invalid. This coarse split is not selected for implementation. Preserve
`/tmp/af9-prefix-partition-review-c64c47c.md` and its referenced original
scripts, results and timing files.

## Compiler correspondence obligations

The isolated implementation validates and snapshots its input with the same
closed content validator as the engine. Every resource and authored flag,
including unread markers, receives its own exact field. Valid bit patterns
encode finite resource bounds, real scene IDs, and status/receipt pairs.
Playing status requires receipt zero; each terminal receipt retains its real
status and summary. Unused bit patterns are excluded.

Each choice predicate is the conjunction of its source scene, playing
status, and pre-state conditions. Each integer predicate is enumerated over
the whole declared unary domain; flag predicates read exact Boolean fields.
For a successful choice, effects on distinct resources commute because the
validated vocabulary has no cross-resource expressions or conditional
effects. Each resource's ordered table therefore determines its unique
output independently, while the relation conjoins all fields and keeps the
original joint state. Constant flag writes preserve their last value;
untouched fields are framed by equality. Navigation and outcome fields are
fixed to the validated choice's result. Facts affect metadata only and do
not participate in conditions.

Every unary table checks each intermediate value. Failure predicates retain
the original cross-resource effect index and are gated by the absence of an
earlier failure, so a later arithmetic problem cannot replace an earlier
insufficient-bound diagnosis. Negative or unsafe arithmetic is an error;
ordinary resources are never saturated. Clock advances use the guarded
declared saturation formula. Validation already rules out many underflows;
the compiler must not bypass it to manufacture such fixtures.

These are review obligations for the implementation, not a declaration that
it has been proved correct. Independent complete small-state comparisons
and real-engine successor/replay checks are required. They cannot by
themselves establish campaign-wide correspondence or world-scale capacity.
History, revision, facts, journal and hashes are reconstructed only along
real witnesses at seed 1, with the actual engine's build identity. Seed and
build identity are also absent from the symbolic tuple. The current guard
and effect vocabulary does not read the seed, but these checks do not claim
all-seed hash equivalence or equivalence of all possible history lengths.

## First implemented experiment and retained limit

The experimental branch `audit-symbolic-manager` at `dcbce08` is clean in
`/tmp/af9-symbolic-manager`. Its three opt-in verification modules and tests
have not been integrated into main. It retains every modeled flag/resource
and uses a fixed seed only for actual-engine witness replay. The compiler
defaults to 250,000 non-terminal BDD nodes and 100,000 operation-cache entries;
these are different units from the unchanged 250,000-family release guard.
Supported unary domains are deliberately finite (default maximum 256 values,
configurable up to 4,096), and clocks must use their exact declared maximum.

Build and all 14 focused experimental checks pass. Independent finite
interpreters compare complete reachable, completable, playing-dead-end and
playing-no-completion sets, distance frontiers, full valid domains,
per-choice images/preimages and authored witness sets under interleaved and
blocked variable orders. Fixtures include resettable flags, repeated
same-field writes after navigation, clocks, correlated state, distinct
terminal choices sharing a receipt, and arithmetic/bound failures followed
by resets. The actual engine is copied into isolated fixture processes;
scene/choice/terminal paths verify legal actions, every chosen successor,
facts, complete state/observation replay, save restoration and receipt/hash
parity. Invented unreachable labels and a mismatched fixed scenario fail
the witness adapter. Expected dead ends in a negative fixture remain
reportable rather than being rejected as malformed witnesses.

The corrected focused run took 3.16 seconds and 181,496 KiB maximum RSS.
Preserve `/tmp/af9-symbolic-corrected-tests.log` and
`/tmp/af9-symbolic-corrected-test-provenance.json`, which records the clean
commit and exact module/test/log hashes. The earlier 13-test run is retained
at `/tmp/af9-symbolic-first-tests.log`; its weaker receipt expectations were
corrected before accepting this step. These small checks do not establish
historical or current campaign coverage.

The first larger diagnostic copied only the three experimental verification
modules into a separate checkout of published `139e48a`, preserving its
original engine and content. With interleaved order, the conjectured bounds
from `/tmp/af9-symbolic-historical-candidate-bounds.json`, 250,000 BDD nodes,
100,000 cache entries, 128 rounds, a 45-second checked elapsed limit and a
60-second external timeout, it failed the node guard **during construction**.
No forward round ran. Wall time was 3.21 seconds and maximum RSS was
187,928 KiB; this does not establish resource bounds or reachable coverage.
Preserve `/tmp/af9-symbolic-historical-250k-interleaved.{json,log}`. The JSON
records every engine/content/verification file hash and source hash
`dce48031c953a0c5f54a110f28d8a5c11f3db8f1c1326ec76b9654d436df45d8`.
The profiler is `/tmp/af9-symbolic-profile.mjs`; its complete flag remains
false on a limit, and it never acts as the release audit.

The next bounded experiment changes only conjunction order: build output
and frame constraints before conjoining the pre-state enabled predicate.
Boolean associativity preserves the relation, but smaller construction cost
must be measured under the same limits and bounds. No field, condition,
effect, failure check or existing release gate is removed. The original
failed checkout remains separate.
