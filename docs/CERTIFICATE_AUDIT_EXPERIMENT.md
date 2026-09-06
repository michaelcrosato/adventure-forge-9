# Backward certificate experiment

Status: isolated prototype; no production adoption or current-campaign proof.
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

The certificate validator is being developed on `audit-symbolic-certificates`.
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

The generation run starts under v2 manifest with PID 1401902 and root session
47541. It retains the 2,000,000-node / 500,000-cache / 128-round / 1,536-MiB
configuration and checked/external 720/750-second limits. It exports each
completed BAD predicate without changing BDD nodes or caches, then retains
the full static reference comparison. This run remains pending acceptance.
A separate process must import every forest and validate fresh exact C,
every failure seed, all scene inclusions and the full 169,922-state C
comparison. Generation alone cannot grant certificate or current-campaign
acceptance. No current generation, fresh player or deployment is launched.

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/af9-symbolic-certificate-historical-generation-manifest-v1.json` (unused) | `424873f5749a5fcc8007535d6b90ec989bdef8a2efbe05abad938a18bcee4f8b` |
| `/tmp/af9-symbolic-certificate-historical-generation-manifest-v2.json` | `24422422a87887fe302b6510d55d66097636419ecf6e665eb745094039e2fcba` |
| `/tmp/af9-symbolic-certificate-historical-generation-profile-v2.mjs` | `df08ece656febcfd9ec0aae948988e60d513e898c9334b9156b55b23c4d1dbe7` |
| `/tmp/af9-symbolic-certificate-historical-generation-input-preflight-v2.json` | `fc8a01439a74db6b60adbea654f6568a270f60d8ec925446809bcf6b0130cc93` |
| `/tmp/af9-run-symbolic-certificate-v1.py` | `09dcea86c10b187c1c17c54166e10e536ab11bfed8ca50c09aebe903e1fcf3be` |

## Remaining gates

1. Generate source-bound historical forests while retaining the exact prior
   proof and static-reference comparison. Validate those forests separately
   against fresh exact completion and all original failure/scene obligations.
2. Measure real graph bytes, importer/operation nodes, peak memory and time.
   Preserve every failed preparation and incomplete process.
3. Complete the corresponding current proof and endpoint replay. Adopt a
   repository-contained release check only after correctness and performance
   are established; missing or invalid artifacts must fail verification.
4. Run full `npm run verify`, freeze source, and conduct the predeclared fresh
   Stage 8 player gate before publication. Continue the broader world work.
