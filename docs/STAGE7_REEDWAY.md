# Reedway Recovery — prospective regional activity

Status: design and implementation in progress. No expansion acceptance or live experience claim. Baseline `139e48a` is the published Blackglass game: 25 scenes, 131 choices, 71 checks and a 169,922-state / 332,402-transition audit.

## Purpose and scope

Replace the current pattern of optional but sequential chapter continuations with a small region the player can move around freely. The first activity concerns one recoverable regulator and competing uses at Ilyra's clinic and Orin's worker transport. A player from the same inherited water outcome must be able to pursue either use, visit the interested people before committing, and see a changed place when returning. The recovered part and any rewards must have useful destinations in this activity; future promised content is not a current benefit.

Four new scenes are the maximum for this activity: a commons, a salvage site, a clinic annex and a worker landing. They connect to resolved `blackglass-quay` and `lowsail-after-blackglass`. Travel is reversible and free, with no visit counters or resource changes. Preserve all existing completed/departed endings. Do not reopen old preparation, water-resolution or pressure-control scenes through these links.

Recovery requires at least two viable approaches from an identical inherited state, with visible costs and consequences. Existing training or previous relationships should change an actual available approach. Allocation consumes the single regulator and persists; rewards and services must be guarded against repeat farming. Material clinic and worker outcomes must differ, including a consequence outside the salvage site. Earlier water, Archive, pressure and companion history remains true after the side activity.

The abandoned lock-charter/toll proposal is not accepted. Its main reward was passage around a completed loop, and its authorities mostly followed an already selected water outcome. The regulator activity must supply a new decision rather than re-presenting that earlier choice.

## Mechanical and rendered acceptance, before live dispatch

1. Validate authored content and pass existing checks without relaxing engine/save boundaries. Prove one regulator can be recovered, cannot be duplicated, cannot fund both installations, and each reward/service is once-only.
2. Replay at least two competing approaches and allocations from the same prefix; cover useful background and inherited-state counterfactuals. Verify shortage states still permit travel and campaign completion.
3. Traverse repeated regional loops after multiple outcome combinations. All resources, old water/Archive/pressure outcomes and completed service flags must remain stable under travel. Save/restore/replay must preserve the same legal choices and changed revisit text.
4. Run the full authored reachability, balance, congruence and reverse-completion audit. Retain the existing 250,000 workload guard until actual measurements justify an explicit methodological decision. Do not discard meaningful distinctions, sample routes or shrink the intended activity solely to make the old ceiling pass. Report exact source, counts, duration and any failed workload attempts.
5. Verify a complete browser journey that enters the new region, visits both claimants before allocating, returns after an outcome, reloads mid-activity, downloads and restores a save, and renders on mobile. Measure actual request envelopes including escaped checkpoints. Report finite long-session limits separately.

## Prospective natural-play gate

After mechanical/rendered review and a clean source freeze, dispatch three fresh neutral Luna/max games at seeds 1–3 with the unchanged player/interview protocol and 60-turn ceiling. Preserve every attempt, original free and structured interview, settings and exact source; independently verify isolation, integrity and replay before publication.

Require at least two natural regional entries and regulator allocations, all attempts with intact evidence/replay/interviews, median clarity at least 4/5 and no observed blocking defect. Inspect concrete contradictions regardless of ratings. Count which claimants players visited before allocating, which recovery methods they used and whether they actually revisited changed sites; do not infer those experiences from successful endings. Insufficient exposure leaves experience acceptance pending. This is initial region acceptance, not a measured improvement claim, a broad human-enjoyment result or proof of the full world/depth target.

## Ownership

Manager owns the final activity contract, scenario integration, review, evidence, browser checks and publication. Content author owns the new regional module. Independent regressions own their test file after the choice contract is fixed. A separate worker may optimize audit allocations without changing key semantics, witness coverage, congruence or completion requirements. All work remains isolated until integration review.

## First navigation implementation

The manager added `src/content/reedway.ts` with the four named places and ten movement choices. Resolved-only entries leave Lowsail or Blackglass for the commons. The three sites return to that commons, and the commons returns to either old hub. All movement effects are `goTo` only. The module's recovery/allocation/service behavior is still incomplete; this scaffold will not be published as the finished activity.

TypeScript build passes. A replayed shared-water/public-Archive prefix returned to Lowsail, traversed all three sites and both hubs three times, saved/restored with identical state hash and closed the existing clean Blackglass ending at revision 54. Resources and flags were unchanged across all 30 travel actions. Independent multi-origin regressions and the full integrated audit remain required.
