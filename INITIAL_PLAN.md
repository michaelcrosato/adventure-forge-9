# Adventure Forge 9 — Initial plan

Owner: manager agent. Started: 2026-09-04. Status: executing.

## Mission and decisions

Build one persistent, deterministic text RPG with the exploration breadth of Skyrim and the local choice depth of Baldur's Gate 3. This remains the full completion target. A prototype, generated map, or roadmap does not satisfy it.

Start with the improvement cycle specified in PLANb: a real subscription player, a complete small game, and two feedback-led revisions. Extend only after that foundation has live evidence. TypeScript and Node.js are the initial stack; browser and terminal share the same engine. No API key is required. Codex managed ChatGPT sign-in is the first adapter candidate; MCP is optional.

The four inputs have been reviewed. PLANb takes precedence for implementation order, stack, subscription access, neutral blind players, interviews, and preservation of failed evidence. PLANx contributes deterministic authority and honest scale accounting. PLANy contributes Veyra Basin, consequential character differences, area contracts, and the manager workflow. PLANz contributes connected exploration and interacting regional mechanics. Old Rust/Python stack prescriptions, persona-first tests, discarded failed reports, and bulk world-building before live testing are superseded. The originals are preserved in Git history and removed from the live tree.

## Invariants

1. Only deterministic code decides outcomes. Explicit serializable seed state; no time, network, or ambient randomness in game transitions.
2. Content is validated data. Conditions and effects use a closed vocabulary. Unknown behavior fails validation.
3. The engine enumerates legal actions. Stable choice IDs and expected revisions prevent stale or invented choices from mutating state.
4. One campaign carries travel, dialogue, quests, combat, resources, relationships, and consequences. No player-managed child sessions.
5. Player projection excludes hidden state. Browser, terminal, and LLM receive the same projection.
6. Every claimed outcome has a replayable witness bound to the build. Saves and replays verify identities and reject tampering.
7. Mechanical checks cannot stand in for live play or authentic interviews. Report implemented, mechanically verified, live tested, and improvement supported separately.
8. Blind players get a fresh conversation and only the player surface. Disable and verify filesystem, shell, browsing, source context, unrelated tools, memories, and builder guidance. An empty directory is insufficient.
9. Interview the same conversation after closing the game. Preserve original free-form answers before structured ratings; keep failures and interrupted runs.
10. Preserve attempted runs outside the source tree with append-only events, build identities, observations, original provider responses, receipts, settings, and a hashed export. Local hashes establish local integrity only.
11. Use short, concrete prose. Stakes belong beside choices. No artificial cap on legal choices; add complete paging only when necessary.
12. Scale counts distinct authored interactions, inhabitants, and persistent consequences. Empty distance and reskins do not count.

## First game: The Split Tide

Veyra Basin begins at Lowsail, a market town beside failing floodworks. A stolen water order links the town to Red Sluice. A small cast wants safety, fair water, or control. Repair and share the flow, side with the council, or evacuate the market. Each costs a resource, risk, or promise that changes a later choice. Return to the same town and see the result, then explicitly finish or depart.

Stage 1 uses a smaller ferry emergency to prove the player and interview pipeline before authoring the full expedition. Character choices emerge in action; avoid a long setup questionnaire. Later backgrounds, skills, beliefs, traits, flaws, affiliations, and deeds must change mechanics and reactions across the world.

## Architecture and interface

- `src/engine/`: state, validated content, legal choices, pure transitions, player projection, save/replay.
- `src/content/`: authored scenes and witness traces.
- `src/player/`: terminal and local browser adapters.
- `src/playtest/`: subscription client, isolated conversation, run journal, exit interview, evidence validation/export.
- `tests/`: focused mechanical proofs and regressions.
- `docs/`: evidence index, decisions, agent benchmark, current work.

Public operations: `start`, `observe`, `choose`, `end`. Observations contain a revision, scene text, known facts, visible resources, and stable choice IDs with labels and stakes. The runner supplies identity and revision; players choose by ID. The engine supplies completion, departure, or death receipts. Technical interruptions are separate runner statuses.

