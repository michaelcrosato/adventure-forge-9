# Backward certificate experiment

Status: isolated prototype with an accepted historical certificate proof; no
production adoption or current-campaign proof.
The release gate and the full world objective remain open. This work follows
historical acceptance of the quantifier-key change and the current campaign's
preserved 14-of-30-obligation timeout. See
[BACKWARD_PROPERTY_AUDIT.md](BACKWARD_PROPERTY_AUDIT.md).

## Proof contract

The generator computes exact strong completion `C`, absorbed completion-or-
failure `W`, and backward bad-state cones. A separate verifier can accept
supplied bad-state predicates without trusting their claimed fixed-point
history. It must freshly compute exact `C` and all four failure-source
predicates for every current authored choice. For a supplied failure cone
`B_F`, it checks seed coverage, `Pre(B_F) ⊆ B_F`, and initial disjointness.
For every scene it checks `P_s \ C ⊆ B_s ∪ B_F`, `Pre(B_s) ⊆ B_s`, and
initial disjointness. `P_s` includes every valid playing state at the scene;
every predecessor operation includes every authored successful choice.
Zero scene cones still require coverage through the verified failure cone.
A supplied closed overapproximation of `C` would be unsound and is rejected
as a replacement for fresh exact computation.

Two independent reviews support this direct coverage condition. It neither
claims that supplied cones are minimal nor reports an unverified exact `W`.
Endpoint witnesses, raw-DSL/compiler correspondence, and actual engine replay
remain separate requirements. No old verdict, sample, source text, or claimed
seed-zero flag can supply a proof result.

## Prototype boundaries and review

`audit-bdd-forest` at `c76157c9b720afa1f14127af7f206def9055a6ba` adds
`exportForest` and `importForest` to the experimental BDD. Wire terminals are
0/1; node `i` uses wire ID `i+2`, independently of private manager handles.
The snapshot contains only the reachable shared DAG. Import validates the
complete reduced, ordered, topological graph before canonical allocation.
Invalid inputs cannot mutate the target; exhaustion during valid import can
leave a partial disposable target and cannot return a proof.

Root review moves the node-count check ahead of input-element copying and
requests iterative export for deep imported graphs. A separate commit adds
those changes and independent dense-wire truth, malformed-node, early-limit,
and 10,000-node chain tests. Worker build and 27 BDD tests pass; the retained
logs are `/tmp/af9-symbolic-bdd-forest-build-v2.log` and
`/tmp/af9-symbolic-bdd-forest-focused-v2.log`. The original pre-correction logs
were not retained. Root review of the source is complete. Both BDD commits are included by
patch-equivalent cherry-picks in the combined prototype below.

The certificate validator is frozen on `audit-symbolic-certificates`.
Its model descriptor includes the validated scenario, complete variable and
field order, and a canonical forest of exact domain/initial/playing/completed
anchors. This distinguishes even resource bounds with identical bit widths.
Root review catches a draft substitution of the raw failure seed union for
the verified failure cone in scene coverage. That substitution would reject
valid absorbed certificates whose failure is reached through intermediate
states. The corrected implementation retains and copies the verified cone. Exact
completion replaces managers safely and reports progress; a compact owner
retains verified C/BF for each disposable scene checker. Root review of the
final code finds no material correctness or ownership defect.

## Clean combined prototype

Experimental `bec826329c1381c2a47a98cd00acd4bc33ff4e4c` contains the BDD forest
boundary, certificate verifier and independent raw-state oracle. The clean
build and all 85 selected BDD/symbolic tests pass in 21.63 seconds overall;
the test command takes 19.70 seconds / 1,231,436 KiB maximum RSS. Before/after
source snapshots are identical. This is not the full production `npm run verify`.

The oracle independently interprets bounded DSL effects and enumerates edges,
C/F/BF/W and scene cones. It compares the returned owned C root against every
raw state and checks the direct bad-set identity. It covers unreachable
cycles, cross-scene failure predecessors, a reachable trap, overflow before a
later reset, omitted scenes, changed bounds, mixed-phase predicates and raw
foreign handles. Root fixes an earlier assertion that cast a forest to a
number only at TypeScript level; the corrected case passes an actual foreign
numeric handle. A readonly test cast also fails the first build and is
replaced with a copied scene array before the clean passing freeze.

