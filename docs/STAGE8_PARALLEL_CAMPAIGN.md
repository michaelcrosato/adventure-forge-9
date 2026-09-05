# Parallel campaign activity — prospective contract

Status: selected for implementation, before source changes or live dispatch.
Behavior baseline is `8b2be2c`; its wording comparison is complete, but both
Stage 7 regional exposure batches failed at 1/3. Preserve those failures and
the limited clarity observation in `STAGE7_REEDWAY.md`. This is a structural
step toward the full explorable-world goal, not another wording comparison
or a claim that the interviews establish a cause for non-entry.

## Player behavior

After resolving the first local water/evacuation account and opening its
Archive case, the player can investigate that case or visit Reedway in either
order. This wave does not offer Reedway before the case is opened. An open Archive
case can be paused and resumed without losing or replaying evidence. Reedway
remains accessible after the verdict and after Blackglass. Its existing
scarce regulator, competing facilities and services provide the activity;
no new empty location or synthetic world count is needed.

Earlier Reedway supplies can now fund the Blackglass ledge brace or repair
of Nessa's trust. The Archive has no supply consumer; its direct new regional
consequence is Sera's personal credit favor. Clinic medicine remains useful
for Reedway care; the existing later chapters have no medicine consumer, so
do not claim a new cross-chapter medicine benefit. Earlier water/evacuation resolution and
local closure costs must already be final before regional access. No new
link returns to initial preparation or the sluice controls.

## Phase and navigation contract

Add one monotone flag, `archive-verdict-recorded`. Set it true on all six
actual verdict choices: `publish-vask-and-name-mara`,
`publish-vask-anonymously`, `publish-technical-record`,
`compel-vask-under-oath`, `seal-mara-testimony` and
`negotiate-provisional-record`. All six require it false. It records the
decision phase without changing the distinct historical outcome flags.

- `explore-reedway-before-archive`: `lantern-landing` to `reedway-commons`,
  requiring `archive-started=true`, verdict-recorded=false,
  archive-returned=false and blackglass-resolved=false.
- `pause-archive-investigation`: `archive-hall` to `lantern-landing`,
  requiring verdict-recorded=false. `enter-lantern-hall` also requires that
  phase, preventing a closed case from being reopened through the landing.
- `explore-reedway-before-blackglass`: `lowsail-reckoning` to the commons,
  requiring verdict-recorded=true. Despite its stable ID, its label/copy
  should describe a visit accurately on later record revisits too.
- `return-to-open-archive-from-reedway`: commons to `lantern-landing`,
  requiring archive-started=true and verdict-recorded=false.
- `return-to-archive-record-from-reedway`: commons to `lowsail-reckoning`,
  requiring verdict-recorded=true. This remains a safe record revisit after
  Blackglass, with the resolved verdict preserved.
- Both existing regional returns to `lowsail-after-blackglass` and
  `blackglass-quay` require blackglass-resolved=true. Early regional play
  must not reach settled-history scenes or bypass the pressure sequence.
- `close-archive-case` and `continue-to-blackglass` require
  archive-returned=false and blackglass-resolved=false. Later record visits
  do not repeat the already closed account or its continuation.
- `leave-lowsail-reckoning` keeps its original open-record departure and
  receives those same two phase guards. Its receipt must not claim an open
  record after closure. Later visits retain global End and free return routes.
- Add `return-to-lowsail-from-archive-record` from `lowsail-reckoning` to
  `lowsail-after-blackglass`, requiring archive-returned=true and
  blackglass-resolved=true. Reedway access also remains available there.

Every new navigation action is free `goTo` only. This wave keeps Blackglass
as a bounded timed expedition: regional links do not enter or leave an
unfinished crossing. The existing crossing retreats retain their behavior.
All original completion/departure choices remain reachable in their proper
phase. Initial local followthrough scenes, their costs, the original water
outcomes and the pressure clock are not reopened or reset.

## Inhabitants and presentation

