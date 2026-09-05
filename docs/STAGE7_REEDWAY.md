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

## Browser and request verification

The local stateless handler completed a 44-action browser journey on game build `af9-855c13da0d8a21e476626c2a`: shared water and public Archive record, settled Blackglass, both claimant visits before recovery, canalwright barter, clinic installation, patient care, deckhand care, relief commission, and changed returns to both old hubs. Reloads preserved the recovered part and completed services. A downloaded mid-activity save was uploaded into a fresh browser session and restored exactly. The completed save and ending also survived reload. Resources and flags remained identical across the final four hub travel actions.

Artifacts: `/tmp/af9-reedway-browser-check.mjs`, `/tmp/af9-reedway-browser-check.log`, `/tmp/af9-reedway-browser-finish.log`, `/tmp/af9-reedway-mid.save`, `/tmp/af9-reedway-completed.save`. The initial script reached the completed game but its case-sensitive status assertion rejected the browser's CSS-transformed `COMPLETED`; the harness was corrected to ignore case and the remaining download/reload/layout checks passed in that same session. Preserve both logs. This was a harness mismatch, not a game completion failure.

Manager inspected the start, barge, changed commons and completed mobile screenshots. A clipped resource name found during this check now wraps onto a second line; resource values remain aligned within each row. After restarting the handler, the same completed checkpoint resumed with no browser errors. Screenshots `/tmp/af9-reedway-resources-mobile.png` and `/tmp/af9-reedway-resources-small.png` show the full label at 390 and 320 pixel viewports; measured document widths were 375 and 305 pixels with no clipped resource labels. Browser and local server were closed after verification. This presentation change does not alter the game build identity.

Independent HTTP witnesses restored valid shared-water and evacuation prefixes, then each executed eight regional actions to a completed facility ending at revision 30. Every choose response and checkpoint matched engine replay. All 20 requests succeeded; maximum actual request envelopes were 4,636 bytes (clinic) and 4,660 bytes (ferry), including JSON escaping. Raw response artifacts and the probe are `/tmp/af9-reedway-http-probe.json` and `/tmp/af9-reedway-http-probe.mts`. A separate request for the browser journey's final action at revision 44 measured 5,608 bytes and returned the exact expected observation/checkpoint with HTTP 200 (`/tmp/af9-reedway-44-envelope.json`). These finite examples do not establish whole-world checkpoint capacity.

TypeScript build and all 80 then-existing non-audit checks passed (`/tmp/af9-reedway-nonaudit-tests.log`). Follow-up regression commit `0dfda47` plus manager coverage of the alternate serviced ferry result brings the focused Reedway suite to 12 passing tests (`/tmp/af9-reedway-revisit-regressions.log`). Both fully serviced allocations preserve all resources, flags and facts across repeated site/hub loops. The exact Debt 2 hostile porter offer reaches Debt 4; Debt 3 remains unavailable. Full audit and fresh blind players remain required before acceptance or publication.

## Phase reduction and unresolved audit size

The independently reviewed monotone phase reduction is integrated as `c9655d1`. It retains exact resource values and all pruning justifiers, separately checks both collision successor keys, and excludes resettable flags. Manager build and all 85 non-audit tests pass (`/tmp/af9-reedway-monotone-nonaudit.log`). The browser evidence above remains tied to its recorded earlier game build; the audit-source change also changes save identity even though gameplay content is unchanged.

On worker source `b49fb6d`, the 250,000 and 300,000 diagnostics both fail. One explicitly authorized larger diagnostic, capped at 1,000,000 states and a 4,096 MiB Node heap, also fails after 3:31.15 with 3,626,260 KiB maximum RSS. Preserve `/tmp/af9-audit-monotone-1m.log` alongside both smaller failures. No exhaustive result, full witness maps, live player batch or region publication is claimed. Further verification work is now investigating conserved symbolic parameters rather than increasing the default guard again; the prospective obligations are in `AUDIT_SCALING.md`.

