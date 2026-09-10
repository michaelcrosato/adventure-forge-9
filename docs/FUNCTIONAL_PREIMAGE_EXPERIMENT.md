# Functional predecessor experiment

Prospective contract, September 9, 2026. This follows the lost temporary v6
generator and the current campaign's preserved full-verification failure.
The aim is to finish the campaign safety gate while retaining all existing
gameplay distinctions, not to change the accepted scope of that gate.

The 34 additive verifier/test files from `audit-certificate-release` at
`4a78944e7e3789c553455b587cb5bb3fe2f37585` have been recovered into the working
tree. No existing gameplay or test file was replaced by that recovery.
`Bdd.compose` and `SymbolicModel.functionalPreimage` are new additions to
those recovered modules. The original relational `preimage` remains intact.

For deterministic choice c with successful-source predicate G and output
functions f, the candidate generator calculates Pre_c(T) = G AND T[f].
Substitution is simultaneous: the replacement functions read the original
state. Scene, lifecycle, ending and flag assignments become constants; resource
bits use the compiler's existing bounded effect tables. The guard retains
every intermediate arithmetic or bound failure, including failure before a
later reset. Unknown content still fails normal scenario validation.

`src/tooling/generate-certificates.ts` uses that kernel in a generator-only
subclass and reuses the existing completion/obligation solver. Every fresh
owner rebuilds the same model and strategy. Generated forests are explicitly
untrusted candidates. The independent certificate verifier continues to
recompute completion and check source coverage, all predecessor closures,
initial disjointness and every scene using the relational operation.

The build and all 247 pre-existing regular checks, including the recovered
symbolic/BDD/raw-state tests and the four browser regressions, pass. This
supplemental run took 21.07 seconds and 1,190,312 KiB maximum RSS. It excludes
only the unchanged scenario audit and the two independent new test files
still being prepared. The separate full `npm run verify` failure is preserved
in [REVIEW_20260909.md](REVIEW_20260909.md); this is not a passing full verify.

Before the campaign probe, require independent truth-table composition tests,
raw-DSL predecessor comparisons, relational parity, fault/clock/receipt cases,
variable-layout/cache checks and fresh-owner coverage for the generator.
If any fail, retain the failure and fix the implementation before dispatch.

The first campaign probe is bounded at 180,000 checked milliseconds, 190
external seconds with a 10-second termination grace, 1,536 MiB Node old-space,
2,000,000 BDD nodes, 500,000 operation-cache entries and 128 fixed-point rounds.
Copy after every nonfixed round. Use all 29 authored scenes, all 166 choices
and all four failure-source kinds per choice. Finish C, absorbed W and every
scene/failure obligation without removing any activity or pruning live flags.

The run must preserve its inputs, source bindings, ordered progress, every
partial forest, failure details and timing outside the repository in the
durable evidence root. A successful generation means all 30 candidate forests
were written, the initial state was disjoint, and source bindings still match.
It grants no release acceptance. Fresh complete relational verification,
symbolic/public-engine endpoint replay, full `npm run verify` and the
predeclared three fresh Stage 8 players still precede publication.

Do not infer a controlled performance comparison from old historical timings,
and do not restart a failed or missing prior run under its old evidence path.
Current logs use the `af9-functional-` prefix in
`/home/micha/.local/share/adventure-forge-9/`.

## Closed first probe and reverse-sweep follow-up, 2026-09-09

The first native functional-preimage candidate run closed with exit 1 at its
checked 180,000 ms limit: 180.38 seconds wall time, 1,373,088 KiB maximum RSS.
It wrote 14 of the required 30 forests, through `diversion-ledger-room`.
`failure.json` reports the time-limit assertion and no source-change error.
There is no complete manifest, verified certificate, or release acceptance.
The failed run and its partial artifacts are retained, not reused as success:

- `/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v1/`
- `/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v1.log`
- `/home/micha/.local/share/adventure-forge-9/af9-functional-source-20260909-v1.tar.gz`

Before that run, the corrected bounded worker's build and six focused tests
passed. Its first integration build had failed on a TypeScript union access;
that failed evidence is retained. The worker corrected the access and enabled
fixed-point compaction in the small generator parity fixture. The fixture does
not claim to exercise an arithmetic underflow: content validation prevents
that particular negative-prefix example from being an authored transition.

