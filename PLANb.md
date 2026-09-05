# AdventureForge — Starter Specification

Version: 0.1  
Date: 2026-09-04  
Status: Proposed specification for a new implementation

## 1. Purpose

Build a deterministic text RPG that improves through AI development, live blind LLM playtests, and authentic exit interviews.

The improvement cycle is the defining capability. The engine, authored stories, and player interface are its outputs.

The long-term goal is one persistent world with deep consequences and a growing range of tabletop and board-game mechanics. Build that range through tested stories. Start with a small, complete game.

## 2. Required principles

1. AI agents develop the game and its authored content. People set direction.
2. The game engine executes rules as deterministic code. An LLM does not decide hidden outcomes or invent runtime rules.
3. Live blind LLM playtesting is required for product acceptance.
4. A completed playtest includes an authentic exit interview from the same player session.
5. Subscription AI access is the accepted working default. The complete development and playtest cycle must work without an API key.
6. MCP is an optional adapter. Game rules, session state, and evidence must work without it.
7. Tests, crawlers, scripted players, and mocks provide mechanical evidence. They cannot satisfy the live playtest requirement.
8. Preserve original feedback, including criticism, failed runs, and incomplete interviews.
9. Agents may change code, content, and tests. They must preserve honest verification and record intentional behavior changes.
10. Stories are authored, played, criticized, and revised. Preserve useful stories and their history as the game changes.

## 3. First deliverable

Deliver one small game that completes the improvement cycle twice through subscription access.

The initial game contains:

- One town and one expedition.
- A small cast with clear needs and remembered outcomes.
- At least three materially different ways to resolve the main problem.
- A visible resource cost, risk, or obligation that affects a later choice.
- A return to town that demonstrates a persistent consequence.
- A clear ending and an explicit way to stop playing.

Introduce decisions when their stakes are understandable. Avoid a long sequence of permanent setup choices before the player experiences the problem.

Add mechanics when the current story needs them. World expansion, a universal rules language, and large test fleets can follow this deliverable.

## 4. Small architecture

Use TypeScript and Node.js as the initial implementation choice. Keep the engine usable by a browser and a local runner.

| Component | Owns |
| --- | --- |
| Deterministic engine | State transitions, seeded randomness, legality, and events |
| Authored content | Locations, characters, choices, conditions, and consequences |
| Campaign session | One session identity, revision, save, and transition between scenes |
| Player projection | Only the text, facts, and choices available to the player |
| Subscription adapter | Provider sign-in integration, conversation continuity, responses, and usage limits |
| Playtest runner | Isolation, action dispatch, run records, exit handling, and interview capture |
| Feedback processor | Evidence links, issue grouping, comparison, and development tasks |
| Player interfaces | Browser, terminal, and optional MCP presentation |

Use one campaign session across travel, dialogue, combat, and quests. Internal modules can have separate responsibilities. The player must not manage parent and child session handles.

The engine owns quest completion, death, and campaign consequences. Interfaces call the same session operations.

Use one small public player interface:

| Operation | Behavior |
| --- | --- |
| `start` | Create a fresh campaign session and return its first observation. |
| `observe` | Return the current player observation without changing gameplay state. |
| `choose` | Apply a currently available choice against the expected session revision. |
| `end` | Close the journey through the game's exit rules and return an exit receipt. |

An observation contains readable scene text, relevant known facts, available choices, and the current revision. Choices have stable identifiers and player-facing labels.

The runner can attach the current revision to a choice. The LLM should not have to copy hashes or reconstruct session identifiers.

Start with named fields. Add compression only after measuring a real context or latency problem. Preserve information needed to understand choices.

The browser and LLM use the same player projection. A developer inspection interface may expose hidden state, but the blind player cannot access it.

## 5. Subscription access

The default setup is a local worker that uses a supported, signed-in subscription client. The provider client owns its login and credential refresh.

Start with one working adapter. Codex with managed ChatGPT sign-in is the first implementation candidate. Claude Code subscription access is a second candidate.

For a direct Codex integration, evaluate App Server conversation and structured-output support. A supported CLI path is also acceptable. Prove the chosen path with a real session before building more infrastructure.

The adapter must support:

- A fresh conversation for each new player.
- Conversation continuity throughout play and the exit interview.
- Recorded provider, reported model, client version, and effective settings.
- An enforced player-only capability boundary.
- Original response capture and clear failure reporting.
- Visible handling of quota limits and client interruptions.

