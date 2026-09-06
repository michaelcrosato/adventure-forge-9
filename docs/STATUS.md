# Current work

Updated: 2026-09-05 (America/Vancouver). The full Skyrim-breadth/BG3-depth goal remains active and far beyond the current game.

Stage 8 is integrated locally at game source `2f6212d`: earlier Reedway access,
safe Archive pause/resume and decided-record revisits, and Sera's salvage credit
consequence (29 scenes, 166 choices, 36 terminal-choice IDs). Final-copy browser
checks and all 115 non-audit checks pass. Both earlier Stage 7 live batches
missed the regional exposure gate at 1/3; Stage 8 has no fresh live acceptance.
Production remains the accepted Blackglass source `139e48a`, public on Vercel
and connected to GitHub main automatic deployment.

The release audit remains open. Exact scene partitions, combined failure
seeds and copying after each nonfixed round pass 59 BDD/symbolic checks at
`b8f1b3c`. The historical property proof is now independently accepted: all
26 obligations are disjoint from the initial state, and comparison covers
all 169,922 reference states. It finishes in 616.66 seconds / 1,490,792 KiB
maximum RSS under a 720-second checked limit. Earlier node/time failures
remain preserved. The current campaign proof is being prepared and has no
result yet. The separate current
231-endpoint catalog now has a repository regression test; it proves authored
path and metadata coverage, not universal safety. See
[BACKWARD_PROPERTY_AUDIT.md](BACKWARD_PROPERTY_AUDIT.md) for scope and evidence.

## Accepted foundation

- Public repository: https://github.com/michaelcrosato/adventure-forge-9 (`main`). Original briefs archived in `15ada58`; consolidated plan in `4581f73`.
- Stage 1: deterministic engine and real keyless Codex subscription play/interview, with separately verified isolation and preserved original evidence. See EVIDENCE.md and SUBSCRIPTION.md.
- Stage 2: Lowsail/Red Sluice, 11 scenes, 44 authored choices including exits, four named inhabitants, three resolution families, and changed returns. Twenty tests, exhaustive 2,429-state traversal, terminal/browser and save/load verification passed. First authentic blind play passed. See STAGE2.md.
- Cycle 1: limited evidence supports explicit road-cost wording after two baseline and two candidate games. Later contrary feedback limits any broad reading. See CYCLE1.md.
- Cycle 3: limited evidence supports explicit clinic-to-council travel after two known baseline and two fresh candidate games on `34af626`. All encountered the clinic choice; abrupt-move reports fell 1/2 to 0/2, with median clarity/enjoyment 4.5/4.5 to 5/5. See CYCLE3.md. These two retained normal-play improvements meet the initial foundation sequence; they do not establish the final scale or depth.

## Unresolved evidence and active work

Cycle 2 A/B failed their declared global rating gate and did not encounter the depleted chamber in normal play. The focused B check failed its complete criterion. Revision C's two readers correctly explained the supply/kit/medicine/seal relationships, supporting the narrow correction; one exposed a remaining fact-label inconsistency, now fixed in source. All failed/null results and that final untested wording remain in CYCLE2.md. Specialist screen tests cannot grant gameplay acceptance or replace authentic interviews.

Stage 5: Lantern Archive adds one linked investigation area, bringing the game to 18 scenes, 91 choices including exits/navigation, eight named inhabitants, and three optional backgrounds with consequences in both chapters. Existing small-game endings remain available; six continuations preserve their actual resource/obligation costs. The first three fresh games exposed a premature-hearing restriction and unclear background selection. Root preserved that evidence, corrected the behavior, and ran three fresh games on `dbabc94`: all completed, reached the hearing, and rated clarity/enjoyment 5/5. The declared gates pass for initial expansion acceptance. All three chose canalwright/shared-water/technical publication; council/evacuation origins and the other backgrounds retain mechanical rather than fresh gameplay coverage. See STAGE5.md for the limitations and remaining tool/testimony confusion.

At the Archive release, 45 tests and the Vercel production build passed. Its future-read audit covered 76,117 canonical states and 129,874 transitions with no unreachable content, dead ends or unfinished states lacking a completed route. It retains all resources and future-read flags, checks merged-state congruence and fails closed on new vocabulary. Projection word counts are explicitly representative. The stateless browser completed a 23-action early-hearing recovery path, with repeated reloads, save download, completed reload and mobile checks. This branch was not naturally encountered by the repaired blind batch.

The engine performance correction is integrated: privately constructed frozen states avoid repeated history verification, while external saves/objects still receive full checks. No world-scale performance claim follows from the short-witness benchmark.

