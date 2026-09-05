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

Pending final audit integration and frozen live runs. The public site continues to serve the previously accepted small game until the candidate's checks pass and main is pushed.
