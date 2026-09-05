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

The active symbolic proof, historical diagnostic overlays and blind-player
source freezes remain available. Publication, remaining cleanup and the final
completion audit have not passed yet.
