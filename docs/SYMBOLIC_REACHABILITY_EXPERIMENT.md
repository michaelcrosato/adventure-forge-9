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

## Exact construction and relational-product revisions

The clean experimental branch now reaches `e81a2c3`. All changes remain
outside main's source and the release audit. Build and all 20 focused checks
pass in 5.15 seconds / 310,660 KiB maximum RSS; preserve
`/tmp/af9-symbolic-cachekey-combined-tests.log` and its companion
`/tmp/af9-symbolic-cachekey-combined-test-provenance.json`. These are test
execution measurements, not controlled campaign-performance comparisons.

Three reviewed changes preserve the same exact relation. First, build all
output/frame constraints before conjoining the enabled predicate. Second,
conjoin those fields in reverse declaration order so immutable BDD suffixes
can be shared during construction. Every field remains required, including
a legitimate false handle of zero; the new zero-relation fixture proves an
enabled, wholly out-of-bound resource update cannot lose its constraint.
Third, `andExists` computes conjunction and existential quantification in
one Shannon recursion. Quantified levels combine the low and high results
with OR; other levels rebuild the ordered node. Image and preimage use this
exact operation. No resources, flags, guards, effects or failure predicates
are omitted.

The quantifier cache retains the full normalized immutable set throughout
each call. Descendants of a node cannot contain that node's variable under
the fixed ROBDD order, so retaining already-visited variables has no effect
on the Boolean result. Full-set keys distinguish different operations;
commutative operand normalization and bounded cache eviction remain intact.
Independent truth-table, composition, cache-isolation and node-limit tests
cover the fused operation. The complete small-model and actual-engine
witness checks still run under both variable orders.

All following historical runs keep published `139e48a` engine/content,
interleaved order and the same conjectured nine-resource bounds. They use
250,000 non-terminal BDD nodes, 100,000 cache entries, 128 rounds, a checked
45-second limit and an external 60-second timeout. **Every run is incomplete
and fails the node guard.** A reported round is the last round entered,
not a completed fixed point. Constructor counts include the two terminals.

| Experimental source | Construction | Last phase entered | Reported elapsed / maximum RSS |
| --- | --- | --- | --- |
| `dcbce08`, original | Node guard reached | Construction | 3.21 s wall / 187,928 KiB |
| `55c498d`, enabled last | 194,621 nodes, 2,730 ms | Forward 6 | 5.927 s internal / 193,712 KiB |
| `b739bd4`, reverse fields | 44,422 nodes, 77 ms | Forward 9 | 15.01 s wall / 262,440 KiB |
| `12efa12`, fused product | 44,422 nodes, 75 ms | Forward 12 | 29.19 s wall / 293,632 KiB |
| `e81a2c3`, constant quantifier key | 44,422 nodes, 84 ms | Forward 12 | 29.437 s internal / 239,104 KiB |

Artifacts, all preserved separately:

- Original: `/tmp/af9-symbolic-historical-250k-interleaved.{json,log}`.
- Enabled last: `/tmp/af9-symbolic-reassoc-historical-250k-interleaved.json`.
  No redirected log exists for this attempt; its JSON preserves progress.
  The worker ran traversal beyond the requested constructor-only scope.
- Reverse fields: `/tmp/af9-symbolic-historical-suffix-250k.{json,log}`.
- Fused product: `/tmp/af9-symbolic-historical-relprod-250k.{json,log}`.
- Constant key: `/tmp/af9-symbolic-historical-relprod-cachekey-250k.{json,log}`.
  Its log has no external timing footer; the table uses the JSON's internal
  timer and process maximum RSS, not a claimed external wall measurement.
  This copy predates the final explanatory-comment wording in `e81a2c3`.
  Root compared both files: only that comment differs, with the executable
  correction identical. The JSON's file hash remains the probe's identity.

The constant-key revision produces the same node counts and reaches the
same limit as its predecessor. No count reduction or speed improvement is
claimed. Each JSON records the exact historical engine/content and copied
verification source hashes, independently of the historical Git HEAD.
Some worker checkouts have an untracked dependency symlink; that is recorded
in their status rather than misreported as a clean historical source tree.

A separate read-only inventory of the enabled-last constructor found
194,619 allocated non-terminal nodes but 25,615 reachable from permanent
model roots, 25,781 with literal-cache roots and 110,542 with operation-cache
values too. Preserve `/tmp/af9-symbolic-node-diagnostic.{mjs,json,log}`. These
are structural reachability counts: the manager still retains every node,
and clearing caches does not reclaim its node table. No handle-reusing
garbage collector has been introduced.

## Corrected independent finite oracle

The accepted standalone oracle is `/tmp/af9-symbolic-oracle-v3.mts`, with
result `/tmp/af9-symbolic-oracle-v3.out`. It derives and checks source commit,
status and module hashes before and after execution: clean `55c498d` in both
snapshots. On the two-scene fixture with `x=0..3`, `y=0..2`, `tide=0..2`, a
Boolean flag and valid lifecycle/receipt combinations, it independently
generates all 288 valid tuples. Every tuple must encode successfully.
All 864 state/choice pairs have exact expected images: 732 disabled cases,
124 successful transitions and eight enabled bound failures, with zero
mismatches. All eight failure predicates are checked. The intentional
negative fixture has four reachable states, one playing dead end and one
playing state without a completed route; both fixed points take three rounds.