The campaign comparison checked the exact successful-source predicate and
each of 106 current-variable bit predicates for all 166 choices against the
original relational predecessor: 17,762 comparisons, 15.62 seconds wall time,
235,604 KiB maximum RSS. This is transition comparison evidence, not campaign
completion safety or arbitrary-predicate exhaustive enumeration.

- `/home/micha/.local/share/adventure-forge-9/functional-preimage-v2-build.log`
- `/home/micha/.local/share/adventure-forge-9/functional-preimage-v2-focused.log`
- `/home/micha/.local/share/adventure-forge-9/af9-functional-focused-tests-20260909-v1.log`
- `/home/micha/.local/share/adventure-forge-9/af9-functional-campaign-parity-20260909-v1.log`

The second probe changes only the generator's no-choice fixed-point operator
from synchronous union to reverse-authored-order, in-place monotone sweeps.
An update is `X := X union Pre_c(X)` for each choice, visiting all choices in
every sweep. Every update remains inside the least backward closure of the
seed. A sweep with no growth is closed under all choices, so the resulting
least fixed point is unchanged. Reported generator rounds now count sweeps,
not one-edge predecessor layers. Per-choice predecessor calls, including
failure-seed construction, remain exact one-edge preimages. This accelerated
operator must not be treated as a general one-edge preimage API.

The original relational certificate verifier is unchanged. Per-round copying,
128-round guard, two-million-node guard, 1,536 MiB heap, and the first probe's
180-second checked / 190-second external time limits remain unchanged for the
second probe. Its source is separately archived and hash-bound; generation
continues to report `accepted: false`. Full `npm run verify` was started against
this integration; a previously observed family-limit failure is not waived.

### Full integration check closed; second probe not started

`npm run verify` built successfully and ran all 254 tests with no skips:
252 passed, two failed, test-runner duration 135,145.19393 ms. Complete command
wall time was not separately measured. Original closed log and digest:

- `/home/micha/.local/share/adventure-forge-9/af9-functional-sweep-verify-20260909-v2.log`
- `/home/micha/.local/share/adventure-forge-9/af9-functional-sweep-verify-20260909-v2.log.sha256`
- `/home/micha/.local/share/adventure-forge-9/af9-functional-source-20260909-v2.tar.gz`
- `/home/micha/.local/share/adventure-forge-9/af9-functional-source-20260909-v2.tar.gz.sha256`

The original scenario family audit still fails at its unchanged 250,000-family
guard. The additional failure is in the small generator parity fixture:
its deep comparison includes `completionRounds`, which is now 2 reverse sweeps
rather than 3 synchronous rounds. The reported predicate counts, seed metadata,
and safety result match in that fixture, but equal predicate counts alone are
not a proof of equal predicates. No failing check has been removed or relaxed.
The schedule change and its failing fixture are left visible pending user
agreement; no second candidate-generation probe has been started. A suitable
follow-up is to compare the actual copied BDD roots for equality and assert the
expected iteration counts separately, retaining all current safety assertions.
There is still no independently verified current campaign certificate, passing
full verification, blind-player acceptance, or publication.

### Exact-predicate fixture and second bounded probe

Following the continuation instruction, the existing generator fixture now
copies both implementations' completion and completion-or-failure roots into
one BDD owner and compares their canonical handles. It also captures and
compares every obligation's seed and backward closure before disposable owners
are discarded. A disconnected non-completing loop ensures that this is not
only a comparison of zero cones. Existing safety, metadata, count, fresh-owner,
and obligation-round assertions remain. Completion rounds and compactions are
asserted explicitly as 3/2 for synchronous layers and 2/1 for reverse sweeps.

The build and six focused tests passed, with no skips, in 3.10 seconds wall
time (663.942125 ms test-runner duration), maximum RSS 397,560 KiB. This targeted
result repairs the additional fixture failure; it does not claim a passing
full `npm run verify`, whose unchanged family-limit failure remains open.

- Command: `npm run build && node --import tsx --test tests/bdd-compose.test.ts tests/functional-preimage.test.ts`
- Log: `/home/micha/.local/share/adventure-forge-9/af9-functional-sweep-focused-20260909-v3.log`
- Source: `/home/micha/.local/share/adventure-forge-9/af9-functional-source-20260909-v3.tar.gz`
- Digests: `/home/micha/.local/share/adventure-forge-9/af9-functional-source-20260909-v3.sha256`