## Delivery sequence and acceptance

| Stage | Work | Acceptance evidence |
| --- | --- | --- |
| 0 | Git, public GitHub repo, consolidated plan, archive inputs | Remote visibility and committed history |
| 1 | Minimal deterministic scene, Codex subscription adapter, enforced isolation, interview and evidence | One real keyless fresh player completes or leaves, same-session interview, verified boundary, replay |
| 2 | Lowsail, expedition, three distinct resolutions, resource tradeoff, changed return, terminal/browser | Outcome witnesses, save/restore, projection checks, fresh live feedback |
| 3 | First observed experience problem | Predeclared question, frozen baseline/candidate, comparable fresh players, original interviews, decision |
| 4 | Second feedback-led improvement | Another complete evidence-linked cycle, no fabricated or substituted interviews |
| 5 | Interacting systems and connected authored areas | Existing regressions pass, distinctive content and cross-area consequences replay, live tests |
| 6 | Expand breadth and depth in reviewed waves | Area contracts, anti-sameness review, performance, long play sessions, character counterfactuals |
| 7 | Full completion audit | Direct evidence of the requested world breadth and interaction depth, all requirements verified |

World production expands into linked watersheds, civic centers, wild frontiers, industrial belts, and coasts. Regional mechanics include physical traversal, law, stealth, combat, companion relationships, craft, ecology, and trade. Each new area needs named people with goals, several useful approaches, persistent outcomes, a changed revisit, and a credible consequence beyond its border. A 500-location synthetic fixture proves capacity only; authored scale and experience are measured separately. Comparative long-session studies must support the final Skyrim/BG3 target, not counts alone.

## Verification and live protocol

`npm run verify` remains a non-LLM command. Initially prove determinism, legal action execution, stale/illegal no-op, save/replay parity, content validation, hidden-state exclusion, and all advertised minimal outcomes. Add crawler, character counterfactuals, cross-area witnesses, language/action catalog limits, evidence tampering, clean-process replay, and performance coverage when their systems ship. Report bounded coverage and verification duration.

Use the same neutral player instruction across comparable runs: play for the first time using only what the game shows, choose naturally, stop through the game when desired, and report honestly. No solution traces, acceptance targets, or developer explanations enter player context. Gameplay closes before interviews.

Ask free-form: intended goal; most important choice and why; confusion or inability to proceed; best moment; worst moment; willingness to continue or replay and why. Then collect clarity/enjoyment on a fixed 1–5 scale plus confusion, defects, and replay preference. Preserve raw responses and any neutral formatting recovery. Record observed continuation separately from stated preference.

Before every experience comparison, state the problem, evidence links, intended behavior, and decision rule. Freeze source for each run. Match seeds, instructions, questions, model, and settings; never silently fall back. Show every attempt and denominators. Quota failures pause dispatch and leave live acceptance pending; useful independent implementation can continue.

## Manager and agent throughput

The manager owns priorities, assignments, review, integration, verification, publication, and honest status. Use `gpt-5.6-luna` at `max` as the initial primary subagent benchmark. Bound independent tasks and agree on file ownership/interfaces. Record elapsed time, accepted work, correction effort, regressions, and cost when available; do not invent cost figures. Compare other models on equivalent tasks before changing the default.

At each continuation inspect the worktree, active process handles, and evidence. Classify the prior turn as progress, verified wait, or no progress. Take the next executable action. Keep the full goal active until the final audit passes; do not promote a smaller milestone into final success.

## Initial state and immediate queue

Inspection found four briefs and no implementation or Git repository. GitHub authentication is available. Node 22 and Codex CLI 0.153.3 are installed. Subscription player isolation and real model access still need proof.

1. Preserve inputs, finish repository setup, and publish this plan.
2. Build minimal pure engine and terminal surface while probing supported subscription isolation.
3. Verify mechanics; freeze the build; run and preserve the first live game/interview.
4. Use that evidence to implement the full small game and two improvement cycles.
5. Continue expanding toward the full world target with measured quality.