The original oracle failed to count some exact-image mismatches and used
encode rejection to filter its presumed valid domain. Those defects were
corrected in v2, but v2 hardcoded the wrong source commit. Its recorded
module hashes are retained; its commit label is not accepted as provenance.
V3 fixes that provenance problem and preserves both prior versions. This
fixture result is tied to `55c498d`, not retroactively relabeled as the latest
compiler. Subsequent changes have their own focused checks and code review.

Larger diagnostic capacities do not change the production family guard or
grant coverage from a partial result. Resource bounds remain conjectures until exact correspondence,
initial inclusion, a complete forward fixed point and absence of reachable
bound exits establish containment.

The historical comparison target is
`/tmp/af9-symbolic-historical-expected-v2.json`, SHA-256
`019c3fd34655606b0783930413cd4eb6c8841d05cddecd74b3983264297fcbcc`.
It verifies exact coverage-ID agreement across the original audit, first
family audit and refined family audit: 25 reachable scenes, 131 reachable
authored choices, 34 terminal witness choices, and no unreachable content,
playing dead ends or playing states without a completed route. Their counts
remain separate: 169,922 original canonical states / 332,402 transitions;
33,004 first families / 94,556 transitions; and 27,304 refined families /
76,920 transitions. These counters cannot be equated to a symbolic state
count. The symbolic model retains all 54 historical authored flags, including
nine writer-only markers omitted from the old audit's read-based key.

The derivative preserves `/tmp/af9-symbolic-historical-expected.json` and
records each verifier's own source and evidence hashes. It corrects the
earlier artifact's ambiguous grouping of the incomplete symbolic probe's
source hash with copied family metadata. The known terminal paths, revisions
and hashes describe those representative real replays; a different valid
symbolic witness must satisfy the authored choice and outcome semantics,
not reproduce another path's length or hash.

## Larger-capacity attempt and timeout correction

A separate historical checkout with exact `e81a2c3` modules measured larger
diagnostic capacities: one million non-terminal nodes, one million operation
cache entries, 128 rounds, 120,000 ms checked elapsed and a 1,536 MiB Node
old-space limit. This changes two capacities and is not a controlled speed
comparison. The pre-run manifest is `/tmp/af9-symbolic-capacity-manifest.json`;
the separate script is `/tmp/af9-symbolic-capacity-profile.mjs`. The original
250,000-node profiler and all earlier artifacts remain unchanged.

The run is **incomplete**. It entered forward round 14 at 114,766 ms with
400,404 total nodes and one million cache entries. It never reached a forward
fixed point, backward completion or witness replay. The intended external
150-second timeout did not stop it: this new profiler installed a JavaScript
SIGTERM handler, which could not execute while synchronous BDD work blocked
the event loop. Root found the child still running after 263 seconds and
sent SIGKILL to that exact child PID. The external footer records 271.02
seconds / 501,752 KiB maximum RSS / exit 124. This is an overrun and must not
be described as a run that respected the intended 120/150-second limits.

Preserve the last flushed incomplete report and log at
`/tmp/af9-symbolic-capacity-139e48.{json,log}` and the separate
`/tmp/af9-symbolic-capacity-139e48-finalization.json`. The last report's
478,724 KiB process maximum RSS is a checkpoint measurement, not the final
external peak. The finalization confirms the child is absent and every
source hash still matches the pre-run manifest, aggregate hash
`624477e0092c26fb678c3bd49347272a3af3d748dfc14cc46f2a2124ee63e253`.
The run did not report a node-limit failure; it was stopped before coverage.

The next runner removes that signal handler, adds an external SIGKILL grace
period, and fails completion on any source/profiler/bounds/config provenance
mismatch. A separate cache-churn investigation checks whether repeatedly
starting a Map iterator to locate the oldest LRU entry accounts for the
measured slowdown. Neither a cache microbenchmark nor a partial forward
traversal can establish campaign coverage.

## Linked cache recency

`4985daa` replaces repeated insertion-order Map iteration with explicit
oldest/newest links for the operation cache. It preserves the deterministic
LRU policy: hits and updates move their existing entry to newest, insertion
evicts exactly the oldest when full, zero capacity stores nothing, and
clearing resets both endpoints. The list contains exactly the cache's
entries; there is no additional unbounded history. Boolean operations,
canonical nodes, lifetime-valid handles and the configured limits are
unchanged. Entry objects add memory overhead, so a speed result does not
imply reduced memory.

Independent review found no material defect. Build and the 20 focused checks
pass with the cache-parity cases expanded to capacities 0, 1, 2 and 7. The
final expanded run took 3.09 seconds / 317,996 KiB maximum RSS. Preserve
`/tmp/af9-symbolic-linked-lru-expanded-tests.log` and
`/tmp/af9-symbolic-linked-lru-test-provenance.json`. The tested working
changes were subsequently committed as `4985daa`; the provenance records
that sequence rather than claiming a clean committed checkout at test start.