The second generation probe was launched with exactly the predeclared limits:
`timeout --kill-after=10s 190s node --max-old-space-size=1536 --import tsx src/tooling/generate-certificates.ts --output /home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v2 --max-ms 180000`.
Its live process handle was 69340. A launch is not a result; its final status
must be obtained from the process and closed artifacts. No subagent was used
for this fixture integration or probe.

### Second probe closed; longer bounded run predeclared

The second probe closed with exit 1 at its checked time limit: 183,765.699608 ms
inside the generator, 183.97 seconds external wall time, and 1,313,136 KiB maximum
RSS. It wrote 15/30 forests, through `seal-workroom`. There was no reported
source-change error or node-limit failure. Checked deadlines are evaluated at
progress boundaries, hence the small overrun before the next boundary. The
external 190-second deadline was not reached. These partial artifacts are not
an accepted or complete certificate.

Original evidence: `/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v2/`
and `/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v2.log`.

A third run is predeclared against the same source snapshot and generator:
900,000 ms checked time, 910 seconds external timeout with a 10-second kill
grace, and the unchanged 1,536 MiB heap, two-million-node guard, 128-sweep
limit, all scenes/choices/failure seeds, and per-round compaction. This extends
only the generation experiment's runtime allowance, not any acceptance test.
It does not waive verification or adopt partial outputs. Output directory:
`/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v3`.
The source remains archived as `af9-functional-source-20260909-v3.tar.gz` in the
same evidence parent. No new implementation change or subagent is involved.

The third run returned live tool session `70919` at launch. Its external
`af9-functional-candidates-20260909-v3.launch.json` records that observation,
not a durable assertion that the process is still running. Poll this handle
before relying on its current state; do not restart because an observation
timeout occurs.

### Third run closed at the node guard

The third run wrote all 29 scene forests, then failed during the first combined
failure-cone sweep with `BddLimitError: BDD node limit 2000000 reached`.
Generator elapsed time was 323,377.61111399997 ms; external wall time was
323.61 seconds, maximum RSS 1,358,628 KiB, exit 1. No source-change error was
reported. The final scene artifact was `reedway-worker-landing`, with 91,806
exported nodes. All 29 scene summaries excluded the initial state, but the
missing failure cone prevents any campaign-safety or certificate acceptance
claim. Original artifacts and failure report remain in
`/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v3/`,
with the original sibling `.log`.

### Between-choice copying and fourth-run contract

The opt-in `obligationChoiceCompactAt` option adds reverse in-place obligation
sweeps with live-root copying between choices. The default is zero, preserving
the original synchronous behavior and result shape. The generator enables a
750,000-allocated-node threshold while retaining the two-million-node guard.
Copies preserve the current closure, original seed, valid domain, initial,
playing, and completed predicates, using the existing checked fresh-owner
handoff. Each subsequent choice is obtained from the current owner. Canonical
growth comparisons happen before transfer, and only an entire unchanged sweep
can establish a fixed point. Existing end-of-round copying remains enabled.
A single oversized operation can still hit the hard guard; it is not waived.

Six new tests force within-sweep copies at threshold one, compare exact C/W,
all seeds, and all backward-closure predicates against the original relational
implementation, and exercise safe/unsafe starts, both variable layouts,
nonzero bounded-resource failure cones, and non-completing loops. They also
check threshold validation, one-time option snapshotting, disabled-option
compatibility, and rejection of an incompatible later owner.

Build plus all 12 focused tests passed, no skips, 2.83 seconds wall time,
614.037343 ms test-runner duration, maximum RSS 393,404 KiB. Command:
`npm run build && node --import tsx --test tests/bdd-compose.test.ts tests/functional-preimage.test.ts tests/obligation-choice-compaction.test.ts`.
Original log:
`/home/micha/.local/share/adventure-forge-9/af9-choice-compaction-focused-20260909-v1.log`.
A fresh full `npm run verify` has been started; its result must be recorded
separately. No subagent was used for this integration.

The fourth generation probe is predeclared for the new, separately archived
source with the third run's 900,000 ms checked / 910-second external deadline,
10-second kill grace, 1,536 MiB heap, two-million-node guard, 128-sweep limit,
and every authored scene, choice, and failure seed. Only the between-choice
copying option differs. It will write
`/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v4`.
Earlier 29/30 artifacts will not be relabeled as current-source completion or
silently substituted into the new run.

