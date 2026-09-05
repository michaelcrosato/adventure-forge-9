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
