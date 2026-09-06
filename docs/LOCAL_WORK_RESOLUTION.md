# Local work resolution

The user's final request requires finishing unfinished work, resolving local
branches, running tests, updating documentation, committing/pushing and leaving
a clean repository. This record tracks cleanup separately from the campaign's
still-pending mechanical and live acceptance gates in `STATUS.md`.

The read-only inventory at `/tmp/af9-worktree-inventory-20260905T170450Z.json`
and classification at `/tmp/af9-worktree-disposition-20260905T170450Z.md`
identified 23 clean topic branches with no unmatched patches against either
main or the active symbolic manager. Before removal, root refreshed each
branch tip, complete untracked status, Git patch-equivalence and process CWD
checks. No candidate was an active experiment or a blind-player source freeze.

Their exact Git commits and source files are preserved in:

`/home/micha/.local/share/adventure-forge-9/worktree-archives/20260905T170849Z/`

The verified `completed-topics.bundle` contains every removed branch tip.
Each topic also has a checked `.tar.gz` source archive. Archives exclude only
reproducible `node_modules`, `dist` and the obsolete worktree-registration
`.git` file. `manifest.json` records full SHAs, original paths, patch checks
and archive hashes; `cleanup-events.jsonl` records each removal. Its final
`cleanup-result.json` records 23 removed topics, 46 remaining worktrees and
16 remaining branches at that point. The original manifest SHA-256 is
`976a03b51f2d4b68f0733ccc24eeb87f1a9331b95dc9331f8fb959680d9a56b0`.

To reconstruct a removed topic, fetch its recorded branch from the bundle
into an archive ref, then create a worktree at the recorded full commit.
The source archive additionally preserves local non-build files. Old topic
worktree paths cited in development notes now refer to these preserved
snapshots; sealed historical player/verification paths were not removed.

The source dispositions for `blackglass-review`, `reedway-content`, the
untracked relational-product test in `bdd-andexists`, and original
`lantern-archive` are now resolved. Independent comparison found superseded
drafts or duplicate tests; root checked the changed navigation contract
against the current regressions and refreshed every overlay hash. The source
review remains in
`/home/micha/.local/share/adventure-forge-9/worktree-review-20260905/20260905T171140Z/`.

Those four worktrees and three branch refs were then removed after a second
complete source archive and verified Git bundle were created under
`/home/micha/.local/share/adventure-forge-9/worktree-archives/20260905T172018Z/`.
Its manifest SHA-256 is
`40d2ead51c660f9dfbb9c14e803d3a06d5d2a4f04ee85255aac31000f6a5a71b`.
The bundle includes main and all three removed branch tips; the detached
Blackglass draft's base is proven an ancestor of main. Overlay files are in
the source archives and detailed review archive. The cleanup result records
42 remaining worktrees and 13 branches at that point, after 27 total worktree
and 26 topic-branch removals across the two cleanup batches.

A third cleanup batch followed the symbolic-topic disposition review at
`/home/micha/.local/share/adventure-forge-9/worktree-review-20260905/20260905T174249Z-symbolic-topic-disposition/`.
The nine integrated topics removed were `bdd-andexists-cachekey`,
`bdd-core`, `bdd-relprod-tests`, `bdd-tests`, `symbolic-compaction`,
`symbolic-model-reassoc`, `symbolic-replay`, `symbolic-tests` and
`stage8-audit-review`. Their exact branch tips and source archives are
preserved under
`/home/micha/.local/share/adventure-forge-9/worktree-archives/20260905T174530Z/`.
The cleanup manifest SHA-256 is
`d24236a25feb65fa9d41222056c5403b21d38dcb16d564b73ea2823561260398`.
Its verified result records 35 worktrees and five branches remaining at the
removal point, with nine worktrees and nine topic branches removed in this
batch. Across the three batches, 36 worktrees and 35 topic branches were
removed. A later prepared probe may change the live worktree count; these
figures describe the verified removal snapshot. The archive excludes only
reproducible `node_modules`, `dist` and `.git`; its manifest records each
full tip, status and source-archive hash.

A fourth batch removes the three recently completed topics
`symbolic-field-order`, `symbolic-partitioned` and `symbolic-per-choice`.
Root refreshed every ref and complete untracked status and confirmed that
all four topic commits are patch-equivalent to the integrated manager at
`68f8932`. The independent read-only snapshot agreed and found only ignored
build/dependency output. Root's recorded disposition is
`worktree-review-20260905/20260905T181118Z-root-final-symbolic-topics/` under
the durable local evidence root.

Before removal, root verified the complete Git bundle, compared every source
archive against its worktree, and refreshed source hashes, refs, status and
process CWDs. The reconstructible archive and cleanup script are in
`/home/micha/.local/share/adventure-forge-9/worktree-archives/20260905T181140Z/`.
Its manifest SHA-256 is
`8888ff5a0eb55b88e578fd86379ccda4ede10a33b9d3c253a9816d08559f2566`.
The four batches now account for 39 removed worktrees and 38 topic branches.
At this removal snapshot, 32 worktrees remain: main, the active symbolic
manager, and 30 detached historical source/diagnostic checkouts. The only
local branches are `main` and `audit-symbolic-manager`.