The runner sends an observation, receives the player's choice, applies it through the game, and returns the next observation. MCP may carry the same exchange.

Do not require an API key for setup, development, playtesting, interviews, feedback processing, or acceptance. An optional API adapter must require explicit selection.

Do not turn a subscription login into a custom API credential. Use the provider's supported authentication path.

When quota is unavailable, pause further dispatch and record the reason. Do not silently switch providers or models within a run.

Provider interfaces change. Check current official documentation and run a capability check before accepting a new client version. Record the client that actually ran.

## 6. Blind playtest contract

A blind player is a fresh LLM conversation with access only to the player interface.

The player must not receive:

- Repository files or hidden game state.
- Developer instructions about a desired fix or solution.
- Previous playtest reports or solution traces.
- Acceptance thresholds or expected interview answers.
- Browsing, shell, file access, or unrelated tools that can reveal this information.

An empty working directory alone does not prove isolation. Disable unrelated capabilities and verify the effective boundary. Keep the engine and source outside the player's permitted access.

Use a short initial instruction with this intent:

> You are playing this game for the first time. Use only what the game shows you. Choose naturally. You may stop through the game's exit action. After play, describe your own experience honestly.

Add only the interface instructions the adapter needs. Tutorials, goals, action explanations, and consequences belong in the game.

Do not give the player a route, a coverage target, or scene-specific advice. Do not limit inspection to selected options to improve measured pacing.

Use a neutral player contract for normal experience comparisons. Label specialist tests, such as hostile input tests, separately.

Game exits must distinguish completion, voluntary departure, and death. The game can offer continue/end choices at natural breaks.

Technical limits belong to the runner. A timeout, context failure, or quota failure is an interruption, not a player decision to leave.

If a run resumes, retain the exact player conversation and record the interruption. Evaluate resumed runs separately when the comparison requires uninterrupted play.

## 7. Authentic exit interview

After the game closes, disable gameplay actions and interview the same player conversation. Do not provide developer explanations or other players' opinions.

First collect free-form answers:

1. What did you think you were trying to do?
2. Which choice mattered most to you, and why?
3. Where were you confused or unable to proceed?
4. What was the best moment?
5. What was the worst moment?
6. Would you choose to continue or start another run? Why?

Then collect structured answers for clarity, enjoyment, confusion, observed defects, and willingness to play again. Use the same questions and rating scale across comparable runs.

Treat ratings as model-reported judgments. Record actual continuation choices separately from stated replay preference.

Preserve the original questions and responses before any extraction or summary. A later processor may organize the feedback, but every claim must lead back to its source.

The engine supplies the exit receipt. The runner attaches it to the interview record. Do not ask the player to reproduce engine evidence in a Markdown block.

If structure is malformed, preserve the original response. A neutral format clarification may use the same conversation, with both responses retained. Label this recovery.

Do not ask repeatedly until the rating improves. Do not replace a missing interview with another model's account. If the original player cannot answer, record an incomplete interview.

## 8. Run evidence

Write one immutable evidence bundle for every attempted run. Keep later analysis separate from original evidence.

The bundle records:

- Run identity and exact engine/content build identities.
- Game seed and initial state identity.
- Provider, reported model, client version, and effective settings.
- Exact player and interview instructions.
- Isolation configuration and its verification result.
- Original provider responses and player-visible observations.
- Chosen actions, revisions, and resulting state hashes.
- Exit receipt or technical interruption status.
- Original interview, extracted fields, and any recovery history.
- Hashes linking the record to its evidence files.

Use an append-only event log. Record observations and accepted actions as they occur. Keep timestamps as operational metadata outside deterministic game logic.

Preserve completed, failed, abandoned, timed-out, and malformed runs. Show all attempted runs in operational reporting. State the denominator for each experience metric.

Local hashes detect inconsistent or changed files. Describe them as local integrity evidence. They do not prove which remote model weights served a request.

Keep evidence outside the source working tree. Provide a durable export so a build's results remain available after the worker is removed.

## 9. Verification and acceptance

Mechanical checks must establish:

- Identical engine, content, seed, and actions produce identical state hashes.
- Saving, restoring, and replaying preserve the expected state.
- Available choices execute correctly; stale or illegal choices cannot change state.
- Player observations exclude hidden facts.
- Quest outcomes reach the persistent campaign correctly.
- The player cannot access developer capabilities or information.
- Interviews remain linked to their original player sessions.
- Quota and transport failures cannot appear as successful experience evidence.