Landing, reckoning and commons text must name the currently open destinations
and distinguish an open case from a decided or already carried record.
Both Reedway completed choices must explicitly label and describe finishing
the entire journey, including when an Archive case remains open. Installation
already records a facility result; players who want to continue use the free
return paths. Preserve both existing terminal effects and receipts.

Show the regulator task before entry, distinguish a part still on the barge
from a carried part, and stop requesting an installation once either facility
has it. Keep explicit journey-ending labels and describe visits as optional.
Do not describe a first regional arrival as a revisit. Do not direct the
player along an evaluation route or promise free services
merely because travel is free.

Establish Sera Vale's existing dual role explicitly: the Archive keeper also
owns the stranded barge and is responsible for its crew. The same character
keeps public evidence available even after a seizure, but refuses a personal
credit favor while hostile. Add `reedway-salvager-hostile=false` to
`surrender-council-seal-for-ledger`; the public stacks remain an alternative.
The hall must explain that refusal when it matters. Cooperative credit text
must appear only while its ledger/debt conditions are still relevant, not
after the favor has already been used. Existing Milo care restores Sera's
cooperation; a later seizure can damage it again. Do not erase either deed,
retroactively remove evidence or withdraw a completed debt reduction.

Correct the separately observed own-kit contradiction by attributing its
existing Risk cost to worn fittings, rather than calling personal gear
unfamiliar. Preserve its ownership, costs and benefits. No new relationship
meter, resource or engine vocabulary is needed for this wave.

The proposed Mara transport relay is not selected: existing protection can
already include her brother, and a new request needs a concrete conflict
before three alternative fees would add meaningful interaction depth.

## Verification and evidence

Independent behavioral checks must cover all three local origins, both
quest orders, partial Archive evidence followed by regional work and exact
resume, all six verdict phase writes, and closed-case revisit safety. Prove
navigation cannot reach an unresolved Blackglass hub, initial preparation or
sluice resolution. Repeat actual loops and compare resources, flags, facts
and legal choices; save/restore/replay must preserve the same state.

From the same council-origin prefix, compare cooperative and seized-regulator
routes before opening the official file: the credit favor must differ while
the public investigation remains completable. Treating Milo after seizure
must restore the favor if still unused; a used favor cannot repeat or be
revoked. Demonstrate one concrete early ferry-reward use in Blackglass
and preserve shortages, regulator exclusivity, once-only rewards/services,
all old outcomes and global completion routes.

Run the complete current audit at its existing 250,000-family guard and keep
any failure. Interleaving Archive and Reedway flags/resources may create a
substantial state cross-product. Do not delete meaningful distinctions,
weaken congruence/completion requirements, or shrink the activity to fit the
guard. A size-only diagnostic is not full verification. Any further method
or workload decision requires explicit measurements and proof obligations.

Before fresh players, pass full `npm run verify`, independently review the
new routes/copy, and complete a stateless browser journey with a paused case,
regional outcome, resumed case, decided-record revisit, mobile rendering,
save restoration and actual request-envelope measurement. Freeze the exact
source separately; existing saves retain strict build binding and are not
migrated by rewriting identities.

Then dispatch exactly three fresh neutral Luna/max games, seeds 1–3, with
the unchanged instructions, interview questions and 60-turn ceiling. Retain
every attempt and verify/export original source/isolation/replay/interviews.
Initial regional acceptance still requires at least two natural entries and
allocations, intact evidence, median clarity >=4 and no blocking defect.
Count actual quest order, pauses/resumes, claimant visits and changed returns;
do not infer them from ratings or replay interest. This is an initial
structural wave, not a matched clarity comparison or final world acceptance.

## Ownership

Manager owns contract, integration, performance decisions, browser checks,
acceptance and publication. Content author owns `lantern.ts`, `reedway.ts`
and `blackglass.ts` in an isolated checkout. Independent reviewer owns a
new parallel-campaign regression file; manager owns the small own-kit copy
change in `scenario.ts`. No worker may change the audit guard or remove a
source condition to make a test pass.