The active symbolic proof, historical diagnostic overlays and blind-player
source freezes remain available. Publication, remaining cleanup and the final
completion audit have not passed yet.

The masked-accumulation diagnostic adds one separate detached historical
checkout, `/tmp/af9-symbolic-masked-per-choice-2m-139e48`, preserving every
prior probe unchanged. Its three untracked verifier modules exactly match
clean tested manager `f83792e`; its complete source manifest is
`/tmp/af9-symbolic-masked-per-choice-2m-manifest-v1.json`. The resulting failed
diagnostic is retained with that overlay. After this preparation there are
33 worktrees and still only the same two local branches; this is a new source
snapshot, not a change to the four archive batches' removal counts.

The separate packed experiment adds detached
`/tmp/af9-packed-historical-139e48`, with the two packed modules from clean
tested `dcf3db9` and its own locked dependencies. At this preparation snapshot,
34 worktrees remain with the same two local branches. Both new diagnostic
overlays remain deliberately separate from prior evidence.

The exact hexadecimal index candidate has a separate detached probe at
`/tmp/af9-packed-hex-historical-139e48`, retaining the first packed failure
unchanged. Its two verifier files match tested experiment `9f75bca`; its own
locked dependencies and complete source manifest are recorded in
`/tmp/af9-packed-hex-historical-source-preparation-v1.json`. The failed
two-million-state run and checked process closure remain beside that probe.
There are now 35 worktrees and the same two local branches; these are live
preservation counts, not revisions to the four cleanup batches.

The static projection adds three detached source roles:
`/tmp/af9-packed-static-historical-139e48`,
`/tmp/af9-packed-static-current-7428b75` and
`/tmp/af9-packed-static-trusted-current-7428b75`. The two probes contain only
the three tested verifier modules from clean `6b77030`; the current trusted
checkout has no overlay. All have their own locked dependencies. Historical
trusted replay reuses the separate clean
`/tmp/af9-symbolic-affinity-trusted-139e48` source.

The historical static report and independent replay check are complete. Both
current capacity failures are preserved; the eight-million-class run reuses
the same current probe without changing any source or adding a checkout.
The corresponding source-preparation manifests and root checks are indexed in
`SYMBOLIC_REACHABILITY_EXPERIMENT.md`. The refreshed inventory has 38 worktrees
and the same two local branches. All three diagnostic processes are closed.
These deliberately retained sources still need an eventual reconstructible
archive/disposition; final cleanup and publication are not complete.

Permanent-phase work adds two detached probes:
`/tmp/af9-packed-phase-historical-139e48` and
`/tmp/af9-packed-phase-current-7428b75`. Each has its own locked dependencies
and only the four verifier files from clean tested `9df0cf7`. The historical
and current trusted source roles reuse their existing clean checkouts. The
historical comparison and trusted replay complete; the current two-million-state
failure remains preserved. The original rejected justifier helper and root
counterexample variants are also retained outside Git. See
`PACKED_PHASE_AUDIT.md` for exact source and artifact hashes.

The refreshed preservation inventory is 40 worktrees and the same two local
branches. All comparison, diagnostic and test processes from this phase are
closed. No archive batch's removal counts changed, and no prior probe was
overwritten. Main adoption, publication and final cleanup remain pending.

The backward-property experiment adds detached
`/tmp/af9-symbolic-properties-historical-139e48`, with its own locked dependencies
and exactly three verifier modules from clean tested `5b2e320`. The setup
failure and real historical node-cap failure are preserved under separate
output names; their processes are closed. The current authored witness
catalog reuses the existing clean trusted checkout and was independently
checked against main. See `BACKWARD_PROPERTY_AUDIT.md` for evidence scope and
the worker's overwritten intermediate catalog limitation. A second fresh probe,
`/tmp/af9-symbolic-obligations-historical-139e48`, contains the three exact split
modules from clean `830b29e`. Its first non-completion closure also hits the
node cap; the process is closed and all source bindings match. The inventory
now has 42 worktrees and the same two local branches. No prior probe was
changed or removed. The manager is clean after its 50-check freeze; the next
simplification is read-only review. Final cleanup and publication remain pending.

Failure absorption and scene partitioning add two detached historical probes,
`/tmp/af9-symbolic-absorbed-historical-139e48` and
`/tmp/af9-symbolic-scene-obligations-historical-139e48`. Both have their own
locked dependencies and the exact three tested modules from their separate
clean freezes (`5904eec` and `2a994f3`). The longer scene diagnostic reuses its
unchanged probe with new artifact paths and a bound time-only configuration
change. All three attempted runs and their closed processes are preserved;
no earlier overlay or report was overwritten. The inventory is 44 worktrees
and the same two local branches. The accepted current endpoint paths are also
materialized as repository test data, with their origin provenance retained.
Verifier adoption, publication and final reconstructible cleanup remain open.