The user's hosting request is fulfilled: https://adventure-forge-9.vercel.app is public and connected to GitHub main. The accepted Blackglass expansion was pushed as `91a25b4` and automatically reached Ready production deployment `dpl_DGkTkSVkNpUfz72duD22TLEq7LkJ`; its exact GitHub source SHA and production alias were independently verified. GitHub's independent verification also passed. Automatic browser checkpoints survive stateless function requests; game-content updates can still require a new journey. See HOSTING.md.

All live batches, including the three continuation-candidate runs, are closed and exported. Historical source checkouts remain separate: Cycle 3 at `34af626` in `/tmp/af9-cycle3-verified`; first Archive batch at `59afce4` in `/tmp/af9-stage5-verified`; repaired Archive batch at `dbabc94` in `/tmp/af9-stage5-hearing-verified`; first Blackglass batch at `08156a1` in `/tmp/af9-stage6-verified`; corrected Blackglass batch at `af5e340` in `/tmp/af9-stage6-brace-verified`. All six Blackglass-era exports passed integrity/replay and checksum verification. No final world-scale or interaction-depth acceptance is claimed.

## Required next work

The Stage 8 behavior, browser and non-audit regressions are documented in
[STAGE8_PARALLEL_CAMPAIGN.md](STAGE8_PARALLEL_CAMPAIGN.md). The original full
verification failure and all incomplete scaling diagnostics remain preserved.
Static packed projection completes the historical graph but fails even an
eight-million-class current diagnostic. Conservative permanent-phase projection
also completes historical comparison/replay, then hits the current two-million
class guard. See [PACKED_PHASE_AUDIT.md](PACKED_PHASE_AUDIT.md) and
[SYMBOLIC_REACHABILITY_EXPERIMENT.md](SYMBOLIC_REACHABILITY_EXPERIMENT.md).

The backward property proof now passes the historical gate. Copying after
every nonfixed round keeps the combined failure cone below the node cap;
the first run reaches its fixed point just beyond the 600-second check and
is correctly rejected before final validation. A separately bound run changes
only checked/external time limits to 720/750 seconds. It completes all 26
obligations, 524 original failure-seed records and the full static comparison.
Root verifies the entire earlier logical progress prefix, exact catalogs,
source/artifact bindings and closed process. The current profile has passed
real catalog/source/schema preflight after correcting draft field assumptions;
this is input validation only. Its first current campaign run remains pending.
The complete current endpoint catalog has separate main-engine replay evidence
in [BACKWARD_PROPERTY_AUDIT.md](BACKWARD_PROPERTY_AUDIT.md). Its committed
231-path regression and all 116 selected regular checks pass on clean
`71fec09`; only the unchanged full-family scenario audit is excluded.
The production audit
and its guard remain unchanged; full verification and Stage 8 acceptance are
still pending.

1. Resolve Stage 8's measured audit workload failure without weakening the proof or removing regional activity. Compare the independently reviewed alternatives after rejecting local flag pruning; preserve its counterexample and every failed diagnostic. Full verification and a clean freeze are required before the three predeclared fresh players. The wording comparison is complete, with a narrow clarity observation but a second failed regional exposure gate (1/3). Keep both batches and all earlier endings; do not rerun identical players until a favorable result appears. See `STAGE7_REEDWAY.md` and `STAGE8_PARALLEL_CAMPAIGN.md`.
2. Review persistent regional travel and safe earlier-area revisits as the next breadth step. Current chapters are mostly sequential; another sequential investigation area alone would not establish an explorable world.
3. Preserve the strict completion audit as the world grows; address state growth without discarding meaningful future distinctions. A 1,010-action local checkpoint measured 79,097 request bytes and restored in about 32 ms, but the hosted 256 KiB envelope limit remains a finite long-session constraint.
4. Continue reviewed waves with cross-area consequences, character counterfactuals, long sessions and authentic feedback. Clarify remaining kit/testimony tradeoffs and the distinction between accepting a council seal and actually granting control. The full completion audit remains outstanding.

Manager owns integration, evidence, publication and acceptance. Luna/max remains the primary development benchmark; corrections and observed timing belong in AGENT_BENCHMARK.md. Inspect actual worktrees, agents and process handles at each continuation rather than inferring running work from this document.

Read-only regional review found a safe return boundary at resolved `blackglass-quay` and `lowsail-after-blackglass`; the old pressure crossing is already closed after resolution. Do not reconnect old preparation or resolution scenes without guarding their once-only costs and mutually exclusive outcomes: several presently rely on the sequential topology. A two-scene lock-charter proposal is not accepted for implementation: its authorities mostly follow already-chosen water outcomes, and its main reward is passage around an otherwise completed loop. The next proposal needs a useful optional goal, at least two competing viable approaches from the same inherited state, and consequences visible on a changed revisit.

