# Cycle 2: explain unavailable repair

Declared before comparison sessions or implementation. Cycle 1 baseline seed 2 (`2026-09-05T01-13-14-131Z-5f86357b`) expected shared repair in the control chamber after spending the last supply on scouts. Its original report said the scene appeared to require only Nessa's tools and Ilyra's promise. In fact the legal action also requires one supply and one medicine dose. Cycle 1 changed the road text, so this separate mismatch remains untested by its candidate players, who preserved their supplies.

Question: does complete chamber guidance explain why shared repair is available or absent without changing what the player can do?

Baseline: frozen Cycle 1 candidate `f66ecd2`. Candidate: change only Control Chamber scene text. State the full public requirements and add an explanation when the kit/scouting preparation has consumed the last supply. Keep all choices, costs, conditions for legal actions, ordering, outcomes, player instructions and interviews unchanged. Check depleted and prepared projections against actual legality; never offer an unavailable action as legal.

Design: two fresh baseline conversations and two fresh candidate conversations, matching seeds 1 and 2, the existing neutral instructions/interview, `gpt-5.6-luna`/`max`, managed subscription and verified isolation. All attempts are retained and source is frozen per checkout. Technical failures are separate, and a documented retry keeps the same setting. Do not force the player to deplete supplies or show a solution trace.

Primary readout: original reports that shared repair should have been available, or that its required resource was unexplained. Report the number of players actually reaching the depleted chamber separately: lack of exposure cannot prove the explanation worked. Secondary: clarity/enjoyment, defects, complete/voluntary exit, and stated replay preference. Preserve every original interview.

Decision: claim observed improvement only if comparable depleted-chamber exposure exists and candidate reports fewer requirement confusions, with no new defect or lower median ratings. Otherwise report a null or untested experience result. If complete checklist/explanation matches engine legality in mechanical counterfactuals and fresh interviews show no regression, retain it as a source-backed presentation correction; do not promote that to measured experience improvement. This cycle must report whichever result occurs.

## First candidate result

Candidate A: commit `6370ae54ea7635bc049a273f2950fa33b0f6d796`, build `af9-8b4a5cadde572e757ed03332`, source `cb125ebf5469fa70847308ebba85f4cdfe1f6bf2c10b913948f265bbfb278d77`. Twenty mechanical tests and [CI](https://github.com/michaelcrosato/adventure-forge-9/actions/runs/33936053969) passed. A peer checked prepared, kit/scouts-depleted, no-clinic kit/scouts, and no-tools/scouts states: the explanation appears only when the last supply was spent and kit-braced evacuation is actually legal. Only chamber text changed.

| Version / seed | Run ID | Clarity | Enjoyment | Depleted chamber reached |
| --- | --- | --- | --- | --- |
| Baseline / 1 | `2026-09-05T01-21-50-881Z-9342d55f` | 5 | 4 | No |
| Baseline / 2 | `2026-09-05T01-21-50-886Z-3a5bf0a7` | 5 | 5 | No |
| Candidate A / 1 | `2026-09-05T01-24-13-151Z-68a54f26` | 4 | 5 | No |
| Candidate A / 2 | `2026-09-05T01-24-13-161Z-317190a2` | 5 | 5 | No |

All four attempts completed the ten-action shared-water route, with authentic same-thread interviews and integrity/replay acceptance. No technical failures/retries or reported defects. All stated willingness to replay. Elapsed runner times: 51.751, 45.553, 56.667 and 51.816 seconds. Every source and original interview is preserved; exports are `cycle2-baseline-seed{1,2}.tar.gz` and `cycle2-candidate-a-seed{1,2}.tar.gz` with SHA-256 sidecars in the external exports directory.

Decision: no primary experience result, because depleted-state exposure is 0/2 in each version. The candidate also fails the retention gate: median clarity fell 5 → 4.5, despite enjoyment rising 4.5 → 5. Do not claim the checklist improved player understanding or that Candidate A passed. Its implementation remains a reviewable candidate pending the revision below.

Original residual issue, candidate A seed 1: “The canal-road tradeoff left some uncertainty about how using medicine for an injured family would affect the clinic promise.” Baseline seed 1 likewise reported unclear later evacuation/medicine effects. This is contrary follow-up evidence to any broad reading of Cycle 1's limited result. Candidate A seed 2 described the tradeoff as requiring thought; its structured confusion array contained that statement, despite calling objectives/resources clear in its reason. These reports are not silently replaced by the favorable scores.

## Predeclared follow-up: Candidate B

Declared before implementing or running B. Keep the accurate chamber checklist and additionally revise only the road consequence wording to state that evacuation is an alternative to shared repair, leaves the clinic without clean water, and that a dose spent on an evacuee cannot go to the fever ward. Preserve all gameplay mechanics, choices, order, settings and interview questions. This is a real content revision responding to the original interview, not another draw from unchanged Candidate A.

Run two fresh Candidate B conversations at seeds 1 and 2 against the same frozen baseline/settings. Report baseline, A and B together. Baseline reuse and adaptation to earlier interviews make this an iterative development comparison, not an independent confirmatory study. There is one B dispatch per setting; no repeated unchanged attempts to seek favorable ratings.

Retain B only if full requirements and conditional consequences match engine counterfactuals, no new defects appear, median clarity/enjoyment are no lower than the original baseline, and no B interview explicitly leaves the clinic/evacuation medicine relationship unclear. Without comparable depleted-state exposure, the chamber explanation remains mechanically verified and experience-untested regardless of ratings. If B fails, keep the cycle unresolved and design a focused comprehension check instead of claiming success.

Candidate B results pending.