Per-obligation compaction adds detached
`/tmp/af9-symbolic-compact-obligations-historical-139e48`, with its own locked
dependencies and three modules from clean tested `301c5e8`. The inventory now
contains 45 worktrees and the same two local branches. The new historical
run closes at the elapsed guard with separate artifacts and preserves all
previous failures. Main's
committed endpoint fixture and 116 selected regular checks pass at `71fec09`;
the unchanged full-family audit remains outside that passing selection.

The grouped-failure diagnostic adds detached
`/tmp/af9-symbolic-grouped-failures-historical-139e48`, with its own locked
dependencies and three modules from clean tested `b8f1b3c`. Its interval-four
node-limit failure is preserved; the interval-one diagnostic uses the same
unchanged probe and fresh artifacts. The preservation inventory is 46 worktrees
and two branches before the next archival batch; no removal is claimed yet.
## Four archived diagnostic worktrees removed

The copy experiment and three completed packed historical probes were archived
under `/home/micha/.local/share/adventure-forge-9/worktree-archives/20260905T235558Z/`.
Root independently checked exact source content and modes, archive extraction,
bundle heads, all 76 referenced artifacts, clean/stable tracked and untracked
status, process holders and active proof dependencies. The first review script
stopped before removal because it compared collapsed untracked-directory output
with full untracked paths; its failure is preserved. The corrected review uses
the same full status representation and rechecks before each removal.

Removed paths are `/tmp/af9-bdd-copy`, `/tmp/af9-packed-static-historical-139e48`,
`/tmp/af9-packed-historical-139e48` and `/tmp/af9-packed-hex-historical-139e48`.
Their outside reports remain available. The active historical phase reference,
trusted source and grouped proof checkouts are retained. Manifest SHA-256 is
`08ea7a200b1ecd24d71598737871ce6fb95c05f8abc37e5b4afee0cdfbfdf61a`;
bundle SHA-256 is
`34b1479ff66f30a478972323732b704b41b8c3f6e7ea79567d4f79ce97f35d9c`;
`root-removal-v2.json` SHA-256 is
`575eb3bd38ac71fa65b379c0be1c8c56c9d57ce76590c332f6a241952554577a`.
This brings cumulative removals to 43 worktrees and 38 topic branches, with
42 worktrees and two local branches remaining at removal.

Fifteen additional completed historical BDD probes are nondestructively
archived under `worktree-archives/20260906T001532Z-fifteen-historical-bdd/`.
Manifest SHA-256 is
`b0320f51815b755caacb801bd1ba8083851e8d97d953a5070fbde7b13ba8c29d`.
Root subsequently verifies every retained source and mode, exact tar content
and extraction, all 15 detached bundle heads, status/diff sidecars, all 131
copied evidence records, live process references and the accepted historical
and current runtime manifests. The two excluded system binaries are recorded
by path, size, reason and hash observed during review; neither is removed.
Historical inventory mentions are distinguished from runtime dependencies,
and sibling evidence paths are distinguished from files inside a worktree.
Each candidate is rechecked immediately before removal. All 15 are removed;
root report `root-removal-v2.json` has SHA-256
`c8439828169f1c4c5628a0a7ddc8cd0a3e3cf9e51464f94ed60239d755c019d5`.
Both review-script versions and the execution log are preserved alongside
the original unchanged archive manifest. Cumulative removals are 58 worktrees
and 38 topic branches. The fresh current probe was added between batches,
so 28 worktrees and two branches remain after this removal.

## Nine further diagnostic overlays removed

The two completed packed-current probes, two family crosschecks and five
earlier backward-property historical probes are archived under
`worktree-archives/20260906T003947Z-nine-diagnostic-overlays/`. All nine retain
their exact source entries, modes and detached tips. The bundle and extraction
checks pass; 208 evidence files are copied and the two system binaries have
explicit hash/mode/size exclusions. Root independently repeats these checks,
verifies active runtime manifest dependencies and rechecks each candidate
immediately before removal. The first review stops before any removal because
archive schema v3 names its exclusions field `excludedSourceRootPaths`; the
corrected review and both original logs are preserved.

Manifest SHA-256 is
`9820a1efe23ceff695985fc78baecf4a20b6579550236eae2fef5294ba6d2338`;
bundle SHA-256 is
`0afb2e36d864c49466bc9cc444edf4379af0f37988a8526d0c4f9cb146ba2b4a`;
root removal report SHA-256 is
`bcd5e3ddab9cda2fcca51aada7d6917a22c16b0f9f2afbb2bd12b085251223cd`.
All nine are removed. Cumulative cleanup accounts for 67 worktrees and 38
topic branches; 19 worktrees and two branches remain. Twelve clean historical
live/source freezes are undergoing nondestructive archival; the seven current
source, verifier and reference roots remain protected.
