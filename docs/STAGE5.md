# Lantern Archive — first connected-area expansion

Status: integrated candidate, not yet published or accepted. The full world-scale goal remains outstanding.

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
