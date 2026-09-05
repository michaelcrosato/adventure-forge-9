# Current work

Updated: 2026-09-04 (America/Vancouver). The full Skyrim-breadth/BG3-depth goal remains active and far beyond the current game.

## Accepted foundation

- Public repository: https://github.com/michaelcrosato/adventure-forge-9 (`main`). Original briefs archived in `15ada58`; consolidated plan in `4581f73`.
- Stage 1: deterministic engine and real keyless Codex subscription play/interview, with separately verified isolation and preserved original evidence. See EVIDENCE.md and SUBSCRIPTION.md.
- Stage 2: Lowsail/Red Sluice, 11 scenes, 44 authored choices including exits, four named inhabitants, three resolution families, and changed returns. Twenty tests, exhaustive 2,429-state traversal, terminal/browser and save/load verification passed. First authentic blind play passed. See STAGE2.md.
- Cycle 1: limited evidence supports explicit road-cost wording after two baseline and two candidate games. Later contrary feedback limits any broad reading. See CYCLE1.md.
- Cycle 3: limited evidence supports explicit clinic-to-council travel after two known baseline and two fresh candidate games on `34af626`. All encountered the clinic choice; abrupt-move reports fell 1/2 to 0/2, with median clarity/enjoyment 4.5/4.5 to 5/5. See CYCLE3.md. These two retained normal-play improvements meet the initial foundation sequence; they do not establish the final scale or depth.

## Unresolved evidence and active work

Cycle 2 A/B failed their declared global rating gate and did not encounter the depleted chamber in normal play. The focused B check failed its complete criterion. Revision C's two readers correctly explained the supply/kit/medicine/seal relationships, supporting the narrow correction; one exposed a remaining fact-label inconsistency, now fixed in source. All failed/null results and that final untested wording remain in CYCLE2.md. Specialist screen tests cannot grant gameplay acceptance or replace authentic interviews.

Stage 5 candidate: Lantern Archive, one linked investigation area, consequential player backgrounds through existing data vocabulary, multiple evidence approaches, hearing tradeoffs, and consequences in Lowsail. Prepared in an isolated branch before integration. Original small-game endings must remain valid; continuing must close their actual resource/obligation effects before travel. No new area is accepted or live tested yet.

The engine performance correction is integrated: privately constructed frozen states avoid repeated history verification, while external saves/objects still receive full checks. No world-scale performance claim follows from the short-witness benchmark.

The user's hosting request is fulfilled: https://adventure-forge-9.vercel.app is public, connected to GitHub main, and two successive Git-triggered production deployments were verified. Hosted play completed, save/download/load/reload and mobile layout passed, and a checkpoint survived the documentation-only update. Twenty-five tests pass. Automatic browser checkpoints survive stateless function requests; game-content updates can still require a new journey. See HOSTING.md.

Current main's source freeze for Cycle 3 has ended; both runs are closed and exported. The exact frozen source remains at commit `34af626` and trusted checkout `/tmp/af9-cycle3-verified`. Future live runs require their own source freeze.

## Required next work

1. Review the completed connected-area branch and its independent audit; the published main still contains the small game.
2. Integrate the connected-area candidate with all existing regressions, cross-area witnesses, character counterfactuals, replay/save and traversal checks. Do not weaken checks to fit content.
3. Verify human play surfaces and collect authentic fresh cross-area feedback on a frozen build.
4. Expand authored systems and areas in reviewed waves, including long sessions, cross-area consequences and measured breadth/depth. The full completion audit remains outstanding.

Manager owns integration, evidence, publication and acceptance. Luna/max remains the primary development benchmark; corrections and observed timing belong in AGENT_BENCHMARK.md. Inspect actual worktrees, agents and process handles at each continuation rather than inferring running work from this document.