Preparatory analysis and exact binding/text/frame helpers are integrated as `12a4ae2` and `8ada86d` under `CONSERVED_PARAMETER_AUDIT.md`. Build and 96 non-audit tests pass. The active audit still uses concrete resource values; compiled analysis, independent semantic review, family-audit integration and full validation remain the next work. No new region playtest has been dispatched.

## Family-audit implementation and evidence

The compiled analyzer, opt-in family traversal and isolated real-engine tests
are now integrated through `d351b52`; `e9d93d4` removes globally unread flag
markers while preserving every future reader and pruning justifier. The
refined influence/projection/family suite passes 22 tests. Independent
historical comparisons preserve all 131 Blackglass choices, 34 endings,
replayed hashes/projections and completion results; the refined method uses
27,304 families on that earlier campaign.

The initial full Reedway family attempt exceeded 250,000 families after
4:55.67 (1,051,244 KiB). Its failure is preserved. A separate size-only probe
finished at 260,622 families; the unread-marker refinement reduces this to
243,426 families / 703,812 transitions, within the unchanged family guard.
That probe omits safety, congruence, witness replay and reverse completion,
so it does not approve the expansion. Complete current checks are running
separately. Exact contracts, limitations, source identities and artifacts are
in `CONSERVED_PARAMETER_AUDIT.md`. No new blind player batch or publication
has occurred.

## Mechanical/rendered gates passed; fresh players dispatched

The full refined audit passes at 243,426 families and 703,812 transitions,
with all 29 scenes, 160 choices and 36 endings reachable, no dead ends and no
unfinished family lacking a completed route. All choice witnesses replay.
The release test adopts the new representation after independent historical
comparisons and real-engine adversarial tests; the 250,000-family guard and
prior semantic assertions remain. Complete `npm run verify` on `998a214`
passes all 108 tests (`/tmp/af9-family-release-verify.log`). Exact proof
limits, failed attempts and results remain in `CONSERVED_PARAMETER_AUDIT.md`.

The same source and game build `af9-55d07242701a5613af8d0919` complete a fresh
44-action stateless browser journey: both claimants visited before recovery,
clinic installation, patient/deckhand/relief services, changed returns to
both hubs, mid-activity download/new-session/upload restoration and completed
save/reload. Mobile screenshots were inspected; document width is 375 within
a 390-pixel viewport, all ten resource labels fit and browser errors are
empty. The last actual choose request is 5,608 bytes, returns HTTP 200 and
matches both the exact checkpoint and public observation.

Artifacts: `/tmp/af9-reedway-final-browser.{mjs,log}`,
`/tmp/af9-reedway-final-{start,barge-mobile,commons-mobile,completed-mobile}.png`,
`/tmp/af9-reedway-final-{mid,completed}.save` and
`/tmp/af9-reedway-final-44-envelope.{mts,json}`. Browser and local handler
were closed after verification.

A clean worktree at `/tmp/af9-stage7-verified` freezes commit
`998a21488e603d3b96d31d32e1fe1dff6b19694c`; `npm ci` and build pass. Source
identity is `fca7534ba21c366cdd0c67c316d29ba352f2308d2aea4ccac53c69a5a60af73c`.
The source runner uses the browser-tested build above; the separately
identified compiled build is `af9-0cbeabaff7dd948611fc299f`. Three neutral
Luna/max games at seeds 1–3 and the unchanged 60-turn ceiling have now been
dispatched under `/home/micha/.local/share/adventure-forge-9/runs-stage7-998a214`.
No outcome, interview, acceptance or publication is inferred from dispatch.

## First fresh batch: exposure gate not met

All three attempts at `998a214` completed normally with original interviews,
independent integrity/source/replay verification and checked exports. Each
used the same neutral Luna/max protocol and one isolated conversation for
gameplay and both interview phases. `liveAccepted` in the validator means
protocol evidence validity; it does not mean this regional gate passed.