The standalone paired cache benchmark is
`/tmp/af9-cache-churn-v2.{mjs,log}`. It compares returned values, eviction keys
and final ordered contents on identical deterministic operations, with
separate clear/zero/tiny-cache checks. The original benchmark is preserved:
its small letter-key eviction check converted keys to NaN, and its reported
two-sample median selected the upper sample. V2 fixes both. The generated
numeric-key benchmark's original exact comparisons were unaffected. Each
capacity has its own operation count, so compare the two implementations
within a row rather than inferring scaling from times across rows.

A separate historical run at the original 250,000-node / 100,000-cache
capacities reaches the same round-12 node guard, with the same node count at
every forward checkpoint as the constant-key predecessor. It takes 1.746
seconds internally / 2.00 seconds externally, with 331,772 KiB maximum RSS.
The prior constant-key run took 29.437 seconds internally / 239,104 KiB
maximum RSS. This is an observed faster execution of the same incomplete
work with higher peak memory, not complete coverage or a general speed ratio.
Preserve `/tmp/af9-symbolic-historical-linked-lru-250k.{json,log}`; source hash
`317ac79d7bda08535cb8daa8c6dc9134a4661a2ef55c67ad3f710bb874ceb729`.

The corrected larger-capacity profiler and runner are
`/tmp/af9-symbolic-capacity-profile-v2.mjs` and
`/tmp/af9-symbolic-capacity-runner-v2.mjs`. They use separate progress,
output and finalization files, reject provenance changes on completion, and
run under `timeout --signal=TERM --kill-after=5s 150s` without a JavaScript
signal handler. A new manifest records exact `4985daa` verification modules
in the historical engine checkout and the runner policy before execution.

That single corrected run also remains **incomplete**. It enters forward
round 16 with 765,036 nodes and then hits the one-million non-terminal node
guard (1,000,002 total nodes). Internal elapsed is 11,227 ms; external elapsed
is 11.51 seconds, with 797,476 KiB maximum RSS. Backward completion and
witness replay are not reached. The process closes with exit 1 and no signal;
all source, profiler, bounds, config and manifest provenance checks pass
after failure. Preserve `/tmp/af9-symbolic-capacity-linked-lru-139e48.json`,
its `.progress.json`, `.finalization.json` and `.log` companions, and
`/tmp/af9-symbolic-capacity-linked-lru-manifest.json`.

A separate instrumented inventory stops intentionally at the start of
round 16. Of 765,034 allocated non-terminal nodes, 25,615 are reachable from
permanent model roots and 214,532 from those plus the actual complete
frontier array, reachable set and current frontier. Including literal and
operation caches raises the count to 468,075; 296,959 allocated nodes are
unreachable even from that larger root set. These are structural counts;
the original manager still retains every node. Inventory completion is
explicitly distinct from coverage completion. The run takes 19.33 seconds /
768,980 KiB maximum RSS, including instrumentation; it is not a performance
comparison with the uninstrumented run.

Preserve `/tmp/af9-symbolic-live-roots-139e48.json` and its `.progress.json`,
`.finalization.json` and `.log` companions, plus
`/tmp/af9-symbolic-live-roots-manifest.json`. The separate instrumented source,
profiler and runner hashes match after the run; the child is closed with exit
zero for the completed inventory and `coverageComplete=false`.

The selected next experiment copies exact forests into fresh internal model
instances. Existing managers and their handles remain valid; numeric roots
must always be used with their owning model. It must retain every historical
frontier, reachable/completable/current set and accumulated legal predicate,
with atomic ownership changes between completed operations. This compaction
is under implementation and independent regression review; it is not adopted
by the release audit. Current Stage 8 acceptance remains open.

## Exact owned generations implemented

The experimental implementation is now frozen at `b55d18b`. `copyForestTo`
validates the entire root list and the target variable count/order before
copying a shared DAG forest, maps terminals directly, and uses the target's
canonical node constructor. It copies no caches and preserves the source
manager and all its handles. A target node-limit failure can leave appended
nodes in that target, so traversal copies into a disposable fresh instance.

Compaction remains opt-in through the fourth reachability argument,
`{ compactAtNodes }`. It uses private frozen snapshots of validated content,
resource bounds, order, maximum domain and both budgets. An enabled traversal
starts in a private fresh model immediately, keeping the caller's original
node/cache tables unchanged. At a boundary it clears the old worker's memo
cache, recompiles the static model into a fresh manager, and copies
reachable/current/completable/legal roots and every distance frontier as one
forest. Only a successful whole transfer publishes the new owner and roots.
It checks the threshold once per boundary; a threshold smaller than the live
forest does not cause an inner retry loop. Every exact operation still fails
closed at the configured node limit.

Every result now carries `.model`, the owner of its numeric roots, and
`.compactions`. The witness verifier requires that exact owner; image and
preimage reject choice objects from another model. Observers receive the
current owner as their third argument and a `compact` phase after a successful
copy. Callers must update their context from those owners rather than reading
statistics or evaluating roots through an obsolete numeric namespace.

Build and all 29 focused checks pass in 3.68 seconds / 336,160 KiB maximum
RSS. Five forest-copy checks cover shared roots, terminals, prepopulated
targets, validation before mutation, cache independence, source usability,
same-manager copies and target exhaustion. Forced threshold-one tests compare
three complete finite graphs under both variable orders, including a graph
with no completed outcome, all state sets, frontiers and authored witnesses.
Both-order isolated actual-engine checks replay the complete witness catalog
with receipt/save/full-state parity and reject the original result owner.
Input source/bounds/options mutation, original handle/cache stability, foreign
choice objects, invalid thresholds and exact authored failure paths are also
checked. Preserve `/tmp/af9-symbolic-compaction-expanded-tests.log` and
`/tmp/af9-symbolic-compaction-test-provenance.json`; the tested working changes
were subsequently frozen as `b55d18b`, as the provenance explicitly records.