Additional boundary tests compare both compilers, both bit layouts and
compaction intervals 0/1/2, reject aliased or differently bounded fresh
owners, and reject a completion round limit or observer interruption before
loading certificates. Production engine/content files remain unchanged.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-certificate-focused-tests-v1.json` | `6407b49b3becf27acbe0c60abd6f29aed89dcb5634bd9acb82b0cbae79a01022` |
| `/tmp/af9-symbolic-certificate-focused-tests-v1.log` | `7af7e4f6b3267dfdf4b2ec93ca6a9e6a7b4f09643eb39db3f34f5f8c0969217a` |

## Artifact I/O measurements

External helper `/tmp/af9-certificate-artifacts-v1.mjs` stores one-root forests
as gzip JSON. It creates files exclusively, reads from one bounded descriptor,
checks compressed and uncompressed sizes/hashes, and caps decompression.
The caller owns a newly created directory and the complete source/catalog
binding. The BDD importer owns graph semantics. An interrupted file write
cannot grant certificate acceptance.

Five focused tests pass: round trip and overwrite rejection; traversal,
checksum and truncation rejection; size/node guards; decompression overflow;
and malformed JSON/envelopes. The run takes 0.05 seconds / 54,436 KiB maximum
RSS. Evidence is `/tmp/af9-certificate-artifacts-v1.test.json`, SHA-256
`cdf0a58a6ecfa39c8eba1ada971974d765e5a45d6ad6c723003d10d50cce56ca`.

A separate generator and fresh reader process measure a synthetic table of
exactly 2,000,000 wire triples. `maxNodes` counts nonterminals only, excluding
0/1. The table deliberately is not a valid BDD graph; it isolates file handling.
Both processes use 1,536 MiB old-space and a 60-second external limit.
Per-file guards are 128 MiB JSON and 32 MiB compressed bytes.

| Measurement | Result |
| --- | --- |
| JSON bytes | 28,576,480 |
| gzip bytes | 6,184,636 |
| Generator elapsed / maximum RSS | 0.55 s / 361,360 KiB |
| Fresh reader elapsed / maximum RSS | 0.53 s / 369,600 KiB |
| Child exit codes | Both zero |

Root checks the source hashes before/after, synchronous child results, log
measurements and artifact integrity. This accepts the I/O measurement only.
Regular synthetic triples may compress better than campaign graphs. Import
allocations, `C + B_F + B_s`, predecessor operations and simultaneous manager
lifetimes remain unmeasured at campaign scale.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-certificate-artifact-capacity-v1-uit9f0/finalization.json` | `1676466ee98cd15d1ee68cbcdee9ed77989ad97d0c3a1d474bdbfa29a8dfc3fd` |
| `/tmp/af9-certificate-artifact-capacity-root-check-v1.json` | `b6dfee2d5e5dd38ae19c94d771be9d4dbf1518a24fc96b3d4c4e343e7b5c81dc` |
| `/tmp/af9-backward-certificate-proposal-v1.md` | `494647ca7cae605b720e4d20876f4393c4d358d47658e3f5789944006ed111ce` |
| `/tmp/af9-certificate-independent-test-plan-v1.md` | `e6bea0d7da02e42e95010ccd5be25d118643e0e6f47014a281c7363c134709ce` |

## Historical generation and separate validation

A fresh `139e48a` checkout at
`/tmp/af9-symbolic-certificate-historical-generation-139e48` installs its own
locked dependencies and builds with the four tested modules. Its source hash
is `d5188b14f1eb0de5a113644ef8c04657b8fc484d00fca67fb47b2c3e6f651804`.
Input-only preflight executes the actual profile assertions against the
manifest and all bound evidence. Review adds a 4 MiB metadata limit, a 2 MiB
descriptor limit, and final elapsed enforcement covering the child process's
artifact writes. A second manifest aligns the successful generation report
with the separate reader's 4 MiB cap. The original unused manifest and passing
preflight remain preserved; the already built source is verified unchanged
and never run before reuse.

The generation run closes successfully under v2 manifest with PID 1401902
and root session 47541. It retains the 2,000,000-node / 500,000-cache /
128-round / 1,536-MiB configuration and checked/external 720/750-second
limits. External elapsed time is 592.61 seconds / 1,462,496 KiB maximum RSS;
the wrapper, including final artifact writes and source/evidence checks,
measures 592.63 seconds. All 600 allocation/semantic events match the accepted
quantifier-key baseline after excluding only elapsed/RSS measurements. The
complete proof, 26 summaries and 169,922-state comparison also match exactly.

The generated 25 scene forests and one failure forest total 5,881,908 JSON
bytes / 1,665,127 gzip bytes. The largest forest has 166,572 nonterminals.
Root reviews and executes the independent generation checker, accepting exact
source/test/configuration bindings, bounded artifact integrity, the closed
process, complete progress, and proof metadata. It explicitly does not accept
a certificate proof from generation alone.

A separately prepared process uses the unchanged built probe and every
source-bound generated forest. Actual-profile input preflight passes. PID
1409164 / root session 38359 then closes successfully: 62.46 seconds external,
62.49 seconds including final artifact and binding checks, and 1,470,332 KiB
maximum RSS. Fresh exact completion converges in 18 rounds. All 524 failure
seeds are regenerated; the failure forest and all 25 scene forests pass
current-only/domain, coverage, predecessor-closure and initial-disjointness
checks. Each forest is loaded exactly once for the proof, including zero roots.

