# Evidence index

Evidence states are separate: implemented, mechanically verified, live tested, improvement supported.

## Initial mechanical checks

2026-09-04: `npx tsx --test tests/*.test.ts` passed 11 tests in 181 ms (Node-reported test duration). Coverage: deterministic minimal routes, projection fields, people/cargo outcomes, departure/death/completion, stale and illegal no-op, save/replay, schema rejection, evidence integrity, HTTP operation/revision handling, malformed requests, and static path rejection.

This was preliminary integration evidence, superseded by the integration recheck below. These tests do not establish live player quality or large-world breadth.

## Initial browser check

A local browser rendered the ferry crisis, chose the rescue route, returned to the South Quay, and completed the rescue. No browser errors were reported. Screenshots were captured locally in `/tmp/af9-stage1-desktop.png` and `/tmp/af9-stage1-return.png`.

Manager review requested a compact action-first layout, a visible ending receipt, and removal of internal IDs from the human UI. The integration recheck below verifies these edits.

## Live runs

No accepted live run yet. The provider capability boundary passed source/config/initialization checks and awaits the separate specialist live audit. Use `npm run evidence -- list` as the authoritative inventory of attempted games, including interrupted and unsealed records. Specialist audits are preserved separately in `~/.local/share/adventure-forge-9/capability-probes`. A mechanical test or builder walkthrough cannot substitute for a blind player interview.

## Improvement comparisons

None completed. Define each comparison before fresh baseline/candidate sessions; keep original player responses and exact source snapshots. Do not infer improvement from implementation alone.

## Integration recheck

The compact browser UI was exercised at 1280×577 and 390×844. Mobile document width stayed within the viewport. The cargo route reached a completed ending with its visible receipt, and ending export was disabled while still playing. The revised projection displays readable known facts rather than internal IDs. No browser errors were reported. Final screenshots: `/tmp/af9-stage1-desktop-final.png`, `/tmp/af9-stage1-mobile.png`.

The mechanical suite now has 16 passing test cases, including rehashed checkpoint rejection, cumulative resource checks, effective isolation assertions, and synthetic protocol tamper checks. Synthetic fixtures explicitly cannot grant live acceptance.

The pinned Codex 0.153.3 App Server initialized using the proposed capability configuration. `config/read` plus resolved session-flag layers confirmed the overrides. This preflight made no model call and is not a live playtest. Exact source reviewed: `openai/codex` tag `rust-v0.153.3`, commit `b1a547b1f73ce86205d9222ac19cff334b3b7a2e`.