Use focused regression tests and bounded exploration of mechanics. Measure verification time. Each added check should address a named failure risk.

The acceptance states are:

| State | Requirement |
| --- | --- |
| Mechanically verified | The applicable deterministic checks pass. |
| Live tested | The exact build has a verified blind session and an authentic exit interview. |
| Improvement supported | A comparable fresh test group supports the intended change. |

Development and playtesting may run independently. A product milestone cannot complete without live evidence. Quota exhaustion leaves its experience status pending.

For an experience change, define the question and acceptance rule before running the comparison. Keep builds frozen during each run.

Use comparable seeds and the same player instructions, model settings, and interview questions where practical. Use fresh player conversations for each build.

Start with small test groups to find problems. Record their limits. Increase sample size when a decision needs stronger evidence. Keep model and provider groups identifiable.

## 10. Development cycle

1. Select one observed problem or one explicit product objective.
2. Link the task to the relevant interview passages and action trace.
3. State the intended behavior change and how it will be checked.
4. Make one focused change.
5. Pass the applicable mechanical checks and freeze the candidate build.
6. Run fresh blind players through subscription access.
7. Capture authentic interviews and compare the evidence.
8. Accept, revise, or reject the change. Record the decision and its limits.

A test pass establishes mechanical correctness within the tested scope. A change in player experience requires live evidence.

Use one task intake and one evidence index initially. Add more coordination only when a demonstrated need requires it.

## 11. Implementation order

| Stage | Deliverable | Required proof |
| --- | --- | --- |
| 1. Subscription path | Minimal deterministic scene and isolated player runner | One real keyless session, game exit, and authentic interview |
| 2. Small game | Town, expedition, distinct solutions, and changed return | Replay, save/restore, player projection checks, and fresh live feedback |
| 3. First improvement | One feedback-led game change | Baseline and candidate evidence with original interviews |
| 4. Repeat | A second complete improvement cycle | Another supported change without manual evidence fabrication |
| 5. Extend | Additional stories, mechanics, or provider adapters | Existing behavior remains verified and new experience receives live tests |

Do not make broad content migration or a large provider catalog prerequisites for Stage 1.

When using the old project as a reference, reuse proven concepts and selected content. Keep the new player isolated from that reference material.

## 12. First task for the implementing agent

Read this specification and inspect the target workspace. If existing project instructions apply, follow them and identify material conflicts before changing their rules.

Implement Stage 1 first. Select one supported subscription path and prove its effective isolation boundary. Use a minimal game scene to complete a live session and its interview.

Keep an explicit distinction between implemented code, passing mechanical checks, and observed live results. If access is unavailable, report the exact blocker and leave live acceptance pending.

After Stage 1 passes, build the small game and complete two feedback-led improvement cycles. Keep implementation decisions reversible and the current instructions short.

## 13. Reference basis

This specification follows the review of [zork-unlimited at revision 700e523](https://github.com/michaelcrosato/zork-unlimited/tree/700e523648101f0a684bf5bdaf9d78274e6fd865). It proposes a new implementation; it does not report completed work.

The retained purpose comes from the project's [vision](https://github.com/michaelcrosato/zork-unlimited/blob/700e523648101f0a684bf5bdaf9d78274e6fd865/docs/VISION.md).

The smaller player interface addresses the session and transport instructions in the reviewed [player prompt](https://github.com/michaelcrosato/zork-unlimited/blob/700e523648101f0a684bf5bdaf9d78274e6fd865/blind-tester/prompt-overworld.md).

The pacing priority reflects the historical pilot findings in the [starting-slice record](https://github.com/michaelcrosato/zork-unlimited/blob/700e523648101f0a684bf5bdaf9d78274e6fd865/docs/STARTING_SLICE.md). Those findings do not establish the quality of a later build.

Codex subscription sign-in and saved CLI authentication are documented in [OpenAI authentication](https://learn.chatgpt.com/docs/auth) and [noninteractive mode](https://learn.chatgpt.com/docs/non-interactive-mode). Direct integration options are documented in [Codex App Server](https://learn.chatgpt.com/docs/app-server).

Claude subscription access is documented in [Claude Code authentication](https://code.claude.com/docs/en/authentication). Check the [programmatic execution documentation](https://code.claude.com/docs/en/headless) before choosing isolation flags: the reviewed documentation states that `--bare` does not use subscription login.

Provider documentation was checked during the review on 2026-09-04. Recheck relevant capabilities when implementing or changing an adapter.