The fresh C classification agrees at every one of the 169,922 static-reference
states; the reference retains 332,402 transitions and 134,108 completable
states. All 90 expected progress events are present. The largest reported
manager contains 1,123,285 nodes during failure checking. This is an observed
manager statistic, not a count of reachable states or all live managers.
Root independently validates the complete closed run, exact event catalog,
source/file hashes, completion ownership and reference counters, and seals
historical certificate acceptance. The supplementary independent output
checker also passes after root reviews its frozen source; it separately checks
the exact 26-entry load order, source/evidence bindings, complete result,
process closure, time limits and all reference counters.
The original 190 engine witnesses are reused unchanged, not newly replayed.

This verifier does not recompute W or claim minimal bad cones. Its measured
historical runtime supports a separate verification step; current generation
and verification remain required. A one-off current generation uses
an explicit 1,800/1,830-second checked/external window, following
the preserved 720-second 14-of-30 timeout. The node/cache/round/heap guards and
all proof obligations remain unchanged. This generation allowance does not
change the prospective 720/750-second release-verification window. No current
run, fresh player or deployment has been launched at this checkpoint.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-certificate-historical-generation-manifest-v1.json` (unused) | `424873f5749a5fcc8007535d6b90ec989bdef8a2efbe05abad938a18bcee4f8b` |
| `/tmp/af9-symbolic-certificate-historical-generation-manifest-v2.json` | `24422422a87887fe302b6510d55d66097636419ecf6e665eb745094039e2fcba` |
| `/tmp/af9-symbolic-certificate-historical-generation-profile-v2.mjs` | `df08ece656febcfd9ec0aae948988e60d513e898c9334b9156b55b23c4d1dbe7` |
| `/tmp/af9-symbolic-certificate-historical-generation-input-preflight-v2.json` | `fc8a01439a74db6b60adbea654f6568a270f60d8ec925446809bcf6b0130cc93` |
| `/tmp/af9-run-symbolic-certificate-v1.py` | `09dcea86c10b187c1c17c54166e10e536ab11bfed8ca50c09aebe903e1fcf3be` |
| `/tmp/af9-symbolic-certificate-historical-generation-139e48.json` | `74562c9920e6f91a177a0055730336b522486bd0e806eacf0d025404c91dff7a` |
| `/tmp/af9-symbolic-certificate-historical-generation-139e48.finalization.json` | `8cb3900d008f60a2aef4cdeef037eb55e61484b3c0985fd1bade6dfe4f180ce7` |
| `/tmp/af9-symbolic-certificate-historical-generation-root-check-v1.json` | `c4a20dbb289cbbca3f1d7f50c6ae61ab9df109f346281142459385eada226db7` |
| `/tmp/af9-symbolic-certificate-historical-verification-manifest-v1.json` | `385e19982be996facdc82a721f81b570b486eefd69c4abd5bf2ce8b705188870` |
| `/tmp/af9-symbolic-certificate-historical-verification-input-preflight-v1.json` | `067a3f808ea2df9f186665e17fa666334348cece8d353cbb5d2620089c963230` |
| `/tmp/af9-symbolic-certificate-historical-verification-139e48.json` | `89b1b3747791fc00e3688be0f5b6f4010049d2ba9b9e726221e2e9d16838bf2f` |
| `/tmp/af9-symbolic-certificate-historical-root-seal-v1.json` | `139d8b2bfc127034f3ecefc06cc854a6ddf7519573194ba0c6b12af88fa27f51` |
| `/tmp/af9-symbolic-certificate-historical-verification-root-check-v1.json` | `c711099d38e7d39d679b405a776d5a109160537fb7e8c84d34829ddc075d58b9` |

## Repository layout prepared

Isolated `audit-certificate-release` at
`59bab447c84c1f045f4ab9414c537724e60ff857` adds six exact `bec8263` verification
modules at their final `src/verification` paths. Four packed modules remain
independent fixture oracles under `tests/helpers/packed`; only their engine
imports and four consuming test imports change. All 16 BDD/symbolic/packed
test files are retained. Existing main game/player/test files, including the
failing campaign invocation, remain unchanged.

Worker installation, build and 104 focused tests pass. Root independently
reviews all copied bytes and import-only differences, commits the layout,
and then runs a clean combined build plus all 223 regular checks across 38
test files. Before/after snapshots of every tracked file are identical.
The combined wrapper takes 21.44 seconds; tests take 19.42 seconds /
1,161,396 KiB maximum RSS. Only unchanged `tests/scenario.test.ts` is excluded,
so this does not establish full `npm run verify` or production adoption.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-certificate-release-regular-tests-v1.json` | `26d5d33f782dc1d47e077291955ce66ffe2604a41f1514ed52f50c67f727685e` |
| `/tmp/af9-certificate-release-regular-tests-v1.log` | `923894ef7063df2fcfb130b9db581bccbfa4579df5f0bd2277ca9529f5b8f544` |