The first historical compaction diagnostic retains the prior one-million-node
and one-million-cache capacities, with threshold 500,000, 128 rounds,
120,000 ms checked, 150-second TERM/five-second KILL and 1,536 MiB old-space.
It remains **incomplete**, hitting the node guard during forward round 19.
Five successful copies leave 191,345, 233,337, 281,714, 339,719 and 404,494
non-terminal nodes, respectively; the next round still reaches one million
before its next safe boundary. No backward traversal or witness replay runs.
The attempt takes 21,784 ms internally / 22.02 seconds externally, with
818,112 KiB maximum RSS. Source/profiler/bounds/config/manifest checks all pass;
the child closes with exit 1 and no signal.

Preserve `/tmp/af9-symbolic-compaction-139e48.json` and its `.progress.json`,
`.finalization.json` and `.log` companions, plus
`/tmp/af9-symbolic-compaction-139e48-manifest.json`. Its separate profiler and
runner update the current owner on progress and use `result.model` for replay
and final counts. No old artifact is rewritten.

The second compaction diagnostic uses two million nodes and 500,000 cache
entries with the same threshold and all other limits. It also fails closed,
during forward round 22 after eight copies. The retained non-terminal counts
are 191,345, 233,337, 281,714, 339,719, 404,494, 490,975, 600,381 and 747,458.
The next image still reaches two million before a safe boundary. No backward
traversal or witness replay completes. It takes 49,531 ms internally / 49.74
seconds externally, with 833,284 KiB maximum RSS; the child closes with exit 1
and source/profiler/bounds/config/manifest checks all pass. Preserve
`/tmp/af9-symbolic-compaction-2m-139e48.json`, its progress/finalization/log
companions and `/tmp/af9-symbolic-compaction-2m-139e48-manifest.json`. These
separate capacity measurements do not change the production gate.

A dependency review proposes an exact field permutation: retain scene,
status and ending first, then greedily group fields by shared authored
conditions and effects. In the actual generator, a pair has weight three
when exactly one field appears in the choice's conditions; all other pairs
have weight one, even when a read field is also written. The first field uses
weighted degree, read/write occurrence count and lexical ties; subsequent
fields use affinity to placed fields, degree and lexical ties. The earlier
reviewer's simpler guard/write description was inaccurate. The generator
collects choice fields, so a generic reuse also needs a complete declaration
and text-field check. All 66 historical fields (three
lifecycle/location fields, nine resources, 54 flags) remain; the inventory's
63 count excludes the first three. No flag or resource is omitted. The
candidate is `/tmp/af9-order-candidate.json`; its generator and complete set
check are recorded in `/tmp/af9-order-review-provenance.json`.

The reviewer also ran constructor probes beyond the assigned read-only
inventory. Preserve both `/tmp/af9-order-test.2fKIxF/measure.log` and
`/tmp/af9-order-baseline.SALqfa/measure.log`, plus their scripts/checkouts.
The controlled constructor comparison reports 44,420 baseline and 38,401
candidate non-terminal nodes with interleaved current/next bits. Both
blocked-layout constructions hit their two-million-node guard; the first
candidate-only blocked attempt also failed. These probes have no verified
external wall/RSS measurements and prove no reachability.

The optional full-permutation API is frozen in the experimental worktree at
`42673ce` after independent review. It captures each validated field ID once
into a frozen snapshot, rejects incomplete/duplicate/unknown/sparse orders,
and preserves the exact layout in fresh generations. Root expanded the
independent finite interpreter, complete fixture-domain image/preimage,
forced-compaction and isolated real-engine replay comparisons across default
and reversed field layouts under both blocked and interleaved bit layouts.
Build plus all 32 focused checks pass on unchanged clean pre/post source in
4.83 seconds / 421,724 KiB maximum RSS. Preserve
`/tmp/af9-symbolic-field-order-expanded-tests.log` and
`/tmp/af9-symbolic-field-order-test-provenance.json`. No historical traversal
with the permutation has completed yet.


The frozen affinity permutation was run once against a separate detached
historical `139e48a` checkout, with exact verifier modules from `42673ce`.
Preflight caught and corrected an initial manifest that conflated the current
75-field campaign with the historical 66-field probe; no traversal used that
incorrect setup. The corrected probe retains its exact untracked verifier
overlay status, while independent replay has a separate clean historical
engine checkout. The final manifest is SHA-256
`a04a2455201b9f13e6fae44f8ac6fbe39a5f78ca03cd4b445d195368073c35c8`.

The single affinity run also fails at two million non-terminal nodes during
forward round 22. Seven copies retain 184,888, 233,733, 303,404, 402,729,
526,852, 685,963 and 891,685 non-terminal nodes. Runtime is 36,203 ms internally
/ 36.44 seconds externally, with 858,600 KiB maximum RSS. Source, order,
profiler, runner, bounds, config and manifest provenance match before/after;
the child closes with exit 1. This does not improve completed coverage.
Preserve every artifact in `/tmp/af9-symbolic-affinity-2m.PSVNFP/`, including
`affinity-2m.json`, progress/finalization/log companions and `run-record.json`.
No retry or fallback ordering was run.