| Seed / run suffix | Actions / ending | Clarity / enjoyment | Reedway entry / allocation |
| --- | --- | --- | --- |
| 1 / `4b81541d` | 19 / Archive completed | 4 / 4 | No / no |
| 2 / `ece4a9ce` | 38 / clinic completed | 4 / 4 | Yes / clinic |
| 3 / `2f16f93b` | 25 / Blackglass completed | 4 / 5 | No / no |

Run directories are under
`/home/micha/.local/share/adventure-forge-9/runs-stage7-998a214/`:
`2026-09-05T06-35-21-526Z-4b81541d`,
`2026-09-05T06-35-21-527Z-ece4a9ce` and
`2026-09-05T06-35-21-540Z-2f16f93b`.

Natural regional entries and allocations are **1/3**, below the declared
**2/3** requirement. Median clarity/enjoyment are both four, no player
reported a defect, and all three said they would play again. The region
remains unaccepted and unpublished because exposure was insufficient.
Earlier completed endings are valid player choices, not blocking defects.

The single entrant visited both claimants before allocation, recovered the
regulator by canalwright barter, powered the clinic, treated patients and
commissioned Sera's relief on credit. The worker landing was revisited after
clinic installation and the commons reflected completed services. This
player did not return to either old hub after allocation or treat Milo.
Neither non-entrant supplies side-activity experience; Blackglass's older
`reedway-crossing` scene is not an entry to the new Reedway activity.

The original interviews identify a concrete clarity issue. Seed 2 was unsure
whether multiple locations could be visited and whether Blackglass/Reedway
were part of the main ending or extra content. Seed 3 was unsure whether the
Blackglass continuation was optional. Seed 1 described the water/Archive
arc as its goal and expressed interest in Blackglass in another run. No
interview establishes that unclear continuation caused either early ending.
Seed 3 also reported uncertainty about which Nessa assistance counts for
Blackglass; that is a separate unresolved wording issue.

Verified exports are in
`/home/micha/.local/share/adventure-forge-9/exports/`:
`stage7-998a214-4b81541d.tar.gz`,
`stage7-998a214-2026-09-05T06-35-21-527Z-ece4a9ce.tar.gz` and
`stage7-998a214-2026-09-05T06-35-21-540Z-2f16f93b.tar.gz`, each with a checked
`.sha256` sidecar. All original runs, including non-entrants, remain evidence.

## Prospective continuation clarification

Before changing the candidate or dispatching another player, the manager
selects a focused presentation correction: distinguish finishing the entire
journey from continuing it, explain the optional Blackglass continuation
where the Archive closes, and name Reedway's outstanding clinic/ferry task
at the resolved hubs before the player enters. Preserve all choices, order,
conditions, costs, rewards, free movement and existing completed endings.
Use conditionally appropriate text so repaired sites are not described as
still awaiting the same repair. Do not add artificial urgency or obligations.
This improves actual wayfinding toward the requested explorable world; it
does not establish persistent quest/session architecture or the full target.

After mechanical and rendered checks and another clean source freeze, run
exactly three new neutral Luna/max games at seeds 1–3, retaining the same
60-turn ceiling, instructions and original interview questions. Keep the
entire first batch and distinguish the two sources. Initial region
acceptance still requires at least 2/3 natural entries and allocations,
intact original evidence/replay/interviews, median clarity >=4 and no blocking
defect. Insufficient exposure leaves acceptance pending again; it does not
authorize dropping the first batch or reclassifying earlier endings.

A separate, narrow clarity claim would require fewer volunteered
end/continue/optional-chapter confusion reports than the first batch's 2/3.
Three model players per source permit only a limited observation, not a
broad human-experience or causal claim. Region acceptance and support for a
clarity improvement must be reported separately. The Nessa-assistance issue
is outside this focused correction.
