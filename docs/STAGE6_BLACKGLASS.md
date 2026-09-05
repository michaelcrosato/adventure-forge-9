# Blackglass Works — timed traversal wave

Status: the first frozen candidate passes its mechanical checks and all three fresh games completed, but publication is held for the unclear-risk feedback below. A targeted supply/forecast correction and fresh verification are in progress. The full requested world breadth and depth remain the completion target.

The prior turn delivered the Archive expansion and verified its public deployment. This wave should add a different interaction: acting changes a tide/patrol window, routes carry different timing and risk costs, and a companion's willingness to help follows earlier choices. A new wrapper around ordinary choices, another evidence counter, or duplicated water/Archive context would not add that behavior.

## Engine contract

Keep existing GameState and player operations. Add optional validated scenario clock declarations `{ id, resource, max }`, with an existing initial resource in bounds. Add `resourceAtMost` conditions and an `advanceClock` effect with a positive safe-integer delta that saturates at the declared maximum. A clock resource may not be written through ordinary `setResource` or `adjustResource` effects. References, unique clock/resource ownership, bounds, effect sequencing and unknown properties must fail validation when invalid.

The clock is part of the existing resource map and therefore participates in state hashes, saves and replay. Authored observations expose the tide value and its practical effect without hidden flags or implementation metadata. No duplicate campaign-context object or relationship map is needed for this first system; meaningful aid and trust changes may use existing flags, with their limits stated honestly.

Future-read analysis must explicitly recognize the new closed vocabulary and continue retaining all resources. No unknown-effect fallback, completion-check relaxation or silent state-limit increase is authorized. The prior published content is 76,117 canonical states under its 100,000-state audit bound. Blackglass exceeded that workload ceiling; the explicit measured adjustment below supersedes the old ceiling for this wave. Counts from a previous snapshot cannot establish new content's completion paths.

## Area contract

Seven scenes: Blackglass Quay, Reedway Crossing, Council Watchpost, Worker Barracks, Conduit Gallery, Pressure Control and Lowsail Return. Nessa Quill wants the shared works protected; Orin Pell wants workers and displaced families safe; Captain Varo Dey wants the checkpoint and council authority respected. Reach the pressure controls before the surge, make a consequential control decision, revisit the Quay with changed reactions, and return to Lowsail.

Keep `close-archive-case` as a valid terminal choice. A new opt-in continuation must apply its exact closure effects before entering Blackglass. Preserve all earlier chapter endings and old witnesses.

At least three distinct approaches:

- Open haul reaches the watched post, advances tide and incurs attention/risk.
- A conduit route uses an available low-tide/low-risk window and an inherited Archive posture to bypass the checkpoint.
- Nessa/workers can provide an assisted route and a safer control action when earned; coercing Mara affects Nessa's willingness to participate. Repairing trust needs a real bounded cost.

Shared water, council control, evacuation and public/sealed/provisional Archive outcomes must change legal approaches or consequences. Timing and risk must change an actual later choice and return result, not just cosmetic counters. Clock saturation cannot turn repeated navigation into an unbounded resource farm. Ordinary navigation remains possible; one-time costs and resolutions need explicit guards. A missed safe window must retain a credible costly resolution rather than strand the campaign.

## Prospective acceptance

Declare these requirements before new live players:

1. Existing checks pass. New tests prove clock validation/bounds, timing-gated choices, meaningful route counterfactuals, companion assistance/refusal, and save/restore/replay parity. At least three inherited water/Archive witness paths exercise the new chapter with different approaches/results.
2. Full traversal establishes every authored scene/choice is reachable, balances and revisions remain valid, and every unfinished state has a completed path. Report the exact candidate, state/transition counts and timing. Do not infer coverage from a previous commit or just the presence of an exit choice.
3. Measure the longest authored witness's actual `/api/choose` JSON envelope, including the checkpoint string and escaping, against the 256 KiB request limit. Verify a real handler request and a mid-area reload. Repeated navigation and world-scale save capacity remain separate limits.
4. Browser and terminal share the same visible rules. Verify a complete cross-area browser journey, the hazard/timing choices, a mid-area resume, ending receipt, save download/reload and mobile layout. Inspect the actual rendered result.
5. Freeze the source and run three fresh neutral Luna/max subscription players at seeds 1–3 with the existing gameplay/interview protocol. Preserve every attempt and original response. Require all attempts to have intact evidence/replay and complete interviews, at least two natural Blackglass entries and control encounters, median clarity at least 4/5, and no observed blocking defect. Investigate concrete contradictions and confusing consequences even if ratings pass. Insufficient exposure leaves experience acceptance pending; mechanical traces do not substitute for it.