### Exact partitioned transitions

The next isolated strategy exploits the current closed DSL's independent
field updates. Every field relation depends only on that field's previous
value and constants; preconditions read the complete pre-state. Image begins
with the source predicate intersected with the enabled predicate. For each
changed field it joins the field relation, existentially removes that field's
old bits, then renames its new bits back to the current namespace. Preimage
uses the dual per-field rename/elimination, applying the enabled predicate
last. A factor may be skipped only when it equals identity under the enabled
predicate. Other fields remain exact; no field, bit or correlation is dropped.
The original full relation and authored arithmetic/bound failure masks remain.

Intermediate status/ending combinations must not receive lifecycle filtering;
the complete factor product restores the valid output lifecycle. The optional
mode explicitly rejects predicates with next-bit support, since the equations
require current-state predicates. Any future effect reading another field
would require a new proof and implementation. Default mode remains relational.

The implementation (`d8601b0`, integrated as `0454e9d`) received independent
proof and code review. Root's combined source `6167cea` passes build and all
34 focused checks on unchanged clean pre/post source, in 7.52 seconds /
596,212 KiB maximum RSS. The expanded independent finite interpreter and
complete fixture-domain image/preimage comparisons exercise both strategies,
both bit layouts and default/reversed field orders. Forced compaction,
real-engine witness/save/replay, non-injective resets, ordered resource faults,
zero resource relations and snapshotted modes are covered. Preserve
`/tmp/af9-symbolic-partitioned-expanded-tests.log` and
`/tmp/af9-symbolic-partitioned-test-provenance.json`.

One partitioned historical diagnostic is being prepared with the original
default field order and the same two-million-node/500,000-cache/500,000-copy
threshold and time/heap limits. The affinity attempt and every preceding
failure remain separate. No complete symbolic campaign proof is accepted yet.


The single partitioned historical diagnostic also fails closed: forward round
21 reaches two million non-terminal nodes after ten copies. It takes about
37,851 ms internally / 38.04 seconds externally, with 924,652 KiB maximum RSS.
No backward traversal or witness replay completes. The timeout wrapper closes
with exit 1 and no signal; source, bounds, mode, field order, profiler, runner,
config and manifest checks match. Preserve
`/tmp/af9-symbolic-partitioned-2m-139e48.json` and its progress/finalization/log
companions, plus `/tmp/af9-symbolic-partitioned-2m-manifest.json` (SHA-256
`8e51aaa1a04c1f5781c256f77fae840acfb90e0944d1da2bcb9a7cf7e88c62e3`).
The report uses exact modules from `6167cea` with historical engine/content;
no fallback run was launched.

The next reviewed change targeted the traversal's copy boundaries. The prior
`model.image(frontier)` and `model.preimage(completable)` each accumulate all
131 historical choices before another copy can run. They are full-round
operations, not single-choice products. Per-choice traversal accumulation can
introduce safe copy boundaries while retaining the pending accumulator in the
same atomic root bundle. Every choice must be reacquired from the new owner
by index after copying. The proposed scheduling uses the existing threshold
for the first copy, then allows that many newly allocated nodes beyond the
retained forest before the next copy. This avoids copying on every boundary
when live roots themselves exceed the initial threshold.

### Exact accumulation between choices

The independently reviewed implementation (`5896399`, integrated as
`5bf9560`) is now tested in clean manager freeze `68f8932`. Forward traversal
checks every authored fault before computing any image. It then unions each
choice's image of the fixed frontier into a pending root. Backward traversal
similarly unions preimages of the fixed completable set. Each phase applies
its final reachability/difference mask only after processing all choices.
Copies retain that pending root together with every prior traversal root and
frontier, and reacquire each choice by index from the new owner. Thus a copy
cannot lose a partial union or repeat/skip a choice.

The first copy uses `compactAtNodes`; each later trigger is the allocated
unique-node count immediately after the last copy plus that interval, capped
at `Number.MAX_SAFE_INTEGER`. The count includes constructor allocations;
it is not a measurement of the live root forest alone. Even an operation
whose result is false may allocate temporary nodes. Disabled choices
therefore need not produce equal copy counts at an interval of one.

Build and all 36 focused checks pass on unchanged clean pre/post source
`68f8932322f275dae85793cdb4f34cb21a6d7739`, in 12.72 seconds / 1,240,784 KiB
maximum RSS. New instrumentation checks that both forward and backward
copies retain a nonempty pending union, every choice is processed exactly
once in authored order in each round, and later copies obey the allocation
interval. Independent finite-domain coverage, completion and witnesses agree
across both strategies and bit layouts; an unreachable huge threshold causes
no copies. Preserve `/tmp/af9-symbolic-per-choice-interval-tests.log` and
`/tmp/af9-symbolic-per-choice-interval-test-provenance.json`. The log SHA-256 is
`1f5dd943ccba770e7e3af0024459a5efb59b31383b4d6f5be9e1dd0d6cdc8d0a`.
Forced-copy fixtures retain owner references for inspection, so this RSS is
not a campaign performance measurement.