The runtime adapter and repository certificate catalog are still pending.
They must bind current gameplay/core bytes and recompute the proof against
current transitions. External generation paths and Git commit labels are
provenance; copying the same forest bytes to repository paths must not be
misreported as identical whole-source snapshots or a new generation run.

## Repository file boundary

Isolated `6ab23f82a625c2c69abd76d7a3e17ebf5bb96601` adds typed certificate
file I/O without changing any proof core module. Reads validate exact entry
fields, file names, byte/node limits and hashes, use one bounded regular-file
descriptor with inode/device/size checks, reject symlinked files, cap gzip
expansion, and decode UTF-8 strictly. The envelope check grants no graph or
safety verdict; BDD import and fresh certificate verification remain required.
The future catalog layer owns parent paths, exact file/ID sets, hardlink
aliases and cumulative limits. Writes use exclusive creation and retain the
external generator's JSON/gzip encoding.

The build and five focused tests pass, including independent imported graph
truth, zero roots, traversal/metadata/accessor rejection, corruption, sparse
oversized files, decompression overflow and symlink handling. Tests take
0.13 seconds / 93,412 KiB maximum RSS. The repository reader also reads all
26 accepted historical forests unchanged; this is an I/O compatibility check,
not a semantic proof rerun. Independent source review finds no blocker.
The caller must retain the fixed byte caps; the generic helper accepts limits
from its trusted caller. The 223-test combined freeze remains at `59bab44`;
these five additional checks do not constitute a new full combined run.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-certificate-files-review-v1.json` | `770b4e59a5b90182d92e6bf617bce7f4d55e264feea4cf82003be3d40bf75ced` |
| `/tmp/af9-certificate-files-focused-v1.log` | `0a0eec4bbcb0231ffaf827de58cf141548f8f74b6c14028de01b7a8f4f315af1` |
| `/tmp/af9-certificate-files-historical-read-v1.json` | `1e0d30f9b65aa48c27c0d57de5fb1439583c435525cf46567d51dad2c2c1f8ce` |

During prelaunch review, root catches a guessed
historical replay field, the wrong failed-current schema, a 605-bit constructor
assumption (the current model has 106 state bits / 212 BDD variables), and a
log-absence assertion incompatible with the shared runner opening that log
before launch. These preparation defects are corrected before the current
worktrees and generation run are created. No incomplete current proof is accepted.

## Repository bundle reviewed

The production bundle layer is now reviewed and committed separately at
`019f94d9c00c2d8688e7e2fda8be1e3b17887a03`. It binds exact source/config/catalog
values supplied by the current adapter, requires the complete source and
artifact file sets, rejects symlink/hardlink aliases and enforces cumulative
caps. Each load returns a fresh bounded forest; the bundle retains only IDs.
The final integrity pass rereads sources and every forest before acceptance.
Canonical descriptor equality and semantic BDD checks remain in the tested
core verifier.

The initial ten bundle tests passed before root found memory retention,
shallow nested freezing, a dropped own `__proto__` bound and missing canonical
ID checks. After those corrections, v2's fixture/exception expectations failed
7/10 tests; v3 retained one exception-message mismatch; corrected v4 passes
10/10 and builds. All four logs and the v1 source/test snapshots are preserved.
The root review is `/tmp/af9-certificate-bundle-review-v1.json`, SHA-256
`7759c3ecc9bebda017527162284f0c33424cb5412d7e4c5394a560bd0cdbe086`.
These component checks do not constitute a new combined regular run or a
current certificate proof. The adapter and standalone worker are still under
integration review; the original full scenario test remains unchanged.

## Current generation launched

The executed v2 preparer installs locked dependencies and builds the fresh
`eb85c76` probe. Its constructor confirms 29 scenes, 166 choices, 75 logical
fields, 106 state bits, 212 BDD variables and 58,572 nodes. The unused v1
preparer confused logical fields with state bits and current variables with
all BDD variables; it is retained without execution. The v2 stdout still
labels `len(fieldOrder)` as `fieldBits`, while the bound manifest correctly
records 106 state bits and 212 variables. The root preparation record states
this display-only correction without rewriting consumed evidence.

The root input preflight executes the actual frozen profile's source, config,
evidence and catalog assertions before any model/proof/replay work. It passes.
The root launches exactly one current generation in session 69524 with child
PID 1425424. The checked/external limits are 1,800/1,830 seconds; the unchanged
node/cache/round/heap caps are 2,000,000 / 500,000 / 128 / 1,536 MiB.
The output prefix is
`/tmp/af9-symbolic-certificate-current-generation-eb85c76`.
Generation must publish all 30 forests, including zero cones, prove every
obligation and replay all 231 authored endpoint paths through the symbolic
relation and actual public engine. Generation acceptance does not substitute
for separate fresh certificate verification or the repository release gate.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-certificate-current-generation-manifest-v1.json` | `ebef2cb9cae44434118d0fcb4174e8a5d6c842b2acf1c9f2229d10ca9c3c5635` |
| `/tmp/af9-symbolic-certificate-current-generation-profile-v1.mjs` | `6a5bb7b0557ec7d25a4b0514a2c717a73e72b8c615b26792aaf9d1b2945d1d0d` |
| `/tmp/af9-prepare-symbolic-certificate-current-generation-v2.py` | `268722dbee770f566dea28d18c58d6a6fc685a0fbe328334af8496135ef9420b` |
| `/tmp/af9-prepare-symbolic-certificate-current-generation-v2.log` | `ccfd03be1ae720ebe50be3b90fc2cdd766f41e3a25cf735da33d2f767aed84cd` |
| `/tmp/af9-symbolic-certificate-current-generation-input-preflight-root-v1.json` | `fd94e6381b7ef702ad09801f3c7b2d795bc128ca07fa34183b1f846f8b3a803c` |
| `/tmp/af9-current-certificate-preparation-root-v1.json` | `b0894a8a55eb52dfeb022b299d6c52745e084dddf4f732a0e53cd904fc753686` |

