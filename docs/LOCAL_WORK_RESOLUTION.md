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

Remaining work includes the active symbolic proof and source dispositions for
`blackglass-review`, `reedway-content`, the untracked relational-product test
in `bdd-andexists`, and the superseded original `lantern-archive` branch.
Their files are under independent read-only review and remain untouched.
Historical diagnostic overlays and all blind-player source freezes remain
available for exact provenance/replay checks. Publication, remaining cleanup
and the final completion audit have not passed yet.