Two failed root test attempts remain separate. At `d14c28c`, the added stress
fixture used an undeclared flag (`/tmp/af9-symbolic-per-choice-expanded-tests.log`
and `/tmp/af9-symbolic-per-choice-test-provenance.json`). At `7d2ccea`, its
equal-copy-count expectation for repeated disabled choices was false
(`/tmp/af9-symbolic-per-choice-corrected-tests.log` and
`/tmp/af9-symbolic-per-choice-corrected-test-provenance.json`). Both builds
passed with 35/36 checks; these were fixture/expectation defects, and their
verifier modules are byte-identical to the final passing freeze. The corrected
check measures actual allocation intervals rather than assuming a false
result makes no allocations.

A historical relational diagnostic uses the original
default 66-field order, interleaved bits, two million nodes, 500,000 cache
entries, a 500,000-node allocation interval, 128 rounds, a checked 120-second
deadline, external 150-second TERM plus five-second KILL, and a 1,536 MiB Node
heap cap. Every historical engine/content/package byte is bound to `139e48a`;
the three verifier modules match the clean passing freeze above. Preparation
review corrected the runner's stale default profiler, added rejection of
existing output/temp artifacts and input/output path aliases, bound all four
CLI output paths to the manifest, and made log creation exclusive. The
original runner and every manifest revision remain preserved. Final runner
`/tmp/af9-symbolic-relational-per-choice-2m-runner-v2.mjs` has SHA-256
`1d1b4e35a45b8dff618c0a165d8ff8b74a6a5e68008a8582dfb78b41775a49b7`.

The first launch stopped before importing the profiler: the prepared checkout
had no installed dependencies, so Node could not resolve `tsx`. Root and
independent static checks had missed this runtime prerequisite. The wrapper
closed with exit 1 in 0.10 seconds / 46,548 KiB maximum RSS, with matching
source provenance and no progress or final report. Preserve the original
`/tmp/af9-symbolic-relational-per-choice-2m-139e48.log` and `.finalization.json`,
plus `/tmp/af9-symbolic-relational-per-choice-2m-manifest.json` (SHA-256
`0e2de5e7bdc015f83c923ed9a48be80cbcc81855389d5d32f7a9fd84548329c7`).
This is a setup failure, not a BDD capacity measurement.

Root installed the checkout's own locked dependencies with `npm ci` and
verified a harmless `node --import tsx` startup. The runtime-ready attempt has
fresh outputs under
`/tmp/af9-symbolic-relational-per-choice-2m-runtime-ready-139e48.*` and manifest
`/tmp/af9-symbolic-relational-per-choice-2m-runtime-ready-manifest.json`, SHA-256
`972a1ea7feed958175b4d56358e2f7a695adf9adbc37f0b57c3e1d2152da96a4`.
Source, scripts, bounds, configuration and order are unchanged between the
setup failure and this attempt; no larger-capacity or alternate-order fallback
was substituted.

The runtime-ready diagnostic is incomplete: it reaches the two-million-node
guard in forward round 24, with no backward round or witness replay. There
are 17 successful copies, with the last post-copy manager containing
1,285,939 allocated non-terminal nodes. Runtime is 84,454 ms internally /
84.69 seconds externally, with 1,368,956 KiB maximum RSS. The child wrapper
(`1234405`) closes with exit 1 and no signal and is absent after the run;
all source, script, bounds, order, config and manifest provenance matches.
The last callback's phase is `compact`, so `lastForwardRound: 24` is the
actual traversal phase/round evidence; the callback label alone does not
establish that forest copying caused the failure. The report does not identify
the specific failing choice/operation.

Copying between choices advances this historical prefix from the prior
round-22 failure but does not establish a fixed point or completed coverage.
Read-only review proposes an operation trace and exact root inventory at
a predeclared copy boundary: before copying, after constructing the new model,
and after copying the complete forest. It must distinguish permanent model
roots, current traversal/pending roots, all historical witness frontiers and
cache closures, with both the last completed and next pending operation.
Post-copy counts include constructor garbage, so only exact union differences
can establish whether historical frontiers or temporary allocations dominate.
Earlier round checkpoints are not immediate pre-copy measurements. No further capacity/order run is authorized by this
result, and no frontier or state field may be silently dropped.
No campaign fixed point, historical replay acceptance or release adoption
follows from the focused fixture checks.

### Copy-17 inventory and early accumulation masks

The external observer completed its predeclared inventory at the seventeenth
copy using byte-unchanged `68f8932` verifier modules and historical `139e48a`
engine/content. It intentionally stops after `copyForestTo` returns, before
the traversal publishes its new owner or emits the compact-17 checkpoint.
Thus `inventoryComplete` is true while `coverageComplete` and `complete`
remain false. The last completed operation is the image of
`open-emergency-bypass` (choice index 123), in forward round 24. The next
operation is unobserved and recorded as null.

Exact non-terminal structural unions at this boundary are:

| Root forest | Unique nodes |
| --- | ---: |
| Permanent model roots | 25,615 |
| Five current traversal roots | 937,595 |
| All 24 historical frontiers alone | 753,483 |
| Permanent plus current traversal roots | 963,180 |
| Permanent, current and all historical roots | 1,267,134 |
| That semantic forest plus literal-cache values | 1,267,300 |

