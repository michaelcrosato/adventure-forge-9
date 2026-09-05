# Replaying preserved evidence

Run `npm run evidence -- verify <run-directory>` for the current build. A different build reports that the recorded build is required; this is not a replay failure and never grants current-build live acceptance.

For an older run, use a separately trusted Git commit. Treat `source.json` as evidence, not executable instructions: internally consistent local hashes are not signatures.

1. Read `setup.json` for the recorded commit and source identity. Confirm the commit is one you trust in this repository.
2. Create an isolated checkout of that commit, for example:

   ```sh
   git worktree add --detach /tmp/af9-stage1 04b492bc96f19d17a94b23c0e32c5b3b0a163efc
   ```

3. From the current development checkout, compare every recorded source/config/dependency file against the trusted checkout:

   ```sh
   npm run evidence -- verify-recorded /absolute/path/to/run /tmp/af9-stage1
   ```

   This validates the archive chain, source identity, and exact source match. It never executes archived source. A matching old checkout still reports that its build must perform the replay.

4. In that trusted checkout, install its pinned dependencies and invoke its own verifier:

   ```sh
   cd /tmp/af9-stage1
   npm ci
   npm run evidence -- verify /absolute/path/to/run
   ```

The Stage 1 blind run was rechecked this way using `/tmp/af9-stage1-verified-replay`: source match passed, then the original verifier reported integrity/replay/live acceptance true and two actions. No provider call was made. The installed matching `tsx` binary was reused for that local check.

Exports contain original source, prompts, provider projections, events, receipts and interviews. Their `.sha256` sidecars can be checked with `sha256sum -c <archive>.sha256`. Evidence stays outside the source tree; old failed or interrupted runs must not be discarded when creating a new candidate.
