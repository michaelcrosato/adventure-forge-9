# Cycle 1: canal-road cost clarity

Declared before comparison sessions or candidate implementation. The exploratory Stage 2 run `2026-09-05T01-10-01-388Z-64fb9fe6` identified slight ambiguity between scouting for evacuation and preserving the last supply for repair. Its ratings were both 5/5. It supplies the problem, not a prospectively collected comparison result.

Question: does separating the immediate numeric cost from its later route consequence remove that ambiguity while preserving the tradeoff?

Baseline: frozen source at `0cd0f52`. Candidate: change only the Canal Road scene prose and the `follow-canal` / `pay-scouts` descriptions. State explicit immediate supply/risk changes, then explain the repair-versus-evacuation consequence. Do not change conditions, effects, routes, ordering, player instructions, or interview questions. Do not tell the player which route is preferable.

Design: two fresh baseline conversations and two fresh candidate conversations, matching seeds 1 and 2, `gpt-5.6-luna` with `max` effort, identical neutral prompts/questions, technical 60-turn limit, subscription auth and verified player isolation. Seeds do not randomize this scenario; they are recorded identifiers for matched settings. Every attempt is retained. A technical failure remains outside completed-experience denominators and triggers a documented retry of that setting; never substitute a different player after gameplay for its interview.

Primary readout: number of original interviews explicitly reporting unresolved confusion about canal/scout/supply/repair tradeoffs. Report excerpts and denominator, including contrary evidence. Secondary readouts: clarity/enjoyment distributions, voluntary ending/completion, defects, and stated replay preference. No inference about general player populations from two sessions per version.

Decision rule: support improvement only if candidate interviews report fewer road-tradeoff ambiguities than the fresh baselines, with no new defect or unfinished gameplay caused by the change and no drop in median clarity or enjoyment. If both versions have zero ambiguities, report no observed difference; do not claim improvement. Retain clearer literal cost wording as an editorial decision only if mechanics and interviews show no regression. If candidate has a regression, revise or revert before the next cycle. A completed comparison with a null result is still an honest cycle, not evidence of improvement.

Results pending.