## Current generation time-limit failure

The current generation closes with exit 1 at the checked time limit:
1,800.64 seconds external / 1,800.664717 seconds including wrapper validation,
maximum RSS 1,538,112 KiB. It completes C in 18 rounds and W in 12 rounds, then
28 scene forests. At failure, `reedway-worker-landing` is still nonfixed at
round 18 with 659,449 nodes. That scene and `failure-union:` have no files.
No full property proof, certificate manifest or symbolic/public-engine
endpoint replay is returned. The report's constructor-only BDD stats do not
describe the last temporary obligation owner.

Root checks all 809 events against both the report and log, every partial
file's hash/bounded envelope, unchanged source/evidence bindings, the closed
actual process and the absent certificate manifest. The 28 files total
20,119,565 JSON bytes / 5,541,263 gzip bytes. They remain candidate data with
no current acceptance.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-certificate-current-generation-eb85c76.json` | `36e330dac13a8d70092223084b84f77ba43f36271132630264af4cba131ad155` |
| `/tmp/af9-symbolic-certificate-current-generation-eb85c76.progress.json` | `d63f0ce87a0071cb20d538be54e86438c76132b5a912d575bd437105e80f790e` |
| `/tmp/af9-symbolic-certificate-current-generation-eb85c76.log` | `a445d8f063cc285e50cfa44c91f7b1e00f440fc9daa0d3ed287d4a19da176e19` |
| `/tmp/af9-symbolic-certificate-current-generation-eb85c76.finalization.json` | `06b7eb51038bc0f01b3716f2b56a35cfef1a1cd817ec6877a920e71a2363990b` |
| `/tmp/af9-symbolic-certificate-current-generation-failure-root-seal-v1.json` | `6226352b2fdf26c576af93b757ff9e63c76ec7719fc51b99908d1f8ebd9b1ddd` |

A selective candidate generator is now being prepared. It will recompute
fresh C, all four failure seeds per choice and W, then solve only the missing
scene and failure-union closures. It may carry the 28 existing files forward
only as untrusted, source-bound candidates. Every one of the eventual 30
forests must pass the existing fresh semantic verifier; the failed generation
remains failed. Endpoint and release runtime gates remain unchanged. This
avoids recomputing already preserved candidates without trusting their prior
verdicts or weakening the complete proof requirements.

The draft success checkers remain unused. Root review corrects nonexistent
proof-summary fields and observes that witness-map choice insertion order
differs from authored order; `catalog.targets.choices` matches actual SCENARIO
order. The v2 checker preserves those corrections but cannot accept this
incomplete run. The original success-only adopter is also preserved unused.

## Adapter integration freeze

Isolated `a92828dac4eab9c802fffdc2691b696e0b322163` adds the current source-mode
adapter and a standalone worker. The adapter computes the exact build inputs,
explicit disjoint source roles and authored catalog, constructs fresh C/BF/Bs
verification, rechecks every source/artifact afterward and returns both the
verified owner/root result and serializable report. The worker checks its
1,536 MiB heap configuration and emits only report metadata; its parent must
enforce the external deadline. The compiled-mode entrypoint is rejected.

After review, the clean committed build and all 238 regular checks pass in
21.65 seconds overall. Tests take 19.52 seconds / 1,205,320 KiB maximum RSS.
Before/after hashes of every tracked file are identical. The 40-file test
selection excludes only the unchanged `tests/scenario.test.ts`; there is no
full `npm run verify` or real-current-certificate claim. The draft future
scenario invocation remains outside the repository pending the complete
certificate and endpoint/replay gates.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-certificate-release-regular-tests-v2.json` | `8315700d8ca22dea206401dd9c87f9d7d4c48233432d0b0ba687babed1174047` |
| `/tmp/af9-certificate-release-regular-tests-v2.log` | `bd3810961f92718bebd5636c49d3778682c681ea2d6cce09dccaf1bb0b7ca115` |
| `/tmp/af9-campaign-certificate-adapter-bindings-root-v2.json` | `a158afd831c98ebe858f9a1cad448ba8ebcf2cd22a5938f32f37d8cf39d1911c` |