This is a first timed-traversal chapter. It does not establish combat depth, a full companion system, world-scale content or general player enjoyment. Report implemented, mechanically verified, naturally experienced and supported-improvement claims separately.

## Ownership and evidence

- Engine branch/worktree: `bounded-clocks`, `/tmp/af9-bounded-clocks`; engine/types/validation/audit and focused tests.
- Content branch/worktree: `blackglass-content`, `/tmp/af9-blackglass-content`; authored area and scenario integration.
- Independent read-only reviewer: clock bounds, adversarial input, trust boundary and replay/audit implications.
- Manager: integration, narrative/causal review, full audit, live dispatch/evidence, browser verification and publication.

No current clock/content candidate has expansion acceptance.

## Engine integration and review

Clock source `a8c5db6` was reviewed and integrated as `c5382f3`, with independent membership regressions `3c704ef` integrated as `5f9f739`. The broad mutable-scenario engine factory was removed before integration. The existing private-state trust boundary and build-bound replay remain in place. Resources, required fields, flags and fact-label membership use own-property checks; an inherited `constructor` property cannot supply a missing resource or fact label.

The integrated source passed all 53 checks in about 13.7 seconds, including the unchanged 76,117-state / 129,874-transition campaign audit. Log: `/tmp/af9-clocks-integrated-verify.log`. Follow-up test commit `339bf1c`, integrated as `9b9958f`, adds duplicate IDs, invalid numeric bounds/deltas, overflow-safe saturation near `MAX_SAFE_INTEGER`, and rejection of ordinary clock-resource writes anywhere in an effect sequence. All eight focused clock/membership tests passed after that integration. The shipped scenario still has no clock declaration; these checks do not yet establish gameplay clock/save traversal in Blackglass.

Content review required meaningful timing versus risk tradeoffs and an actual benefit from sealed/provisional Archive cover. It also identified text claiming a safe pressure setting after its window, free Nessa aid described as paid trust repair, and a council obligation described without the player taking that favor. The integration below corrects those findings and restores ordinary return navigation. Explicit clean/scarred pressure results are separate from overall patrol risk. No production push has included this wave.

## Integrated area and focused evidence

Content `2e423e1` was integrated as `6cb948a`. Manager corrections `8b509c2` restore compile-time data checking, make running faster than waiting, explain the tide deadline and correct return claims. Follow-up `e818153` warns workers when the safe window is already missed and keeps unresolved coercion visible after the pressure repair. Pressure damage has its own persistent result; overall attention can produce a watched, undamaged return. Late Nessa aid reduces the attention cost of an emergency release but cannot undo pressure damage.

The area brings the authored game to 25 scenes and 130 choices, including exits and repeated navigation, with two new named inhabitants and returning Nessa. Tests through `f0d96f9` cover three inherited origins, public/sealed/provisional cover at the same risk threshold, council favor versus running, waiting versus running, refusal after coercion, paid aid, exhausted supplies, and early/late companion help. Five clock traversal tests prove inclusive gates, repeated return navigation at the cap without repeat road costs, save/replay parity and rejection of an over-maximum tide even after correctly rehashing the save. The 18 focused clock/consequence/membership checks pass; that does not by itself establish full traversal acceptance.

On `b8d5421`, three actual stateless HTTP journeys completed at 24 shared-water actions, 23 council actions and 26 evacuation actions. Every response matched the engine projection and checkpoint hash; pressure-room observation resumed from a checkpoint and terminal choices matched the web projection. Maximum actual choose-request envelopes were 3,558 / 3,452 / 3,811 bytes, including the escaped checkpoint string, session ID, choice ID and expected revision. Report `/tmp/af9-blackglass-http-report.json`; script `/tmp/af9-blackglass-http-check.mts`. These are measured witnesses, not world-scale save capacity.

The 26-action evacuation route also passed in the actual browser: repeated travel delayed arrival, reload resumed the barracks at revision 22 and pressure control at revision 23, only the late emergency choices were available, and Nessa's release produced a scarred completed return. Save download and completed reload passed. At a 390-pixel viewport the document was 375 pixels wide, with no browser errors. Screenshots `/tmp/af9-blackglass-pressure.png` and `/tmp/af9-blackglass-mobile.png` were inspected; save `/tmp/af9-blackglass-completed.save`; log `/tmp/af9-blackglass-browser-check.log`. The later `e818153` wording correction has focused mechanical coverage but needs a final rendered check before the live freeze.