The full check for the between-choice integration closed: `npm run verify`
built successfully and ran 260 tests with no skips, 259 passed and one failed.
The sole failure remains the unchanged 250,000-family audit guard. External
wall time was 128.48 seconds, test-runner duration 126,144.350943 ms, maximum
RSS 2,568,504 KiB, exit 1. Original log:
`/home/micha/.local/share/adventure-forge-9/af9-choice-compaction-verify-20260909-v1.log`.
This is not a passing publication gate. The source snapshot for the next probe
is `/home/micha/.local/share/adventure-forge-9/af9-functional-source-20260909-v4.tar.gz`;
its digest and the focused evidence digests are in the sibling
`af9-functional-source-20260909-v4.sha256`.

### Fourth run closed; factorized failure coverage is the next experiment

Run four closed with exit 1 at the unchanged two-million-node guard after
29/30 forests. The combined failure cone still did not finish its first sweep.
Between-choice copying worked, but retained live roots themselves became
large: the `find-nessa` handoff retained 1,536,496 nodes, and a later
`choose-oathkeeper` handoff retained 1,334,540 before the subsequent failure.
The captured stack ends in recursive BDD binary operations; it does not
identify a high-level operation precisely enough to claim one.

Generator elapsed time was 469,187.423139 ms; external wall time 469.36 seconds,
maximum RSS 1,653,256 KiB, exit 1. No source-change error was reported.
Original artifacts and `failure.json`:
`/home/micha/.local/share/adventure-forge-9/af9-functional-candidates-20260909-v4/`.
Original log: the sibling `af9-functional-candidates-20260909-v4.log`.
Tool session 46191 is terminal, not a live job. No independent verifier was run
against these incomplete candidates, and no certificate was accepted.

A separate, bounded seed-catalog command used the original relational
`SymbolicModel`, not the functional generator. It regenerated all four failure
kinds for all 166 choices, rechecked current source bindings, and found 664
seeds, of which 44 are nonzero, all `bound-exit`. Catalog construction used
62,945 BDD nodes, 181.62271599999997 ms internally, 0.40 seconds external wall
time, maximum RSS 165,356 KiB, exit 0. This identifies nonempty symbolic source
predicates over the bounded domain; it does not establish reachability or
safety. The exact command is preserved by `/usr/bin/time` in its log.

- `/home/micha/.local/share/adventure-forge-9/af9-failure-seed-catalog-20260909-v1.json`
- `/home/micha/.local/share/adventure-forge-9/af9-failure-seed-catalog-20260909-v1.log`

The next experiment should preserve separate backward-closed failure
components instead of materializing one huge union. The existing obligation
solver already supports four separate seeds per choice. Every original seed,
including zero seeds, must remain accounted for; no failing seed may be
filtered away. This requires an explicit factorized candidate/verifier format,
not relabeling the incomplete monolithic candidates as accepted.

A proposed independent verifier contract is:

1. Recompute C, the least backward closure of completed states, using the original relational predecessor and checked owner transfers.
2. Independently regenerate every failure seed and compute W as the least backward closure of C and their union, retaining the original bounds and round/node/time guards.
3. For each supplied failure component, require current-only playing predicates, seed inclusion, backward closure under every authored choice, and initial-state exclusion. Require exact, duplicate-free coverage of all 664 original seed identifiers.
4. For each authored scene, require its supplied cone to include `playing AND atScene(scene) AND NOT W`, to be current-only and playing-only, to be backward-closed, and to exclude the initial state.
5. Bind all inputs and artifacts, reject missing/changed data, retain raw-oracle and tampering tests, and perform the unchanged endpoint/live-player/publication gates separately.

The safety argument is prospective, not an implemented acceptance claim. A
reachable playing state outside W would belong to a scene seed and hence make
the initial state belong to that scene cone. A state in the least W has a
finite path to C or an original failure seed. The latter would make the initial
state belong to the corresponding backward-closed failure component. Thus
exclusion from every supplied cone leaves a finite route to C, and then to a
completed state, while excluding all original failures. The verifier must
compute least fixed points itself; an arbitrary fixed-point superset such as
all states would not suffice. This keeps the original safety requirement
rather than weakening it to bounded example paths.
