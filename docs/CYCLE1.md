# Cycle 1: canal-road cost clarity

Declared before comparison sessions or candidate implementation. The exploratory Stage 2 run `2026-09-05T01-10-01-388Z-64fb9fe6` identified slight ambiguity between scouting for evacuation and preserving the last supply for repair. Its ratings were both 5/5. It supplies the problem, not a prospectively collected comparison result.

Question: does separating the immediate numeric cost from its later route consequence remove that ambiguity while preserving the tradeoff?

Baseline: frozen source at `0cd0f52`. Candidate: change only the Canal Road scene prose and the `follow-canal` / `pay-scouts` descriptions. State explicit immediate supply/risk changes, then explain the repair-versus-evacuation consequence. Do not change conditions, effects, routes, ordering, player instructions, or interview questions. Do not tell the player which route is preferable.

Design: two fresh baseline conversations and two fresh candidate conversations, matching seeds 1 and 2, `gpt-5.6-luna` with `max` effort, identical neutral prompts/questions, technical 60-turn limit, subscription auth and verified player isolation. Seeds do not randomize this scenario; they are recorded identifiers for matched settings. Every attempt is retained. A technical failure remains outside completed-experience denominators and triggers a documented retry of that setting; never substitute a different player after gameplay for its interview.

Primary readout: number of original interviews explicitly reporting unresolved confusion about canal/scout/supply/repair tradeoffs. Report excerpts and denominator, including contrary evidence. Secondary readouts: clarity/enjoyment distributions, voluntary ending/completion, defects, and stated replay preference. No inference about general player populations from two sessions per version.

Decision rule: support improvement only if candidate interviews report fewer road-tradeoff ambiguities than the fresh baselines, with no new defect or unfinished gameplay caused by the change and no drop in median clarity or enjoyment. If both versions have zero ambiguities, report no observed difference; do not claim improvement. Retain clearer literal cost wording as an editorial decision only if mechanics and interviews show no regression. If candidate has a regression, revise or revert before the next cycle. A completed comparison with a null result is still an honest cycle, not evidence of improvement.

## Results and decision

Candidate commit: `f66ecd23a049c4d9ae9db7b57de7d54b4359d830`; build `af9-7e07fb5c976fefecf79502aa`; source ID `5e7449f750cc3d8189942491f7bc681061aebff62ce5cd714f355557b8cb079b`. A parsed comparison proved only the four permitted wording fields changed. All 20 tests and [GitHub CI](https://github.com/michaelcrosato/adventure-forge-9/actions/runs/33935712194) passed.

| Version / seed | Run ID | Outcome | Clarity | Enjoyment | Road ambiguity | Reported defects |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline / 1 | `2026-09-05T01-13-14-127Z-8fc0e36f` | Shared water, 10 actions | 4 | 4 | Yes | None |
| Baseline / 2 | `2026-09-05T01-13-14-131Z-5f86357b` | Eight-family evacuation, 10 actions | 4 | 4 | Yes | Incomplete repair requirements in chamber prose |
| Candidate / 1 | `2026-09-05T01-17-29-584Z-201279e3` | Shared water, 10 actions | 5 | 5 | No; see nuance below | None |
| Candidate / 2 | `2026-09-05T01-17-29-598Z-4f0de78c` | Shared water, 10 actions | 5 | 4 | No | None |

All four attempts completed with authentic same-session interviews, verified subscription isolation, exact matched settings, distinct fresh threads, preserved source, and integrity/replay acceptance. All stated willingness to replay; no replay was observed in those conversations. Zero technical failures or retries. Runner elapsed times were 64.839, 59.346, 47.061 and 51.683 seconds respectively. Sessions were run two at a time in separate threads; elapsed sums are not wall-clock duration or cost.

Baseline 1 wrote: “The canal-road choice presented important tradeoffs, but the eventual consequences were not fully clear.” Baseline 2 expected the shared-repair choice to remain after paying scouts and reported that the chamber prose did not explain its absence.

Candidate 1 still called balancing supplies/risk/medicine “the main uncertainty,” but its structured confusion field was empty and it explicitly said “The choices and tradeoffs were clear.” Manager and independent evidence reviewer classified this as decision difficulty, not unresolved presentation confusion. Even counting that ambiguous sentence conservatively would give 1/2 versus baseline 2/2. Candidate 2 wrote: “The road choice had tradeoffs, but they were understandable.” Both candidate structured confusion/defect arrays were empty.

Decision: retain the candidate. Under the predeclared rule, ambiguity decreased 2/2 → 0/2, median clarity rose 4 → 5, and median enjoyment did not fall (4 → 4.5). The result supports this particular wording change in these four sessions. Different route exposure and a small, single-model sample limit causal and population claims. The chamber requirement defect remains a distinct follow-up, because neither candidate visited the resource-depleted version of that scene.

Original archives and checked SHA-256 sidecars are under `~/.local/share/adventure-forge-9/exports/cycle1-{baseline,candidate}-seed{1,2}.tar.gz`. Originals remain in the external runs directory under the listed IDs. Baselines were replay/export-validated from their frozen checkout. No original interview was edited or replaced.

Later evidence: Cycle 2's first baseline, using the retained Cycle 1 source, again reported uncertainty about evacuation/medicine. The four-session result above remains the recorded comparison; it does not mean all road confusion was eliminated. Cycle 2 preserves that contrary observation and investigates the conditional clinic consequence.
