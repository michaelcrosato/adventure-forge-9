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

Stage 5: Lantern Archive adds one linked investigation area, bringing the game to 18 scenes, 91 choices including exits/navigation, eight named inhabitants, and three optional backgrounds with consequences in both chapters. Existing small-game endings remain available; six continuations preserve their actual resource/obligation costs. The first three fresh games exposed a premature-hearing restriction and unclear background selection. Root preserved that evidence, corrected the behavior, and ran three fresh games on `dbabc94`: all completed, reached the hearing, and rated clarity/enjoyment 5/5. The declared gates pass for initial expansion acceptance. All three chose canalwright/shared-water/technical publication; council/evacuation origins and the other backgrounds retain mechanical rather than fresh gameplay coverage. See STAGE5.md for the limitations and remaining tool/testimony confusion.

Forty-five tests and the Vercel production build pass. The full future-read audit covers 76,117 canonical states and 129,874 transitions with no unreachable content, dead ends or unfinished states lacking a completed route. It retains all resources and future-read flags, checks merged-state congruence and fails closed on new vocabulary. Projection word counts are explicitly representative. The stateless browser completed a 23-action early-hearing recovery path, with repeated reloads, save download, completed reload and mobile checks. This branch was not naturally encountered by the repaired blind batch.

The engine performance correction is integrated: privately constructed frozen states avoid repeated history verification, while external saves/objects still receive full checks. No world-scale performance claim follows from the short-witness benchmark.

The user's hosting request is fulfilled: https://adventure-forge-9.vercel.app is public and connected to GitHub main. The Archive expansion was pushed as `ad92740` and automatically reached Ready production deployment `dpl_J5rMtKvQQ2epAo12YXi1W1Le7Z5w`; its exact GitHub source SHA and production alias were verified. GitHub's independent verification also passed. Automatic browser checkpoints survive stateless function requests; game-content updates can still require a new journey. See HOSTING.md.

All current live runs are closed and exported. Historical source checkouts remain separate: Cycle 3 at `34af626` in `/tmp/af9-cycle3-verified`; first Archive batch at `59afce4` in `/tmp/af9-stage5-verified`; repaired Archive batch at `dbabc94` in `/tmp/af9-stage5-hearing-verified`. Future live runs require a new source freeze. No final world-scale or interaction-depth acceptance is claimed.

## Required next work

1. Implement and review the next-wave bounded clock and Blackglass branches described below. The published Archive passed a full 23-action public playthrough, including two mid-investigation reloads, save download, completed reload and mobile verification.
2. Design and implement the next area with an actually new interacting system, such as timed physical hazards or traversal with companion reactions. Avoid another investigation-hub reskin or data wrapper that adds no behavior.
3. Preserve the strict completion audit as the world grows; address state growth without discarding meaningful future distinctions. A 1,010-action local checkpoint measured 79,097 request bytes and restored in about 32 ms, but the hosted 256 KiB envelope limit remains a finite long-session constraint.
4. Continue reviewed waves with cross-area consequences, character counterfactuals, long sessions and authentic feedback. Clarify remaining kit/testimony tradeoffs and the distinction between accepting a council seal and actually granting control. The full completion audit remains outstanding.

Manager owns integration, evidence, publication and acceptance. Luna/max remains the primary development benchmark; corrections and observed timing belong in AGENT_BENCHMARK.md. Inspect actual worktrees, agents and process handles at each continuation rather than inferring running work from this document.

Next-wave work is isolated from production: an engine worker is implementing a validated saturating clock and `resourceAtMost`; a content worker is authoring Blackglass Works with timed routes, patrol pressure, Nessa's assistance and reactions to previous choices. No context copy or new evidence-counter hub is planned. Those branches require manager review, strict traversal checks, cross-area/save witnesses and fresh live evidence before publication. Ordinary return navigation must remain possible without unbounded resource farming.