## Explicit audit workload adjustment, before live acceptance

The first 100,000-state diagnostic failed as a workload limit, preserved in `/tmp/af9-blackglass-draft-audit.log`. It is not counted as a pass. Independent unrestricted diagnostics on the integrated content agree on **221,614 states, 332,382 transitions, 110,769 merges and 297,171 congruent successor checks**. All 25 scenes and 130 choices are reachable, with no dead ends or unfinished states without a completed path. The manager diagnostic at `35c0643` took about 37.1 seconds and is preserved in `/tmp/af9-blackglass-full-diagnostic.json` and `.log`. Its longest first-discovered choice witness is 21 actions; these shortest witnesses do not bound deliberate detours or long sessions.

Overwrite-aware backward flag liveness did not reduce this graph. A separate diagnostic retaining only conditional scene-text flag reads after termination reduced it to **169,922 states**, with the same transitions and congruence successor checks. This reduction is valid because terminal observations have no legal choices or future actions; terminal text, every resource value, ending kind and ending summary must remain distinguished. Playing-state analysis is unchanged.

Manager decision: implement and test that terminal reduction, then raise the production workload ceiling explicitly from **100,000 to 250,000** states. This is a bounded runtime guard adjustment justified by the complete measured graph, rather than an exemption from reachability, resource, congruence or completed-path requirements. No authored routes will be removed to fit the old ceiling. Preserve an explicit low-limit failure regression, record the final snapshot's actual counts and runtime, and run normal `npm run verify` before acceptance. The new ceiling does not prove capacity for the final requested world; further waves still require measured scaling work. No fresh live runs have started under this amendment.

Terminal reduction `3e09166` was reviewed and integrated as `dc8c5ca`. The normal manager verification with the explicit 250,000 limit passes **69/69 tests** in about **30.8 seconds**, with the full traversal test taking **30.56 seconds**. Exact counts: **169,922 states; 332,382 transitions; 162,461 merged visits; 297,171 congruent successor checks; no unreachable scenes/choices, dead ends or unfinished states without a completed path; maximum 8 choices; representative projection maximum 414 words**. Log `/tmp/af9-blackglass-integrated-verify.log`. The low-limit regression still rejects an incomplete traversal. The initial 100,000 failure remains a retained failed diagnostic.

## Final mechanical freeze checks

At `98b8dc3`, build `af9-340db03e8b00a55ba0b932e4`, the final wording loaded through actual save uploads and rendered correctly: the Tide 2 barracks warns that the next crossing misses the surge, and the repaired Quay retains Nessa's distance when coercion was never addressed. Inspected `/tmp/af9-blackglass-final-barracks.png` and `/tmp/af9-blackglass-final-quay.png`; no browser errors. One automation text read used a nonexistent `#scene-text` selector; inspection identified the correct `#story-text`, and the retry passed. This was a selector error, not an application failure.

All 130 first-discovered authored choice witnesses were replayed to measure their actual request envelopes. The longest witness is 21 actions and its last request is 3,197 bytes; the largest request among all witnesses is 3,235 bytes. Both longest/largest candidates passed an actual `/api/choose` request with checkpoint/replay parity. Artifact `/tmp/af9-blackglass-witness-envelope.json`. Longer deliberate detours remain possible, as the separate 26-action browser trace demonstrates; no finite maximum campaign save length is claimed.

Independent review found the terminal reduction sound under the current vocabulary. The traversal covers authored choices, not the separate exported `end()` operation; direct departures retain focused engine tests rather than exhaustive graph witnesses. Facts, journal, receipt revision and receipt hash remain representative projection fields, so no exact full-observation-equivalence claim is made.

## First fresh batch — retained, publication held

Frozen commit **08156a1**, trusted checkout `/tmp/af9-stage6-verified`, source identity `2c408cdbae181f8bd1a9b8418b7c48a9962e875c635ad5d41e075943676a3eb7`, build `af9-340db03e8b00a55ba0b932e4`. All used fresh neutral `gpt-5.6-luna` / `max` conversations, seeds 1–3, unchanged prompts and a 60-turn ceiling. All three completed the full game and original same-conversation interviews. Independent setup, source, integrity and replay checks passed without executing archived source. The validator's `liveAccepted` field denotes pipeline validity, not manager product acceptance.

