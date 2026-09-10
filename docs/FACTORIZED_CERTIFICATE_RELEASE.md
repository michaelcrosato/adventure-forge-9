# Factorized campaign certificate release checkpoint

## Current result: 2026-09-09

The production mechanical gate passes: build plus **287/287 tests**, including
fresh verification of all **29 scene cones and 664 original failure seeds**.
Game build remains `af9-dce7b1dc57b6d6febcc9bb72`: 29 scenes, 166 authored
choices and 36 terminal-choice witnesses. This is not whole-world acceptance.

On 2026-09-10 the user explicitly requested committing and pushing this
mechanically verified checkpoint, then pausing, without repairing the browser
driver or running further browser/live checks. This authorizes checkpoint
publication only, not Stage 8 live acceptance. No fresh players or interviews
have run. The deferred repair and resume sequence are recorded in STATUS.md.

## Proof and production integration

The independent verifier reconstructs the original relational model and
recomputes least completion C and least completion-or-failure W. It regenerates
all four failure kinds for every authored choice, including empty seeds.
For each supplied cone it checks current/playing scope, original seed
coverage, initial-state exclusion and backward closure under every original
authored choice. Scene seeds cover playing states outside W. No least bad
cone or reachable-state count is claimed.

The new factorized bundle format shares the existing strict source-role,
build, descriptor, catalog, path, symlink, hardlink, byte/hash, decompression,
exact-directory and cumulative-resource guards. The legacy combined reader
and its tests remain. Artifact IDs and every zero-seed entry are mandatory.

The campaign test now supervises the source-bound verifier in a detached
Linux process group with a 1536-MiB old-space limit, 720-second complete
checked window and 750-second external timeout. Node and cache limits remain
2,000,000 and 500,000. Every source and artifact is rechecked at completion.
The existing family enumerator and its 250,000-family guard remain unchanged;
the retained failed traversal is not relabeled as a pass. Universal safety
is now established by the stronger, complete certificate gate instead.

The separate authored-endpoint test still replays every current scene,
choice and ending witness through the public engine: 231 paths, 2,712
actions and 2,943 checkpoints, with full legal-choice, text, facts, journal,
raw-effect, save/restore, replay and receipt checks.

## Untrusted candidate production

A conservative playing-state projection retains each resource together with
clock resources, all scenes/endings and choice-read control flags. Its lifted
unreachable region is an inductive bad predicate. Each predicate is checked
against the original relational choices; original failure seeds are then
covered by unions of those predicates. The full independent checker does not
trust this projection procedure or a previous verdict.

The retained external producer assembled all 693 candidates in 152.20
seconds, including its unsuccessful optional combined-union attempt. The
combined attempt hit the unchanged node cap; it is not a usable certificate.
A separate full relational check passed all 693 candidates in 292.02 seconds,
with current source/file bindings rechecked. Its `accepted: false` correctly
denotes that production, browser and live gates were not yet adopted there.

The exact candidate bytes were staged under the post-integration runtime/IO
bindings. The earlier verifier result is provenance, not acceptance under
changed source. The subsequent complete production test provides the fresh
current-source proof.

Portable Node tooling is now at
`src/tooling/generate-projected-certificates.mjs`. Its seven tiny fixtures
pass, covering both layouts, complete raw truth tables, unsafe rejection,
layout mismatch and unsupported effects. The full production dataset came
from the retained external producer, not a rerun of this newly portable CLI.

Reproduction commands, with new external output paths:

```sh
node --max-old-space-size=1536 --import tsx \
  src/tooling/generate-projected-certificates.mjs \
  --output /absolute/external/new-candidate-directory \
  --scene-candidates certificates/campaign
node --max-old-space-size=1536 --import tsx \
  src/tooling/verify-factorized-candidates.ts \
  --candidates /absolute/external/new-candidate-directory \
  --output /absolute/external/new-verification.json
npm run verify
```

Candidate generation does not itself grant production or live acceptance.

## Original evidence outside the repository

All paths below are under
`/home/micha/.local/share/adventure-forge-9/`.

- `af9-projected-factorized-candidates-20260909-v1/`: all original candidates, projection records and the failed optional combined-union record.
- `af9-projected-factorized-candidates-20260909-v1.mjs` and `.log`: original producer and command output.
- `af9-projected-factorized-verification-20260909-v1.json` and `.log`: independent full 693-component check, 292.02 seconds, maximum RSS 1,439,320 KiB.
- `af9-factorized-source-20260909-v6.tar.gz`: source used by that original independent check; preceding failures remain indexed by its checksum record.
- `af9-stage-projected-bundle-20260909-v1.mjs` and `.log`, plus `af9-factorized-bundle-staging-20260909-v1.json`: exact-byte staging and old/current binding provenance.
- `af9-factorized-production-source-20260909-v1.tar.gz`: production proof source, tests and staged certificate snapshot.
- `af9-factorized-production-verify-20260909-v1.log`: original full verification output, exit 0, 287 passes, no skipped/cancelled/todo tests.
- `af9-factorized-production-worker-20260909-v1/`: preserved original child stdout/stderr and policy/source metadata, copied from `/tmp/af9-campaign-certificate-run-Y21Bhl/`.
- `af9-factorized-browser-20260909-v1/`: exact full source snapshot, request trace, browser commands, screenshots and failed driver report.
- `af9-factorized-browser-server-20260909-v1.mjs`, `af9-factorized-browser-witness-20260909-v1.mjs` and witness `.log`: original scripted browser attempt.
- `af9-browser-scroll-diagnostic-20260909-v1.json`: retained failed attempt and successful one-choice explicit-scroll diagnostic.

Full verification took **486.37 seconds** wall time, maximum RSS
**1,427,512 KiB**. The supervised child window was **483,217.224119 ms**;
C converged in 18 rounds and W in 12. Browser preparation overlapped part of
this run, so comparison with the standalone check is not a controlled timing
experiment.

## Browser result and immediate next step

The initial desktop page rendered without browser errors. The first
automated choice failed its checkpoint assertion: the CLI reported a click
but the viewport did not scroll to the below-the-fold target, no
`/api/choose` request was issued, and the actual state stayed at revision 0.
The failed script's attempted-action counter is not a count of accepted
engine actions.

A fresh stateless diagnostic explicitly scrolled the same button into view,
then clicked it. The browser advanced to revision 1 and the server received
`POST /api/choose`. This establishes the missing-scroll problem in the
external verification driver, not a demonstrated application defect.
The complete journey, save round trip, mobile ending and envelope gate
remain unverified. Both browsers and servers are closed.

The user explicitly deferred the driver repair on 2026-09-10. Keep the
original failed driver and evidence unchanged. On a later approved resume,
create a new driver version with explicit scrolling before native clicks
and download-button interactions, then rerun the complete browser gate.
Next dispatch exactly three fresh neutral Luna/max games at seeds 1-3,
using unchanged instructions, interviews and the 60-turn ceiling. Preserve
every attempt and require at least two natural regional entries/allocations,
intact evidence, median clarity at least 4 and no blocking defect before
claiming Stage 8 live acceptance. The user-directed source checkpoint does
not waive or pass those acceptance gates.

No builder context, files, traces or tools were given to blind players.
No new blind player was launched, and no remote model-identity, cost,
measured-improvement or whole-RPG completion claim is made.