## Selected-candidate generator review

The external selected generator recomputes exact C, all four failure seeds
per authored choice and W, then solves only requested scene or failure-union
closures. It transfers live roots to fresh owners after nonfixed rounds and
exports each selected forest synchronously. Its result explicitly declares
selected-only scope and `fullCampaignAcceptance: false`.

Root's combined seven small tests pass in 0.20 seconds / 93,620 KiB maximum
RSS with unchanged generator, both test files and all nine release modules.
Coverage includes a finite raw-state oracle with bound exit, cycles and
reconvergence, an actual zero scene cone, same-owner rejection and a
same-width/different-bound anchor rejection. These tests do not independently
exercise every failure kind; the retained core fixtures remain necessary.
The initial invalid-content fixture failure log is preserved, but its exact
failed fixture source was not retained.

Independent review agrees with the C/F/W and cone equations. Root records
three limits: arbitrary duck-typed fresh owners are not checked for every
compiled transition root; the final W owner retains its last allocations;
and `onFoundation.failureUnion` is raw F, while the selected failure-union
cone is its predecessor closure BF. The bounded profile must use the pinned
deterministic `SymbolicModel.fresh()` and serialize only `onCone` forests.
Fresh full verification of all candidates remains authoritative.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-selected-certificate-candidates-v1.mjs` | `23d5a748936788f1061860a21c4f9504934a6fd4b6b0b55111b80f01c049c20c` |
| `/tmp/af9-selected-certificate-candidates-v1.test.mjs` | `0534c9b4fcb32c03c0fe9499594990707727745d54c3859a439cc78a05c5278b` |
| `/tmp/af9-selected-certificate-candidates-v2.test.mjs` | `9a321ffc044a1d2d6350183fc63d760fab90bc4eb9ef9fabc7e19767f833e5f2` |
| `/tmp/af9-selected-certificate-candidates-root-tests-v1.json` | `41873ded4539c20ab7728938ad3c7abdf99e80e3fa96d929cafe97f2b505f136` |
| `/tmp/af9-selected-certificate-candidates-root-tests-v1.log` | `1841141e5597f6266103e41b36ee308c92e3a05111a98cbbddf36f0cb23d13bc` |
| `/tmp/af9-selected-certificate-candidates-root-review-v1.json` | `d336ddeb67f2bc4d7b8717c23f397b5df9622c4d6f5d57aa22cb907b165ffa80` |

Only bounded candidate generation is approved at this checkpoint. The two
missing current forests and fresh full proof remain pending.

## Separate current symbolic endpoint replay

The current endpoint gate executes separately while the two-candidate profile
is prepared. It uses the same frozen main/probe/trusted sources and exact five
semantic modules as the failed generation, with one new symbolic owner per
path. The actual public engine supplies states; the replay adapter checks legal
choices, exact symbolic relation images, save/restore at every prefix and full
engine replay for each path. Final scenes, status, revisions, hashes, receipts
and observation choice IDs match the preserved independently checked catalog.

All 231 paths pass: 29 scene paths, 166 choice paths and 36 ending paths,
2,712 actions, 2,943 checkpoints and 72 terminal receipts. Runtime is 21.52
seconds external / 21.533 seconds including final wrapper checks, maximum RSS
251,728 KiB. Root checks all 233 ordered events against log/report/sidecar,
exact target/action totals, unchanged inputs and closed process. The root seal
accepts current symbolic endpoint replay and explicitly rejects any implied
certificate or universal-safety acceptance. The original 28-forest generation
remains failed and still records zero replays; this is a separate run.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-current-symbolic-endpoint-replay-manifest-v1.json` | `f1da301d606dbb80ac07c8bbe1eb38d992ab45ff1601318c393878e929cfe1a4` |
| `/tmp/af9-current-symbolic-endpoint-replay-v1.mjs` | `c77e9c51f275fd6c730eb7f0045b43c34c7fdb932e849c57255db5980d79b3c3` |
| `/tmp/af9-prepare-current-symbolic-endpoint-replay-v1.py` | `dc4391733d27e1b31fac07699baa6bbf17d886932ff54994b8c7c33424fd4847` |
| `/tmp/af9-current-symbolic-endpoint-input-preflight-root-v1.json` | `5ac1e2aef7002212319216aad9497739799be6b792b64142ef982af4e55b7188` |
| `/tmp/af9-current-symbolic-endpoint-replay-eb85c76-v1.json` | `b608fd6db8176c8a457cd2fa0a45cad1b8ac8162bfebbec81311583de4b27b82` |
| `/tmp/af9-current-symbolic-endpoint-replay-eb85c76-v1.progress.json` | `79690f2deed70b16d4651d636357918ae625e93d10d409b14308f4e5d901a7a7` |
| `/tmp/af9-current-symbolic-endpoint-replay-eb85c76-v1.log` | `6c3e2c9223361750502f9395b45369473f48c21ecbbfdd2ff464103e0e733c14` |
| `/tmp/af9-current-symbolic-endpoint-replay-eb85c76-v1.finalization.json` | `faba7aba2a0d6257df056a80e85fe27d47116ff2740ced3eec44c57a3f952022` |
| `/tmp/af9-current-symbolic-endpoint-replay-root-seal-v1.json` | `b9b69233d20c04ae7da42099b4df00382c62c4c98d231b74fa9e9295d60bb97d` |