| Seed / run suffix | Actions / elapsed | Actual Blackglass route | Clarity / enjoyment |
| --- | --- | --- | --- |
| 1 / `03-54-34-498Z-60cec881` | 24 / 123.978 s | Own kit + free canal; public technical verdict; gallery at Risk 2 / Supplies 1; rush raises Risk to 3; forced scarred repair | 4 / 4 |
| 2 / `03-54-34-496Z-f8d63148` | 26 / 137.418 s | Own kit + paid scouts; protected Mara and public technical verdict; gallery at Risk 1; quiet marks and clean repair | 5 / 5 |
| 3 / `03-54-34-497Z-557f1970` | 24 / 129.270 s | Same dangerous approach/result as seed 1 | 4 / 5 |

All run IDs begin `2026-09-05T`. Evidence is under `/home/micha/.local/share/adventure-forge-9/runs/`; exports `stage6-first-seed{1,2,3}-<full-run-id>.tar.gz` and SHA-256 sidecars are under `.../exports/`. Original free and structured responses remain preserved. All three entered Blackglass and encountered the controls, reported no observed defect and wanted another run. Median clarity 4/5 meets the numerical gate. All still chose canalwright/shared water/public technical publication; other origins remain mechanically covered.

Two players reported unclear Blackglass consequences. Seed 1's original structured response includes “Some resource and tide consequences were not fully predictable.” Seed 3 reported that the optional area's risks and likely endpoint were unclear. Both named the pressure scar as their worst moment. Their traces reveal a forecast gap: they reached pressure control at **Tide 2**, but the gallery rush crossed the separate **Risk 3** threshold. Holding the valve then advanced Tide to 3. They had retained one supply through the earlier risky road choice but could not use it for a quiet crossing. The entry explained tide without the attention threshold. The scar was mechanically correct; the available information and alternatives were insufficiently clear. Seed 1 also repeated the earlier uncertainty about Mara's role after technical proof, a separate known presentation issue.

## Prospective feedback correction

Before any new runs, declare this correction: explain the clean-setting tide/risk requirements before committing, warn beside the public patrol rush that Risk 3 forces a hurried repair unless Nessa helps, and add `brace-the-conduit-ledge`. It spends one retained supply on rope/canvas, advances tide by one and adds no risk. It preserves the public Archive verdict and existing risky/quiet options. It does not erase accumulated risk or make late pressure damage disappear. Supplies must exist, the tide window must remain open, and no repeat resource farm may result.

Manager regressions ran against the first candidate: 8/9 consequence cases passed and the new supply-route case failed specifically because that choice was unavailable. Log `/tmp/af9-blackglass-brace-baseline-test.log`; the exhausted-supply completion case already passed. After implementation require the full audit and existing invariants, these counterfactual tests, and rendered choice/ending verification before a new source freeze.

Run three fresh neutral games at seeds 1–3 with the same model/settings/protocol. Require all attempts to retain valid evidence/replay/interviews, at least two natural Blackglass/control entries, median clarity at least 4 and no blocking defect; inspect contradictions regardless of ratings. Report the number reaching the public gallery at Risk 2 with a spare supply. Only claim supported improvement at the observed problem if at least two naturally encounter that situation and none report the corresponding unclear-risk consequence. Lesser exposure limits the correction to its mechanical/rendered proof and whatever natural paths were actually tested. Preserve this first batch and every further attempt; do not replace its negative reports with the next ratings.

## Corrected candidate verification and freeze

Candidate **af5e34075ab99ca25e4f9bd37c4dd80eacdfac7f** adds the supply-funded ledge crossing and explicit risk/tide forecasts at the Quay, gallery and patrol-rush choice. All **71 tests** pass, including the two manager consequence regressions. The audit covers **169,922 states, 332,402 transitions, 162,481 merged visits and 297,211 congruent successors**, with all 25 scenes and 131 choices reachable, no dead ends and no unfinished state lacking a completed path. The audit took about 30.6 seconds; complete suite about 30.9 seconds. Log `/tmp/af9-stage6-brace-verify.log`.

A 24-action browser journey repeats the first batch's public-gallery situation at Risk 2 / Supplies 1. Bracing spends that supply, reaches pressure control at Risk 2 / Tide 2 and permits an undamaged completed return. Reloads at the gallery, pressure room and completed ending, downloaded save, visible forecasts and 390-pixel mobile layout passed; document width was 375 pixels and no browser errors were recorded. Screenshots `/tmp/af9-brace-gallery-mobile.png` and `/tmp/af9-brace-completed-mobile.png` were inspected. Save `/tmp/af9-brace-completed.save`; log `/tmp/af9-brace-browser-check.log`. The actual browser script completed successfully and its browser/server handles were closed.

