# Cycle 3: make the clinic departure explicit

Declared before implementation or candidate calls. Candidate B seed 1 in Cycle 2 (`2026-09-05T01-33-46-695Z-9d633670`) reported: “Promising the clinic immediately moved to the council hall without an explicit travel choice.” The choice currently promises aid and silently changes location. Seed 2 reported no confusion. Both completed the shared-water route; clarity/enjoyment were 4/4 and 5/5.

Change only the labels/descriptions of `make-clinic-promise` and `skip-clinic-promise`. Each label will explicitly combine the decision with going to Council Hall; each description will retain the promise and medicine consequences. No new click, scene, condition, cost, effect, choice order or outcome. Compare parsed content with frozen B (`ea6caf3`) after stripping only those four strings to prove unchanged mechanics. Existing witnesses and all required checks must pass.

Use the two already preserved B games as the development baseline. Run two fresh candidate conversations, seeds 1 and 2, using the unchanged neutral player instruction, same-thread free interview before structured ratings, Luna/max, managed ChatGPT subscription and verified isolation. Freeze the candidate source and preserve every attempt externally. This comparison intentionally responds to known baseline feedback and reuses that baseline; it is an iterative development check, not an independent confirmatory experiment. No unchanged reruns to seek favorable scores.

Readout: did each player encounter a clinic decision, and did its original free or structured interview report an unexplained clinic-to-council move? Report all other confusion and defects too. Retain the explicit navigation correction if both candidates encounter the edited decision, neither reports the abrupt move, no new defect appears, and clarity/enjoyment medians are at least the baseline's 4.5/4.5. This supports only a limited observed navigation improvement. No exposure or a failed criterion yields an untested or failed result, not acceptance. Report willingness to replay separately from observed behavior.

Candidate source and results pending. The focused Cycle 2 screen test remains separately identified and cannot replace these normal gameplay interviews.

## Result

Candidate `34af626`, build `af9-057a3019c4bb2a2e34069195`, source `8ebd1a967e64eb8bcce358f18908c2f0b875c1d29ad7d740990c1d6a86a8418f`. Parsed baseline/candidate comparison proved that only the declared four strings changed; all mechanics and facts were identical. All 20 required tests passed.

| Version / seed | Run ID | Clinic decision seen | Abrupt-move report | Clarity / enjoyment |
| --- | --- | --- | --- | --- |
| B baseline / 1 | `2026-09-05T01-33-46-695Z-9d633670` | Yes | Yes | 4 / 4 |
| B baseline / 2 | `2026-09-05T01-33-46-705Z-a4cd9fd4` | Yes | No | 5 / 5 |
| Navigation / 1 | `2026-09-05T01-53-07-907Z-a4ba43af` | Yes | No | 5 / 5 |
| Navigation / 2 | `2026-09-05T01-53-07-924Z-98d0d28c` | Yes | No | 5 / 5 |

Both new attempts took the same ten-action shared-water route as the baseline, completed, and gave original free interviews followed by structured ratings in their respective gameplay conversations. Integrity, replay and live technical acceptance passed; no transport failures, retries or reported defects. Both stated willingness to replay, which is not observed replay. Runner elapsed times were 54.226 and 58.505 seconds. External exports `cycle3-candidate-seed{1,2}.tar.gz` and SHA-256 sidecars preserve the source and original responses. Trusted replay checkout: `/tmp/af9-cycle3-verified` at the candidate commit.

Decision: retain the navigation wording under the predeclared rule. Exposure is comparable (2/2), abrupt-move reports fell 1/2 → 0/2, and clarity/enjoyment medians rose 4.5/4.5 → 5/5. This is a small single-model development observation using known baseline feedback, not a population effect or proof of global depth.

Original candidate 1: “I was not unable to proceed. The evacuation-versus-repair tradeoff was the main tension.” Candidate 2: “I was not confused or unable to proceed; the trade-offs were clear.” Both structured confusion and defect arrays were empty. Candidate 2 described refusing council control as allowing the shared repair. The engine does not require refusal to repair; that causal interpretation is an open narrative/commitment caveat, not evidence that all mechanics were understood.

Cycles 1 and 3 now supply two completed, limited improvement decisions after authentic normal gameplay. Cycle 2's failed global comparisons and unfinished terminology correction remain separate; none of those failures are relabeled as successful normal-play comparisons.