## Selected current run prepared and launched

Root corrects the selected profile before execution. The frozen v4 binds the
actual 28-forest failure seal, distinguishes wire IDs from manager handles,
checks caller nodes/anchors without treating cache counters as immutable, and
keeps directories outside the generic runner's file-artifact map. Resource and
flag arrays are derived from the bound field order; counts remain separate.
The preparer rejects an existing manifest and binds its own bytes as evidence.
Draft v1/v2 and the worker's v3 copies remain preserved. Root's attempted
exclusive v3 creation encountered those copies and wrote nothing; root uses
separate v4 paths. Independent read-only v4 review finds no blocker.

Preparation reuses the existing frozen checkouts and makes one exact external
copy of the selected generator. The actual profile's input, constructor and
descriptor sections pass preflight: 75 logical fields, 106 current/106 next
bits, 58,572 constructor nodes, 10 resources and 62 flags. Preflight suppresses
progress writes and omits the generator invocation. A separate current
descriptor JSON round-trip also passes.

Root launches session 48474, timed child PID 1450352, under unchanged
1,800/1,830-second checked/external limits and a 1,536 MiB heap. Only the
worker-landing scene and failure-union candidates may be written, with canonical
indexes 28 and 29 in a separate supplement directory. The selected descriptor
explicitly carries no full generation, certificate or release acceptance.
The original failed generation and all 28 files remain unchanged. This section
records launch evidence, not process completion; inspect the actual handle.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-selected-certificate-current-profile-v4.mjs` | `234923daf74784aa9e347b9e084fe31f8e2f8c6826beae213bc1804b368703ec` |
| `/tmp/af9-prepare-selected-certificate-current-v4.py` | `dad18af9864918c271a41e9c3a7dc827c0c149f002b3c315a3722c9a01045915` |
| `/tmp/af9-prepare-selected-certificate-current-v4.log` | `8d64e2eb89e280b3a8485637978c7cfe39ed1be3654630cd47a37135675693c3` |
| `/tmp/af9-selected-certificate-current-manifest-v1.json` | `a24c9c448351ca487d719925f527d332ef5f169f1505e3c49f5346deecec6845` |
| `/tmp/af9-selected-certificate-current-input-preflight-root-v1.json` | `97b678c2b3b7b035be4b9c83ce98fc322fd7c117ade4d1c439f32a423b7aa4a0` |
| `/tmp/af9-selected-certificate-current-preparation-root-v1.json` | `6c2b0fdf67fcbeb9ae555cf299a8f773bf3da81f8fa56897df461903052a70f5` |

## Selected current run: one candidate, then node-limit failure

The selected run closes with exit 1 after 315.22 seconds external / 315.256
seconds including wrapper checks, maximum RSS 1,589,244 KiB. C fixes in 18
rounds and W in 12. Worker-landing fixes in 27 rounds with 26 compactions;
its exported forest has 91,806 nonterminal nodes, 1,444,556 JSON bytes and
404,583 gzip bytes. Its fixed-event manager node count and final summary node
count differ because the generator performs further subset validation before
export; those counts are not conflated with the serialized forest size.

The failure-union manager reaches 1,992,588 nodes at nonfixed round 8, then
compacts to 470,900 nodes. The next predecessor computation reaches the
2,000,000-node guard. No failure-union file, selected descriptor or completed
generator result is published. The report retains foundation counts but has
no returned complete failure-seed metadata array. The original 28 files remain
unchanged; together with the new worker-landing file there are 29 untrusted
candidates. All eventual 30 still require fresh full verification.

Root checks all 129 ordered progress events against log/report/sidecar, every
source/evidence binding, the closed process and the sole file's bounded gzip,
hash, reduced/ordered/reachable wire graph and current-variable support. The
seal accepts failure-evidence integrity only. A supplementary worker checker
also reports success after correcting a digest typo and absolute-path map
handling; its first rejected check and both versions remain preserved.
Exact within-round compaction of accumulated choice predecessors is the next
candidate-generation experiment; no limits or acceptance checks are relaxed.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-selected-certificate-current-eb85c76-v1.json` | `cfa7f0bdb97bacb8531019b284f04c0bd2dc29e8e7b7d6e5d6d665973310fb78` |
| `/tmp/af9-selected-certificate-current-eb85c76-v1.progress.json` | `7e8209e53e4b292e91be57ddfc4d061ecf84f1453fcbb7171730afb4f207d63a` |
| `/tmp/af9-selected-certificate-current-eb85c76-v1.log` | `4817420bad2d7e3fc8deb999c373ee627bb768833c9d23d6d227dff7af0a31d2` |
| `/tmp/af9-selected-certificate-current-eb85c76-v1.finalization.json` | `bd60a53ec22c5941f85c8523d572fb7e4d55ccc3b8ae69d72002e5b61eb567fb` |
| `/tmp/af9-selected-certificate-current-eb85c76-v1-forests-v1/cone-00028.json.gz` | `39363aa8dc8d4ba78d2d835f0ebbd9356e5bb2d9be758f0a15156d266bbe3769` |
| `/tmp/af9-selected-certificate-current-failure-root-seal-v1.json` | `742d48d8979f961dca3a483a5f26f1e87b61a103cecc0f5621bbf1b22ae440b7` |

