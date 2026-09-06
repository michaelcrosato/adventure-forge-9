# Accidental playtest during command inspection

On 2026-09-06 UTC, a planning worker invoked
`npx tsx src/playtest/run.ts --help` despite an explicit instruction not to
start players. The old parser ignored unknown options and started the default
subscription player. This was an operational error and a CLI defect.

The partial run is preserved at
`/home/micha/.local/share/adventure-forge-9/runs/2026-09-06T01-11-18-724Z-847fae58`.
It records source commit `092cd62`, seed 1, Luna/max and the ordinary player
instruction. There are 485 chained events, 18 actions, 19 observations/prompts
and 18 responses. The last event is at `2026-09-06T01:12:13.333Z`. The first
worker report's provisional count of 11 actions was wrong; the exact retained
log establishes 18. No exit, interview or run manifest exists.

The worker terminated four process IDs; the signal, kill time and exit code
were not retained. Root independently confirms those PIDs are absent. The
original files remain unchanged and unsealed. Root checks their event chain,
source identity and all 30 source files against the recorded Git commit,
without executing archived source. The provider record contains verified
isolation metadata, but this incomplete attempt has no live acceptance.

The complete attempt inventory includes this one accidental run. It is outside
the predeclared Stage 8 sample because it began during command inspection,
before full mechanical verification and the candidate freeze. The three
planned Stage 8 players remain pending. This run is not used as regional
feedback, a replacement player, an exposure result or a completed interview.

Raw preservation is under
`/home/micha/.local/share/adventure-forge-9/incidents/20260906-playtest-help/`.
Its six exact copies cover the four partial-run files and the isolated
catalog/instructions. No Codex database contents are copied. Preservation
manifest SHA-256 is
`711e4ad85b1f85bbdf81aedf79dab24888aa0faffbea0dcd51b9cc9add03fce2`;
independent `root-review-v1.json` SHA-256 is
`c8172176da43b278513bcb71197a0085ea960eb625efc5d715aa3b6c77e9977a`.
These records establish preservation, not a reconstructed run seal or outcome.

The CLI now parses every argument before dispatch. `--help`/`-h` prints usage
and exits; unsupported options, missing values, empty values and invalid seeds
fail before evidence or player creation. Supported options retain their
meaning and the 60-turn default remains unchanged. Independent review checks
the dispatch boundary. Regression subprocesses forbid child-process startup,
evidence writes and network connections, including if argument handling later
regresses. The three new checks and the build pass. All 119 selected regular
checks then pass in 2.67 seconds overall; only the unchanged full-family
campaign audit is excluded, so this is not full `npm run verify`.

The regular-check report is `/tmp/af9-playtest-cli-regular-checks-v1.json`,
SHA-256 `5c33ec031a5df4a98809c5de4a6ccfd9f1854c97b679afeddde21ca9a9d1d132`.
Its source snapshots and original log are bound in that report. Gameplay,
player instructions and interview questions are unchanged by the CLI fix.
