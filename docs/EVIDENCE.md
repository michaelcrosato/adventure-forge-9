# Evidence index

Evidence states are separate: implemented, mechanically verified, live tested, improvement supported.

## Initial mechanical checks

2026-09-04: `npx tsx --test tests/*.test.ts` passed 11 tests in 181 ms (Node-reported test duration). Coverage: deterministic minimal routes, projection fields, people/cargo outcomes, departure/death/completion, stale and illegal no-op, save/replay, schema rejection, evidence integrity, HTTP operation/revision handling, malformed requests, and static path rejection.

This was preliminary integration evidence, superseded by the integration recheck below. These tests do not establish live player quality or large-world breadth.

## Initial browser check

A local browser rendered the ferry crisis, chose the rescue route, returned to the South Quay, and completed the rescue. No browser errors were reported. Screenshots were captured locally in `/tmp/af9-stage1-desktop.png` and `/tmp/af9-stage1-return.png`.

Manager review requested a compact action-first layout, a visible ending receipt, and removal of internal IDs from the human UI. The integration recheck below verifies these edits.

## Live runs

Use `npm run evidence -- list` as the authoritative inventory of attempted games, including interrupted and unsealed records. Specialist audits are preserved separately in `~/.local/share/adventure-forge-9/capability-probes`. A mechanical test or builder walkthrough cannot substitute for a blind player interview.

### Stage 1 accepted run

Frozen source commit: `04b492bc96f19d17a94b23c0e32c5b3b0a163efc`. Build: `af9-49051eed9606c3a2a6a7b777`. Source snapshot SHA-256: `0113f116eb502b6c6f6b5f5e707a8b03ec0e7bee377a77e537de66f13839bef7`. GitHub CI [passed](https://github.com/michaelcrosato/adventure-forge-9/actions/runs/33933972795).

The specialist audit `2026-09-05T00-44-33-936Z-2925c550` passed all eight checks: managed ChatGPT auth, verified isolation, pinned client/source, effective config, no forbidden calls, protected canary, and no capabilities reported. Its original response reported no exposed tools or file/repository/browser/network access. This supports the reviewed client/config boundary; it is not remote model attestation. Manifest and 75-event chain verify.

Blind run `2026-09-05T00-44-53-519Z-754bbebc` used a different fresh thread, `gpt-5.6-luna`/`max`, seed 1. It chose `rescue-people`, then `finish-rescue`, and received a completed receipt at revision 2. The same conversation answered the original free-form questions and structured interview. No formatting recovery was needed. Integrity, 247-event chain, original response linkage, final state, and deterministic replay passed; `liveAccepted: true`. Elapsed runner time: 17.838 seconds. Attempts: 1/1 completed game; 1/1 completed specialist audit. No failed live attempts in this milestone.

Original free-form interview:

> 1. I was trying to decide whether to save six people or preserve the fever medicine, then accept the consequences.
> 2. Cutting the cargo loose mattered most because it prioritized the trapped people.
> 3. I wasn’t unable to proceed. The consequences of losing the medicine were uncertain, but the choice was clear.
> 4. Seeing the survivors reunite with their families.
> 5. Knowing the medicine was lost despite families needing it.
> 6. I would start another run to see what happens if I save the cargo instead.

Structured results: clarity 5/5, enjoyment 4/5, no confusion or defects reported, stated willingness to replay. Original reason: “The choices and consequences were clear, and the moral dilemma was engaging. I would try another run to save the medicine and compare the outcome.” No second run was observed in that conversation. One player does not establish general quality, improvement, or large-world breadth.

Local preserved originals: `~/.local/share/adventure-forge-9/runs/2026-09-05T00-44-53-519Z-754bbebc/` and the audit directory above. Hashed durable exports: `~/.local/share/adventure-forge-9/exports/stage1-blind-rescue.tar.gz` and `stage1-capability-audit.tar.gz`, each with a `.sha256` sidecar checked successfully. Each archive includes its exact source snapshot and original events. Files are sealed read-only; hashes prove local integrity, not external notarization. These are local artifacts, not public release uploads.

Decision: accept Stage 1 pipeline. Continue to the full small game; show the downstream clinic consequences explicitly. This decision is not a measured improvement claim.

## Improvement comparisons

The full small-game implementation and its accepted exploratory interview are recorded in [STAGE2.md](STAGE2.md). [CYCLE1.md](CYCLE1.md) predeclares and records the first prospective comparison. Keep original player responses and exact source snapshots; do not infer improvement from implementation alone.

## Integration recheck

The compact browser UI was exercised at 1280×577 and 390×844. Mobile document width stayed within the viewport. The cargo route reached a completed ending with its visible receipt, and ending export was disabled while still playing. The revised projection displays readable known facts rather than internal IDs. No browser errors were reported. Final screenshots: `/tmp/af9-stage1-desktop-final.png`, `/tmp/af9-stage1-mobile.png`.

The mechanical suite now has 16 passing test cases, including rehashed checkpoint rejection, cumulative resource checks, effective isolation assertions, and synthetic protocol tamper checks. Synthetic fixtures explicitly cannot grant live acceptance.

The pinned Codex 0.153.3 App Server initialized using the proposed capability configuration. `config/read` plus resolved session-flag layers confirmed the overrides. This preflight made no model call and is not a live playtest. Exact source reviewed: `openai/codex` tag `rust-v0.153.3`, commit `b1a547b1f73ce86205d9222ac19cff334b3b7a2e`.