The new brace's 21-action witness was also sent through the actual stateless handler: its complete choose-request JSON was 3,178 bytes, returned HTTP 200 and restored to the exact expected pressure-room state/hash. Report `/tmp/af9-brace-envelope.json`; script `/tmp/af9-brace-envelope.mts`. Together with the original 130 measured authored witnesses, this covers the added choice's request envelope; repeated detours remain a separate capacity limit.

The new trusted checkout `/tmp/af9-stage6-brace-verified` is clean at that exact commit with dependencies installed. Source identity `8b00de8ad6f0c0117dfa570fa8a08993fda65b2c4f6d91a1895d75eb0ddaa2b1`; rule build `af9-fa384ff4c3b27398de7f5539`. Three fresh neutral games at seeds 1–3 used the unchanged Luna/max protocol and 60-turn ceiling. The local Vercel production build also passed all 71 checks on this behavior source; log `/tmp/af9-stage6-brace-vercel-build.log`.

## Corrected batch — every attempt retained

| Seed / run suffix | Actions / elapsed | Natural path | Clarity / enjoyment |
| --- | --- | --- | --- |
| 1 / `04-14-03-157Z-08fe984d` | 26 / 154.671 s | Borrowed kit, free canal, protected Mara and public technical verdict; gallery Risk 1 / Supplies 0; quiet marks and clean pressure setting | 4 / 4 |
| 2 / `04-14-03-157Z-db5876c2` | 18 / 96.815 s | Own kit, paid scouts and public technical verdict; voluntarily completed at the Archive ending | 5 / 5 |
| 3 / `04-14-03-166Z-29cf3df2` | 25 / 132.119 s | Own kit, paid scouts, protected Mara and public technical verdict; gallery Risk 1 / Supplies 0; quiet marks and clean pressure setting | 4 / 5 |

All IDs begin `2026-09-05T`. All three completed original free and structured interviews in their respective gameplay conversation; all three reported no observed defect and willingness to replay. Median clarity is 4/5; median enjoyment 5/5. Blackglass/control exposure is **2/3**; the observed-problem situation at public-gallery Risk 2 with a spare supply is **0/3**, and nobody selected the new brace. All again chose canalwright/shared water/public technical publication. These observations do not establish experience coverage for other origins, the brace or late/emergency control choices.

Seed 1 still reported that some resource tradeoffs and the optional continuation were slightly unclear. Seed 3 described dense resource/timing descriptions, especially Archive evidence and Blackglass tide risks. Neither reported an unexpected pressure scar; both took an existing quiet route at Risk 1 and correctly received a clean result. That absence cannot be attributed to the correction because neither encountered the original problem state. Resource forecasting and continuation clarity remain open presentation concerns.

Original evidence lives under `/home/micha/.local/share/adventure-forge-9/runs/`; all three were exported from the matching trusted checkout to `.../exports/stage6-brace-seed{1,2,3}-<full-run-id>.tar.gz`. Integrity and deterministic replay passed for all exports, and all three SHA-256 sidecars checked successfully. The first batch remains preserved alongside this batch. All six Blackglass-era attempts are closed; no attempt was discarded or rerun because of its ratings or route.

Independent review verified all three recorded runs against the clean trusted checkout, with exact source/build match and `sourceExecution: "none"`. Setup retained ChatGPT subscription auth, Luna/max, Codex CLI 0.153.3, unchanged neutral prompts and verified isolation: no workspace roots, environments, dynamic tools, shell, patch or search access. Each distinct gameplay thread retained both original interviews. No provider error, reroute or forbidden tool call occurred. The reviewer independently confirmed the path/exposure counts, original clarity concerns and every export checksum.

Manager decision: accept this as the first bounded timed-traversal chapter under the declared basic expansion gate. Mechanical and rendered evidence establishes the brace's useful cost and the corrected forecasts. Natural play supports two completed quiet-route experiences, not the brace correction's improvement. No measured improvement claim passes its separate exposure gate. Continue addressing resource/timing density and optional-continuation clarity; do not rerun until a favorable set of ratings appears. Persistent regional travel and the full world/depth goal remain outstanding.
