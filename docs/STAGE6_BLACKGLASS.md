# Blackglass Works — timed traversal wave

Status: isolated engine and content work in progress. Not integrated, live tested, published or accepted. The full requested world breadth and depth remain the completion target.

The prior turn delivered the Archive expansion and verified its public deployment. This wave should add a different interaction: acting changes a tide/patrol window, routes carry different timing and risk costs, and a companion's willingness to help follows earlier choices. A new wrapper around ordinary choices, another evidence counter, or duplicated water/Archive context would not add that behavior.

## Engine contract

Keep existing GameState and player operations. Add optional validated scenario clock declarations `{ id, resource, max }`, with an existing initial resource in bounds. Add `resourceAtMost` conditions and an `advanceClock` effect with a positive safe-integer delta that saturates at the declared maximum. A clock resource may not be written through ordinary `setResource` or `adjustResource` effects. References, unique clock/resource ownership, bounds, effect sequencing and unknown properties must fail validation when invalid.

The clock is part of the existing resource map and therefore participates in state hashes, saves and replay. Authored observations expose the tide value and its practical effect without hidden flags or implementation metadata. No duplicate campaign-context object or relationship map is needed for this first system; meaningful aid and trust changes may use existing flags, with their limits stated honestly.

Future-read analysis must explicitly recognize the new closed vocabulary and continue retaining all resources. No unknown-effect fallback, completion-check relaxation or silent state-limit increase is authorized. Current published content is 76,117 canonical states under a 100,000-state audit bound. New content needs its own measured audit; counts from a previous snapshot cannot establish its completion paths.

## Area contract

Seven scenes: Blackglass Quay, Reedway Crossing, Council Watchpost, Worker Barracks, Conduit Gallery, Pressure Control and Lowsail Return. Nessa Quill wants the shared works protected; Orin Pell wants workers and displaced families safe; Captain Varo Dey wants the checkpoint and council authority respected. Reach the pressure controls before the surge, make a consequential control decision, revisit the Quay with changed reactions, and return to Lowsail.

Keep `close-archive-case` as a valid terminal choice. A new opt-in continuation must apply its exact closure effects before entering Blackglass. Preserve all earlier chapter endings and old witnesses.

At least three distinct approaches:

- Open haul reaches the watched post, advances tide and incurs attention/risk.
- A conduit route uses an available low-tide/low-risk window and an inherited Archive posture to bypass the checkpoint.
- Nessa/workers can provide an assisted route and a safer control action when earned; coercing Mara affects Nessa's willingness to participate. Repairing trust needs a real bounded cost.

Shared water, council control, evacuation and public/sealed/provisional Archive outcomes must change legal approaches or consequences. Timing and risk must change an actual later choice and return result, not just cosmetic counters. Clock saturation cannot turn repeated navigation into an unbounded resource farm. Ordinary navigation remains possible; one-time costs and resolutions need explicit guards. A missed safe window must retain a credible costly resolution rather than strand the campaign.

## Prospective acceptance

Declare these requirements before new live players:

1. Existing checks pass. New tests prove clock validation/bounds, timing-gated choices, meaningful route counterfactuals, companion assistance/refusal, and save/restore/replay parity. At least three inherited water/Archive witness paths exercise the new chapter with different approaches/results.
2. Full traversal establishes every authored scene/choice is reachable, balances and revisions remain valid, and every unfinished state has a completed path. Report the exact candidate, state/transition counts and timing. Do not infer coverage from a previous commit or just the presence of an exit choice.
3. Measure the longest authored witness's actual `/api/choose` JSON envelope, including the checkpoint string and escaping, against the 256 KiB request limit. Verify a real handler request and a mid-area reload. Repeated navigation and world-scale save capacity remain separate limits.
4. Browser and terminal share the same visible rules. Verify a complete cross-area browser journey, the hazard/timing choices, a mid-area resume, ending receipt, save download/reload and mobile layout. Inspect the actual rendered result.
5. Freeze the source and run three fresh neutral Luna/max subscription players at seeds 1–3 with the existing gameplay/interview protocol. Preserve every attempt and original response. Require all attempts to have intact evidence/replay and complete interviews, at least two natural Blackglass entries and control encounters, median clarity at least 4/5, and no observed blocking defect. Investigate concrete contradictions and confusing consequences even if ratings pass. Insufficient exposure leaves experience acceptance pending; mechanical traces do not substitute for it.

This is a first timed-traversal chapter. It does not establish combat depth, a full companion system, world-scale content or general player enjoyment. Report implemented, mechanically verified, naturally experienced and supported-improvement claims separately.

## Ownership and evidence

- Engine branch/worktree: `bounded-clocks`, `/tmp/af9-bounded-clocks`; engine/types/validation/audit and focused tests.
- Content branch/worktree: `blackglass-content`, `/tmp/af9-blackglass-content`; authored area and scenario integration.
- Independent read-only reviewer: clock bounds, adversarial input, trust boundary and replay/audit implications.
- Manager: integration, narrative/causal review, full audit, live dispatch/evidence, browser verification and publication.

No current clock/content candidate is accepted. Findings and exact artifacts will be added as work is reviewed.
