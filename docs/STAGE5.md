# Lantern Archive — first connected-area expansion

Status: the repaired expansion meets its declared mechanical, browser and initial live-play gates; publication is being finalized. The full world-scale goal remains outstanding.

The candidate adds one investigation area with seven scenes and four named inhabitants: archivist Sera Vale wants a defensible record; porter Jalen Rook wants amnesty; copyist Mara Venn wants her brother protected; Prefect Oren Vask wants to preserve his authority. Three evidence tracks lead to a hearing and a changed return to Lowsail. The complete game now has 18 authored scenes and 91 choices including exits and navigation; these are authored counts, not a claim of world-scale depth.

Optional canalwright, field-medic and oathkeeper backgrounds each change a mechanical approach in Lowsail/Red Sluice and the Archive. The existing small-game endings remain available. Choosing an Archive continuation first pays the corresponding original closure's resources and obligations. Shared water supplies a maintenance record and witness trust; evacuation supplies an emergency records request and shelter; council rule opens official records but causes Mara to refuse an informal deposition. Compelling her adds debt and leaves a lasting hostile reaction.

## Review corrections

Original candidate `d1cd95c` was integrated as `21bb6fe`. Its eight focused tests and TypeScript check passed, but the existing traversal audit exceeded 10,000 states. An independent expanded crawl of that exact candidate reported 713,703 semantic states and 168 playing states with no path to a completed ending. An earlier zero-failure report concerned the different `2179a18` snapshot and cannot establish acceptance of this candidate.

The stranded path involved an oathkeeper who left the ledger room, then protected a silent witness. With no physical council seal and a one-time search already spent, the player could never obtain the second evidence item needed for a hearing. Root correction `756b295` adds a return to the previously discovered ledger with no repeated search cost. It also removes false references to Nessa's ownership/debt when using the player's own kit, distinguishes Tovan's local mark from Vask's counterseal, explains what each evidence item proves, and replaces the incoherent act of spending debt with an actual new obligation for coercing Mara.

Ordinary hub navigation can repeat without changing resources or evidence. That is intentional navigation, not evidence farming. Histories still grow with actions; capacity for long sessions remains a separate requirement. The full traversal must preserve reachability, valid balances, immutable inputs, revisions and completed-path checks. Any abstraction must be sound for the closed condition/effect vocabulary and must label measurements made from representative projections honestly.

## Prospective acceptance and fresh-play protocol

Declared before new live players:

1. All existing checks pass, including original outcome witnesses, the complete mechanical reachability audit, focused regression for the stranded oathkeeper, and cross-area save/replay and background counterfactuals. Review any unreachable choice or unfinished state with no completed path as a defect.
2. A browser run completes a cross-area journey through the stateless hosted handler, including a mid-investigation reload, save download, completed reload, and mobile layout check.
3. Freeze a clean candidate and run three fresh `gpt-5.6-luna` / `max` subscription players with seeds 1, 2 and 3, identical neutral gameplay and interview instructions, and the existing 60-turn technical ceiling. Supply no background preference, route, solution or acceptance target. Preserve every attempted run and original same-conversation interviews outside the repository.
4. Require technical integrity, replay and complete interviews for all three attempts; at least two must voluntarily enter the Archive for any cross-area experience acceptance. Require median clarity of at least 4/5 across the three and no observed blocking defect. Investigate concrete contradictions or misleading consequences even if ratings pass. Insufficient natural exposure means experience acceptance remains pending; mechanical witnesses do not replace it.

This is an initial expansion check, not a controlled improvement comparison. Report actual paths, background exposure, continuation and all negative feedback. Do not infer unplayed routes or general human enjoyment from these three model players. A material correction requires a new frozen build and new relevant feedback rather than relabeling old runs.

## Evidence