Blackglass is accepted as the first timed-traversal chapter and published: 25 total scenes, 131 choices and 10 named inhabitants, with a bounded tide, distinct inherited routes, Nessa's aid/refusal, pressure damage, patrol attention and repeated return navigation. All 71 checks pass. The corrected audit covers 169,922 states and 332,402 transitions with no unreachable content, dead ends or unfinished states lacking a completed path. Its explicit workload ceiling is now 250,000, after retaining the failed 100,000 diagnostic and independently measuring the full graph. Terminal-only flag reduction preserves exact resources, visible conditional text and ending identity. See STAGE6_BLACKGLASS.md and AUDIT_SCALING.md for the proof limits and measurements.

Three stateless HTTP witnesses completed across all chapters; every response/checkpoint matched deterministic replay. Their largest actual choose envelope was 3,811 bytes. A 26-action browser journey delayed the evacuation route, resumed twice, used late Nessa assistance and correctly ended with pressure damage; save download/reload and mobile layout passed. The final missed-window and unresolved-trust prose corrections also passed actual save uploads and rendered inspection at `98b8dc3`. All 130 first-candidate shortest authored witnesses were measured, with a 3,235-byte maximum last-request envelope; the longest/largest each passed the actual handler. The corrected supply route also passed a 24-action browser journey with three reloads, save download and mobile inspection; its new choice's actual 21-action request measured 3,178 bytes and passed the handler. Both fresh batches are preserved, with basic chapter acceptance and the failed improvement-exposure gate explicitly distinguished. No whole-world capacity or final depth claim follows from this wave.

See STAGE6_BLACKGLASS.md for the prospective contract, integration details and acceptance gates. Manager review rejected a broad engine-factory refactor that accepted mutable scenarios under one global build identity; it was removed before integration. Peer review found inherited-property resource/fact membership (`constructor`), now corrected with own-property checks and independent regressions. Content review requires an explicit repair result so Nessa's help and emergency damage cannot be misreported through the aggregate risk total.

The human player surfaces sort resource names consistently. This fixes cards/text moving after checkpoint restoration changes object-key order. Browser start → action → reload retained the same resource order with no errors, and terminal before/after restore matched. All 45 tests at that earlier change passed; no new static layout test was added. That fix changes presentation only and leaves its rule build identity unchanged.

The cleanup inventory at `/tmp/af9-worktree-inventory-20260905T164534Z.json`
records 65 worktrees, 24 with local changes and 37 with commits absent from
main at inspection. Some commits are earlier cherry-pick sources, and some
local changes are retained diagnostic overlays. Each must be accounted for
before cleanup; the inventory does not classify them as disposable. Publication
remains pending the full mechanical and live acceptance gates above.

Twenty-three completed topic branches and their worktrees have now been
archived and removed after refreshed cleanliness, patch-equivalence and
process checks. Their exact commit bundle and source archives are verified
under `/home/micha/.local/share/adventure-forge-9/worktree-archives/20260905T170849Z/`.
Main remains clean after commits. Active symbolic work, historical evidence
and four source dispositions needing review remain; see
`LOCAL_WORK_RESOLUTION.md`. This is partial cleanup, not final completion.

The four remaining draft/test dispositions were independently compared and
archived, then removed: superseded Blackglass and Reedway drafts, duplicate
relational-product tests, and the original superseded Lantern implementation.
Their archive is `worktree-archives/20260905T172018Z/` under the same durable
local evidence root. Cleanup now accounts for 27 removed worktrees and 26
removed topic branches; the 42 worktrees and 13 branches remaining at removal
contain active experiments or historical evidence. No candidate source was
discarded without a reconstructible archive and recorded disposition.

Nine more integrated development topics and their worktrees have been
archived and removed, with exact source, commits and rejected-pruning evidence
preserved in `worktree-archives/20260905T174530Z/` under the same durable root.
The three batches account for 36 removed worktrees and 35 topic branches.
The third batch leaves 35 worktrees and five branches at removal; historical
source freezes and diagnostic overlays remain available. See
`LOCAL_WORK_RESOLUTION.md` for hashes and reconstruction.

The final three completed symbolic topic branches are also archived and
removed after complete source/bundle verification and refreshed process,
status and patch checks. Archive `worktree-archives/20260905T181140Z/` records
39 cumulative worktree removals and 38 topic-branch removals. Only `main` and
`audit-symbolic-manager` remain as local branches, alongside 30 detached
historical source/diagnostic checkouts. The active proof and release gates
remain unfinished; this cleanup is not final campaign acceptance.

Four completed copy/packed diagnostic checkouts were subsequently archived
and removed after independent source, mode, bundle, evidence and process
checks. Archive `worktree-archives/20260905T235558Z/` records 43 cumulative
worktree removals and 38 topic-branch removals, leaving 42 worktrees and two
branches at removal. Fifteen additional historical BDD checkouts have a
verified nondestructive archive; root removal review is still pending.