Historical frontiers add 303,954 nodes to the permanent/current union;
their standalone count must not be mistaken for their incremental cost.
The source has 1,839,417 allocated nodes, leaving 572,117 outside the
semantic-plus-literal forest. The copied target has 1,285,939 allocations,
including 18,639 constructor allocations outside that forest. The inventory
does not isolate pending alone, and node fractions are not byte/RSS fractions.
Old operation-cache result values are measured separately from semantic
roots; their key operands are not independently classified.

The helper performs iterative read-only structural walks, validates roots,
checks owner/configuration correspondence and verifies that observation
leaves BDD statistics unchanged. Three independent small tests cover analytic
shared closures, instrumented/uninstrumented full traversal and witnesses,
and intentional-stop identity plus hook restoration. Numeric handles from
foreign managers with overlapping ranges remain inherently unbranded.
Preserve `/tmp/af9-symbolic-copy-inventory-hooks-v2.mjs` (SHA-256
`b214ba178ab009871e4f3d359489be03ed61b12d28876df041d1814f89eb333b`),
its `-tests-v2.mjs` and `-tests-v2.log` companions, and
`/tmp/af9-symbolic-copy17-inventory-manifest-v2.json` (SHA-256
`6ee93cb04156b23e1967e4cdd6fee3faf7441dd6de6ed5ae4a6ea7b4c313a621`).
The report, progress, finalization and log share prefix
`/tmp/af9-symbolic-copy17-inventory-139e48`. The inventory takes 80,899 ms
internally / 81.09 seconds externally, with 1,313,016 KiB maximum RSS and
matching provenance. This is an observational inventory, not campaign coverage.
Independent artifact review records exact phase/step/BDD-stat agreement for
all 42 shared checkpoints against the previous uninstrumented traversal;
that run alone records the final compact-17 callback. The wrapper exited zero
and its PID is absent. Preserve
`/tmp/af9-symbolic-copy17-inventory-root-check-v1.json` (SHA-256
`8c9c6a7bff6141d23b1363ec0d133ba74bbe8c82d296cdcf943ce29308f47265`).

The measured current/model union is larger than the incremental historical
frontier forest. The next small exact experiment therefore filters each
choice contribution before accumulating it. Clean freeze
`f83792e0ea4cf0f5131db6aee26eca3c9c971e8a` adds optional
`accumulationMode: "masked"`; the default remains `"unmasked"`.
For fixed frontier F and reached set R, the forward union of
`image(choice, F) \\ R` equals the old full image union followed by difference
with R. For fixed completable set C and R, the backward union of
`preimage(choice, C) intersect R \\ C` equals the old final masks.
The per-choice masks use existing ITE/intersection operations, and their
redundant final masks can be omitted. No resource, flag, correlation or
historical frontier is dropped. Fault checks still precede all forward images;
copies retain the complete current and historical root bundle.

Independent review accepts both distributed-mask equations and omission of
their redundant final masks. Build and all 40 focused BDD/symbolic checks
pass on unchanged clean pre/post `f83792e`, in 20.77 seconds / 1,078,428 KiB
maximum RSS. Tests include an independent six-state reset/cycle/reconvergence
fixture, the finite DSL oracle, both bit layouts, default/reversed field order,
both transition strategies, forced compaction, actual-engine replay, ordered
faults and one-time option snapshotting. Allocation counts/copy timing may
differ between modes; successful logical results must agree. Preserve
`/tmp/af9-symbolic-masked-expanded-tests.log` (SHA-256
`c710dfdcfc919705731b476acf8f864672bd18b0e9fa8f620eab157f1eb4c39d`) and
`/tmp/af9-symbolic-masked-test-provenance.json`.

One masked historical diagnostic uses a new historical checkout and fresh
artifacts. All previous node/cache/copy/time/heap limits,
the default 66-field interleaved layout and relational transitions are kept.
Its historical efficacy remains unproven; this option has not been adopted
by the production audit.
The prepared manifest is
`/tmp/af9-symbolic-masked-per-choice-2m-manifest-v1.json` (SHA-256
`5d70959cc90ab44b7b71fecd7a226cc1704a2a26f80029aaebc813193e742123`),
binding all 14 historical/overlay source files to aggregate hash
`f4da2fa0a306a057da6f2769c3b399663ce48845a3936b24b408dd2b61f8697d`.
The new checkout has its own locked dependencies and passed harmless `tsx`
startup before launch. Source is detached historical `139e48a` with the exact
three verifier modules from tested `f83792e`; previous probes are untouched.
The profile/runner include `accumulationMode` in configuration, strategy hashes,
manifest checks and actual traversal options. Report/progress/finalization/log
paths share prefix `/tmp/af9-symbolic-masked-per-choice-2m-139e48`.