On content correction `756b295`, the local browser served by the stateless Vercel handler completed the exact stranded-route regression in 22 actions. A reload after `keep-mara-hidden` resumed the Archive hall with 15 journal entries. Returning to Jalen, obtaining the ledger and counterseal, negotiating the provisional record, and closing the case produced a completed receipt with revision/journal count 22. Save download and completed reload passed. At a 390-pixel viewport, the document width was 375 pixels; no browser errors were reported. Screenshots were inspected at `/tmp/af9-lantern-initial.png`, `/tmp/af9-lantern-hall.png` and `/tmp/af9-lantern-mobile.png`. The downloaded checkpoint is `/tmp/af9-lantern-completed.save`. These are local mechanical/browser checks, not blind-player feedback or a production deployment of the expansion.

A local capacity measurement on the same source repeatedly visited and left the seal workroom. Checkpoints at revisions 110, 510 and 1,010 restored to identical state hashes. Serialized request sizes were 9,325, 40,325 and 79,097 bytes; restore times were approximately 1.84, 10.44 and 31.95 ms in this run. This tests repeated navigation, not distinct authored encounters or hosted latency. The handler's 256 KiB request limit remains a finite long-session constraint to address before claiming world-scale persistence. Measurement script: `/tmp/af9-long-checkpoint.mts`.

Independent review also found three factual mismatches, fixed in `bf6c7f1`: a safe-conduct oath now has its own fact; technical/provisional records omit Mara's name without inventing personal protection or witness contact; departing the landing acknowledges the already opened case. Preexisting witness protection remains intact.

The integrated future-read audit and all 41 current tests passed on that corrected source (manager log `/tmp/af9-stage5-final-verify.log`, 16.31 seconds for tests). It covered 95,213 canonical states and 150,838 transitions with no unreachable scenes/choices, dead ends or playing states lacking a completed path. See AUDIT_SCALING.md for the proof boundary and historical failure counts. Additional focused fact regressions are being added independently. Frozen live runs remain pending. The public site continues to serve the previously accepted small game until the candidate's checks pass and main is pushed.

## First blind expansion batch and revision decision

Frozen source: `59afce4`, build `af9-8eb0161091219766a23a06bb`, source SHA-256 `dce48c1ba631fb8911f5cb7fc171dacda1b39f39dd55b8cfe48198b3f23c717d`; trusted checkout `/tmp/af9-stage5-verified`.

| Seed | Run ID | Actions / route | Clarity / enjoyment |
| --- | --- | --- | --- |
| 1 | `2026-09-05T02-44-53-194Z-9aa04e99` | 18; no background, shared water, ledger + seal + protected testimony, anonymous exposure | 4 / 5 |
| 2 | `2026-09-05T02-44-53-193Z-3dffe618` | 17; canalwright, shared water, ledger + protected testimony, sealed case | 4 / 4 |
| 3 | `2026-09-05T02-44-53-192Z-6570ceed` | 17; canalwright, shared water, ledger + protected testimony, sealed case | 4 / 4 |

All three attempts completed, entered the Archive naturally, gave same-conversation interviews, and passed runner integrity/replay validation. The nominal median-clarity and exposure gates passed. Experience acceptance is held for correction because two interviews revealed the same misleading restriction: they called the hearing without seal evidence, could no longer adjourn after taking testimony, and inferred that protecting Mara required leaving Vask in office. One described the final tradeoff as abrupt; the other was unclear whether Vask could be removed safely. This is a real limitation of the available choices at those states, not a technical inability to finish. The first player also misunderstood whether the optional starting background had been skipped or failed to apply. All wanted another run. None played a council or evacuation Archive origin, field-medic or oathkeeper background; these remain mechanically verified coverage only. The second player again inferred that refusing the council seal was necessary for shared repair, a preexisting narrative-commitment caveat.

Prospective correction, declared before new code or players: make an undecided hearing return to the investigation even after testimony, with no resource farming; explain the separate evidence required to remove Vask before calling the hearing; explicitly state that backgrounds are optional and selected in the starting market before visiting a location. Keep the verdict itself irreversible. Preserve existing routes and repeat the full audit plus a regression that obtains the missing counterseal after an early hearing, then publishes anonymously.

