# Reedway Recovery — prospective regional activity

Status: activity implementation integrated locally; independent regressions and full acceptance remain in progress. No expansion acceptance or live experience claim. Baseline `139e48a` is the published Blackglass game: 25 scenes, 131 choices, 71 checks and a 169,922-state / 332,402-transition audit.

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

## Final activity contract, before implementation or live dispatch

The ordinary resource `reedway-regulator` begins at zero. There is one recoverable regulator and no repeatable source. Seven durable flags suffice: `reedway-regulator-recovered`, `reedway-salvager-hostile`, `reedway-clinic-powered`, `reedway-ferry-powered`, `reedway-patients-treated`, `reedway-relief-sent` and `reedway-crew-treated`. No survey, visit or duplicate reward flags are needed.

Recovery at the barge always requires recovered=false. `buy-reedway-regulator` spends one supply; `accept-reedway-work-lien` adds one debt; `fit-reedway-regulator-as-canalwright` requires that background and spends one water. These leave Sera cooperative. `force-reedway-regulator` costs no resource but makes Sera hostile, removing her discounted relief transport. Every approach grants one regulator and records recovery. The earlier proposed force action costing more debt than a cooperative lien was rejected as dominated.

`trade-reedway-repair-kit` offers a fifth recovery approach: exchange one remaining Tools for the part, cooperatively. This gives a retained kit a present use; the old council fixture can make that exchange even with no supplies and substantial debt.

`install-reedway-regulator-at-clinic` and `install-reedway-regulator-at-workers` each require the part and neither facility already powered. Each consumes the part once. The clinic gets a permanent working sterilizer and shares two medicine from its usable reserve. The worker landing gets powered heavy transport and shares two supplies from the freight it can now unload. The two structural results remain mutually exclusive; direct patient care and relief deliveries are separate, smaller goals available before or after allocation.

All patient-care options require patients-treated=false. At the annex, `treat-reedway-patients-with-medicine` costs one medicine; `treat-reedway-patients-with-supplies` costs two supplies and requires background-field-medic=false; `triage-reedway-patients-as-medic` costs one supply and requires that training; `order-reedway-clinic-treatment` adds two debt for imported sterile packs. The trained route replaces the generic supply route for field medics. Each treats the patients once, with no reward resource.

All worker relief options require relief-sent=false. Cooperative Sera offers `send-reedway-relief-with-sera` for one supply or `commission-reedway-relief-with-sera` for one debt. Without her help, `haul-reedway-relief-with-porters` costs two supplies or `commission-reedway-relief-with-porters` adds two debt. Each delivers relief once, with no reward. This makes the salvage relationship affect a current choice and keeps zero-supply states playable.

New credit cannot take total Debt above four: the one-debt lien/cooperative commission require Debt <=3; the two-debt clinic order/porter commission require Debt <=2. Show this limit with the relevant offers and location text. Earlier council obligations therefore affect credit availability now. Supplies, kits, medicine, training and direct allocation rewards remain alternatives, and the free seizure plus an installed facility still permits a completed regional ending at any inherited debt. The limit does not erase or clamp existing debt. Root added this rule before implementation acceptance because otherwise new debt would have little consequence within the activity.

Deckhand Milo Fen needs care at the barge. `treat-reedway-deckhand` costs one medicine; `splint-reedway-deckhand-as-medic` requires field-medic training and costs one supply. Both require crew-treated=false, mark the treatment and restore Sera's cooperation. They preserve the historical seizure fact and cannot repeat. A later seizure can damage cooperation again after earlier treatment; the text must distinguish that order of events.

Two completed choices at the commons, `close-reedway-clinic-account` and `close-reedway-ferry-account`, require their respective installed facility. Their receipts claim only that structural result, while conditional scene text records patient, relief and crew outcomes. All old campaign endings remain reachable. No new action changes global Risk, the tide, or old water/Archive/pressure flags. Regulator rewards have immediate spending destinations, and returning to a site must not repeat an already completed request.

## Audit allocation work

Worker source `2cfbce0` replaces copied queue paths with predecessor links, removes a duplicate canonical-state set and precomputes immutable key orders. Review found no change to retained resources/flags, serialized key semantics, congruence comparisons or reverse completion. On the identical Blackglass baseline, old/new diagnostics match every choice/ending witness and all counts: 169,922 states, 332,402 transitions, 162,481 merges, 297,211 congruent successors and 34 ending witnesses. Timings were 30.667 versus 30.055 seconds; this single close pair does not establish a material speed improvement. Artifacts `/tmp/af9-audit-allocation-baseline.json`, `/tmp/af9-audit-allocation-optimized.json`; 71 tests passed in the worker's unchanged-content checkout. Integrated regional content requires its own audit.

## Integrated candidate and first workload measurement

Source `b2aff2b` implements the full activity contract and changed old-hub reactions, bringing the authored game to 29 scenes and 160 choices. The canalwright exchange restores Sera's bilge pump; recovery choices explicitly carry the part back to the commons. Installation text records the reward historically on later visits. Deckhand text distinguishes treatment before a later seizure from care that restores cooperation. Regional ending summaries claim only the installed facility and its structural tradeoff. TypeScript build and validated game start pass; 18 existing Blackglass/clock checks pass.

Independent behavioral regressions are integrated as `f3f47bb` and `6e22e83`. All 10 focused tests pass against the integrated root content, covering inherited outcomes, repeated travel, checkpoint/replay, five recovery approaches, allocation exclusivity, credit boundaries, rewards, services and seizure/treatment order. Log: `/tmp/af9-reedway-regressions-integrated.log`. The first worker test incorrectly expected the generic two-supply route to remain available to a field medic; its temporary source edit is not an accepted fix. The corrected tests preserve the intended training gate and exercise generic care with an untrained two-supply fixture.

The unchanged default audit guard fails on source `b2aff2b`: more than 250,000 canonical future-relevant states, 37.54 seconds wall time and 1,024,484 KiB maximum resident memory. Full coverage is not established. Preserve `/tmp/af9-reedway-b2aff2b-audit-250k.log`; no limit was raised and no expansion was published. A separate implementation is now investigating sound pruning of choices permanently disabled by globally monotone flags, with pruning justifiers retained in the state key. All resources, congruence and reverse-completion requirements remain mandatory. Browser and fresh player acceptance remain pending.