## Detached worker supervision integrated

Release `4a78944` adds `tests/helpers/detached-worker.ts` and five synthetic
lifecycle tests. The supervisor checks the whole detached Linux process group
after direct-child exit, escalates to SIGKILL when descendants remain and
preserves bounded stdout/stderr/timing on failures. Tests cover short-lived and
persistent descendants after code-0 exit, nonzero output preservation, output
overflow and timeout with a termination-resistant descendant and closed pipes.

Root reviews the helper and tests, copies the helper unchanged and adjusts
only the test import for repository layout. Build and all five focused tests
pass in 4.02 seconds overall with identical before/after source; tests take
1.90 seconds / 90,876 KiB. The previous 238-test combined result remains bound
to `a92828d`; a new combined full suite is not claimed. The draft future
scenario wrapper keeps 720/750-second limits and a 1,536 MiB heap, but the
repository's actual `tests/scenario.test.ts` remains unchanged until the
current certificate proof passes.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-detached-worker-integration-root-tests-v1.json` | `9fd521fb4116b739d05777cb906f980aa30274f05a356007556896c9220fc1a9` |
| `/tmp/af9-detached-worker-integration-root-tests-v1.log` | `6c946d3b7d0fbee8713046eada001a5a5a4219791c0d9ff90e472bd6e1643071` |

## Within-round generator draft and evidence-path correction

The external v2 generator carries a fixed round base and its accumulated
choice predecessors through fresh owners. Its nine small tests pass, including
the finite raw-state oracle with forced copying and prior zero/owner checks.
Root review finds two draft issues before any campaign use: within-round
compaction events use string round labels, and the proposed node threshold is
applied as growth since the last copy instead of an absolute node watermark.
A corrected v3 is being prepared with a separate per-choice diagnostic callback.
No large run uses v2.

The worker also reused the already-consumed `v2.test.mjs` path for its new
tests. After the failed selected run had closed, root preserves the new bytes
at `/tmp/af9-selected-certificate-candidates-v2-within-round.test.mjs` and
restores the original three-test file exactly. Replacing only the generator
import in the worker's prior-test copy reproduces the original full SHA-256
`9a321ffc044a1d2d6350183fc63d760fab90bc4eb9ef9fabc7e19767f833e5f2`.
The worker's new report/logs remain unchanged; its historical test path is
resolved through the separate restoration record. Root rechecks all 204
selected-run evidence bindings plus script/runner hashes successfully.
No prior verdict is rewritten or promoted.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-selected-certificate-candidates-v2.mjs` | `10be10d208d86f4552c940529fe1f667da6dc1e5f9cfd150ab4e8d3bda998f00` |
| `/tmp/af9-selected-certificate-candidates-v2-within-round.test.mjs` | `c79a16d7ffa3588c0c032959b05bb855c6871b66e013737490159076465a6ed1` |
| `/tmp/af9-selected-generator-test-path-restoration-root-v1.json` | `32dc5343717071a3644aed686e6ac7f932a260cedabb4f166fa06aa9337ac0fe` |
| `/tmp/af9-selected-generator-restored-inputs-root-v1.json` | `e72a10e6961ed9e9eb3f6b476d346d0903989fdb234e60208c6daa65b15fa1e0` |

## Required acceptance

1. Complete the remaining failure-union candidate and fresh full certificate
   verification, preserving the separately accepted current endpoint replay.
   Adopt a repository-contained release check only after
   correctness and performance are established; missing or invalid artifacts
   must fail verification. Runtime checks cannot depend on external evidence.
2. Run full `npm run verify`, freeze source, and conduct the predeclared fresh
   Stage 8 player gate before publication. Continue the broader world work.