After mechanical checks, freeze a new candidate and run three new neutral Luna/max players at seeds 1–3 with unchanged gameplay/interview instructions. Require the original technical/exposure/clarity gates, at least two hearing exposures, and zero reports among the hearing-exposed players that witness protection necessarily leaves Vask in office or that a premature hearing prevented further investigation. Report actual early-hearing exposure separately; absence of that trigger limits any causal improvement claim. Do not erase or relabel this first batch.

## Repaired hearing batch and acceptance

Frozen source: `dbabc94`, build `af9-1490bb60e9ff6ad4be06a0aa`, source SHA-256 `23df15fb883c1b578a83b96d4ad199a7950a54119d0fc634f158b3cf2f5a25e7`; trusted checkout `/tmp/af9-stage5-hearing-verified`.

| Seed | Run ID | Actions / route | Clarity / enjoyment |
| --- | --- | --- | --- |
| 1 | `2026-09-05T02-52-07-624Z-d56340df` | 19; canalwright, clinic detour, borrowed kit, shared water, technical publication without witness contact | 5 / 5 |
| 2 | `2026-09-05T02-52-07-628Z-99633d6e` | 18; canalwright, own kit, shared water, technical publication without witness contact | 5 / 5 |
| 3 | `2026-09-05T02-52-07-637Z-fd616724` | 20; canalwright, clinic detour, own kit, shared water, protected testimony and technical publication | 5 / 5 |

All three attempts completed, entered the hearing, passed runner integrity/replay checks, supplied original same-conversation interviews and wanted another run. The earlier mistaken protection/Vask tradeoff was reported by 0/3; no observed defects were reported. The declared gates pass. All selected the canalwright background and completed a technically sufficient case before the hearing: 0/3 encountered an early hearing or used adjournment. The batch supports initial release of the expansion and clearer requirements in these observed paths; it does not isolate the causal effect of adjournment, prove all backgrounds/origins were understood, or measure general human enjoyment.

Retained feedback: seed 1 was uncertain about borrowing versus using an own kit; seed 2 was unsure whether testimony added value after technical proof; seed 3 found tool/evacuation tradeoffs dense. The first two loosely described technical evidence as protecting Mara, although they never contacted her. The engine only records omission of her name on those paths and makes no personal-protection promise. That interpretation remains a presentation/relationship caveat for further work. No original response has been corrected or substituted.

The six Stage5 games took 112.962, 100.526, 104.147 seconds (first batch) and 108.218, 110.707, 123.268 seconds (repair batch), including interviews. All six were exported from their matching trusted checkouts into `~/.local/share/adventure-forge-9/exports/stage5-first-seed*` and `stage5-hearing-seed*`; each archive has a validated `.sha256` sidecar. Both batches received independent recorded-source/provider/thread/replay audits. The repaired batch matched its frozen source, model/effort and isolated player configuration in all three attempts; no provider tool-capability events were found. Original free/structured responses matched the preserved player-response events exactly, and each interview stayed on its own distinct gameplay thread. The independent reviewer confirmed the declared gates pass with no natural early-hearing exposure.

Final mechanical verification has 45 passing tests, including the early-hearing regression. The current exhaustive abstraction contains 76,117 states and 129,874 legal transitions, with zero unreachable content, dead ends or unfinished states lacking a completed route. Removing the obsolete one-time adjournment condition lets previously equivalent navigation histories collapse; no completion invariant was removed. The largest representative projection measured 412 words, explicitly not every possible accumulated fact-list variant. Manager test time was 15.20 seconds in `/tmp/af9-stage5-final-publish-verify.log`; the local Vercel production build also passed.

The stateless browser handler completed a 23-action early-hearing recovery journey on the repaired source. Reloads after the first and second adjournments resumed the Archive hall at revisions 16 and 18. After collecting the counterseal, anonymous publication completed with revision/journal count 23. Save download and completed reload passed. Mobile width was 375 pixels in a 390-pixel viewport, with no browser errors. Inspected screenshots: `/tmp/af9-hearing-initial.png` and `/tmp/af9-hearing-mobile.png`; downloaded checkpoint: `/tmp/af9-hearing-completed.save`. This supplies direct mechanical/browser coverage of the branch not taken by the new blind players.