The one masked attempt also fails closed, at forward round 26 and the same
two-million-node guard. There are 18 successful copies; the last retains
1,538,381 allocated non-terminal nodes. Runtime is 113,195 ms internally /
113.42 seconds externally, with 1,155,468 KiB maximum RSS. The wrapper PID
1246585 closes with exit 1 and no signal and is absent afterward. Report and
finalization provenance both match. Preserve
`/tmp/af9-symbolic-masked-per-choice-2m-root-check-v1.json` (SHA-256
`dcbd1fb68986b3e24303823ea3515b64b95be4310daadd777c13ee4ec7a53e82`).
No backward round or witness replay completes, and no independent coverage
checker runs against this incomplete report. The option advances the observed
prefix by two rounds but still does not establish a fixed point. This run
does not identify the specific failing choice operation or provide a new
exact root inventory. Read-only reviews are assessing lossless frontier
storage and a compact exhaustive explicit-state representation before the
next implementation is chosen; no automatic capacity/order fallback is run.
The prepared independent checker was hardened separately as
`/tmp/af9-check-symbolic-historical-v5.mts` (SHA-256
`4eba183a351365ed6bb096e99252c0619d9c5c6c7f96c746fe026b19c1d40cad`).
It requires masked/relational/interleaved configuration and binds the exact
ordered field artifact and strategy hash to the manifest, while retaining
the separate trusted historical engine and all 190 replay paths. Its help
path passed; it was not run against the incomplete campaign report.

Read-only frontier review found that external snapshots conflict with the
current result contract: `frontiers` are numeric roots owned by the final
model, and shortest-witness reconstruction intersects them in that manager.
Reimporting every snapshot before returning recreates their shared closure;
streaming them requires a new archive/witness API and separate decoder,
cross-owner and shortest-path proofs. The measured 303,954-node saving is
only one boundary, not a guaranteed capacity improvement. This alternative
is not selected under the current API.

### Separate packed explicit-state prototype

The next bounded experiment changes representation rather than weakening the
control-state key. Independent review considers a BigInt-keyed exact graph
reasonable to measure before investing in a custom hash table. Historical
canonical counts are not upper bounds for all-flag states: the packed model
retains every authored/read flag. Current family counts are not concrete-state
counts either. No campaign cardinality or memory saving is inferred in advance.

The proposed model packs scene, status, deduplicated status/summary ending
identity, every resource, and every authored or condition/text-read flag.
Each resource uses 53 bits for all nonnegative safe integers; declared clocks
add their existing maximum constraint. It introduces no guessed ordinary
resource bounds and no ordinary saturation. Compiled indexed guards and ordered
effects must preserve intermediate arithmetic failures, clock saturation,
last writes, effects after navigation and terminal outcomes after effects.

Traversal interns exact BigInt tuples through a Map and assigns dense IDs.
Chunked Uint32 vectors retain BFS parents and reverse edges, with explicit
state/edge guards and a reserved sentinel. Every authored choice witness is
recorded before successor interning, so reconverging and duplicate terminal
choices remain represented. Reverse propagation starts only from completed
states. It proves completion reachability; the reverse edge representation
does not reconstruct a separate completion path for every state. First-parent
paths reconstruct shortest authored scene/choice/ending witnesses.

This graph covers authored choices; the separate global `end()` operation
retains its existing focused engine checks. Facts, history, seed, revision,
journal and receipt hash stay outside the control tuple. All authored witness
paths still require real-engine replay, saves, receipts and hash verification;
arbitrary full-history equivalence is not claimed. Tests and implementation
are in progress, and no packed historical traversal or release adoption has
yet been accepted.

The first packed implementation is frozen in
`dcf3db9d909ecdb9fa5e4848a995b1e959734159` on the experimental manager. Root
owns the BFS/reverse graph and independent oracle expansion; a worker supplied
the model and another supplied analytic graph/limit checks. Review corrected
the model's first object-expanding transition draft to direct BigInt field
operations, changed locale-dependent sorting to the validator's ASCII ID order,
and made encode/project inputs single-read snapshots. The finished model is
immutable, enforces clock/lifecycle domains and rejects foreign choice objects.
BigInt codes themselves are unbranded values and must remain model-scoped.

Build plus all 50 focused BDD/symbolic/packed checks pass on unchanged clean
pre/post `dcf3db9`, in 21.47 seconds / 1,271,900 KiB maximum RSS. Preserve
`/tmp/af9-packed-expanded-tests-v1.log` (SHA-256
`e63ea53ea5c7deae29228af8f243689ebcd40b0c3636d5c20ce5efceb2850590`) and
`/tmp/af9-packed-expanded-test-provenance-v1.json`. The independent finite DSL
oracle checks every small-domain transition, exact reachable/completable/dead-end
and no-completion sets, BFS distance frontiers, shortest authored witnesses and
actual-engine replay/project/save/receipt/hash correspondence. Additional checks
cross a 16,384-entry storage boundary, preserve duplicate edges/cycles, enforce
state/edge limits, retain 74 flags and `constructor` fields, reject malformed
domains/getters, and preserve an earlier cross-resource overflow despite a later
reset. These tests include both existing BDD modes; their RSS is not a packed
campaign measurement.

A new detached historical probe, `/tmp/af9-packed-historical-139e48`, has only
the two exact packed verifier modules over engine/content `139e48a`, its own
`npm ci` dependencies and successful harmless `tsx` startup. A single diagnostic
is being prepared with two million explicit states, eight million edges,
120-second checked time, external TERM at 150 seconds plus KILL after five,
and a 1,536 MiB Node heap. A separate trusted-engine checker will require all
25 scenes, 131 choices and 34 terminal-choice witnesses, with zero mechanical
issues. No historical packed run has been launched yet.
