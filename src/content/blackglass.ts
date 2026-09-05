import type { ChoiceData, ClockData, SceneData } from "./scenario.js";

/**
 * Blackglass Works is a short continuation after the Lantern Archive.  The
 * tide is an authored clock rather than a second copy of any water outcome:
 * every crossing action advances it, and the pressure room turns a late
 * arrival into a scarred but still completable return.
 *
 * The clock and the two clock vocabulary entries are intentionally kept as
 * plain data here.  The engine owns their validation and application.
 */
export const BLACKGLASS_CLOCKS = [
  { id: "blackglass-tide", resource: "tide", max: 3 },
] as const satisfies readonly ClockData[];

export const BLACKGLASS_SCENES = [
  {
    id: "blackglass-quay",
    title: "Blackglass Quay",
    text: [
      {
        text: "Blackglass Works rises over the upriver channel. Orin Pell, a shift foreman, points to the pressure line; Captain Varo Dey holds the watch roster; Nessa Quill reads the tide marks. The lower shutters will fail unless someone reaches the control room. Tide starts at 0; at 3 the surge arrives. Crossing choices show how much time they take.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: false }],
      },
      {
        text: "For an undamaged repair, reach the controls at Tide 2 or lower and Risk 2 or lower. At Risk 3 or higher, Varo's watch forces a hurried setting that damages the line unless Nessa has agreed to help. At Tide 3, even her help cannot prevent pressure damage.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: false }],
      },
      {
        text: "The shared-water marks give Nessa a maintenance line through the works.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: false }, { type: "flag", flag: "shared-water", value: true }],
      },
      {
        text: "The council seal can open Varo's gate, but his watch will record who used it.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: false }, { type: "flag", flag: "council-control", value: true }],
      },
      {
        text: "Bram's high-ground rope line reaches the works. Orin can move the workers before the next surge.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: false }, { type: "flag", flag: "evacuation-plan", value: true }],
      },
      {
        text: "The Archive's public verdict is posted at the quay. Lantern patrols are looking for the person who carried it upriver.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: false }, { type: "flag", flag: "archive-verdict-exposed", value: true }],
      },
      {
        text: "The Archive kept its witness behind a seal. The night crew offers a quieter line through the works.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: false }, { type: "flag", flag: "archive-verdict-sealed", value: true }],
      },
      {
        text: "Mara's coerced account follows you here. Nessa will ask for repair in deeds before she lends a hand.",
        when: [{ type: "flag", flag: "archive-witness-coerced", value: true }, { type: "flag", flag: "blackglass-nessa-aid", value: false }, { type: "flag", flag: "blackglass-resolved", value: false }],
      },
      {
        text: "Nessa keeps her distance. The pressure line holds, but you left Mara's coerced summons unanswered.",
        when: [{ type: "flag", flag: "archive-witness-coerced", value: true }, { type: "flag", flag: "blackglass-nessa-aid", value: false }, { type: "flag", flag: "blackglass-resolved", value: true }],
      },
      {
        text: "The pressure line is settled. Nessa and Orin wait for your account before the next boat leaves for Lowsail.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
      },
      {
        text: "You return with the line steady and the works' cover intact.",
        when: [
          { type: "flag", flag: "blackglass-resolved", value: true },
          { type: "flag", flag: "blackglass-pressure-scarred", value: false },
          { type: "resourceAtMost", resource: "risk", value: 2 },
        ],
      },
      {
        text: "The line is steady, but the watch has marked the account and will remember this crossing.",
        when: [
          { type: "flag", flag: "blackglass-resolved", value: true },
          { type: "flag", flag: "blackglass-pressure-scarred", value: false },
          { type: "resourceAtLeast", resource: "risk", value: 3 },
        ],
      },
      {
        text: "You return with the pressure line scarred from the surge. It holds, but the works will need the mark repaired later.",
        when: [{ type: "flag", flag: "blackglass-pressure-scarred", value: true }],
      },
      {
        text: "Nessa stands beside you after the crossing. Her repair knowledge made the route safer.",
        when: [{ type: "flag", flag: "blackglass-nessa-aid", value: true }, { type: "flag", flag: "archive-witness-coerced", value: false }],
      },
      {
        text: "Nessa stands beside you after the crossing. The supply you spent repaired the trust Mara's summons broke.",
        when: [{ type: "flag", flag: "blackglass-nessa-aid", value: true }, { type: "flag", flag: "archive-witness-coerced", value: true }],
      },
    ],
  },
  {
    id: "reedway-crossing",
    title: "Reedway Crossing",
    text: [
      {
        text: "The reedway divides around a flooded cut. The tide is already climbing the blackglass steps; every crossing action spends another beat before the pressure room.",
      },
      {
        text: "A public Archive verdict has put lanterns on the open route.",
        when: [{ type: "flag", flag: "archive-verdict-exposed", value: true }],
      },
      {
        text: "A sealed or provisional Archive record gives the night crew cover, if you can reach it before the water turns.",
        when: [{ type: "flag", flag: "archive-verdict-sealed", value: true }],
      },
      {
        text: "The provisional record has not named a culprit, but its route marks still open a quiet crossing.",
        when: [{ type: "flag", flag: "archive-verdict-negotiated", value: true }],
      },
      {
        text: "Mara's coerced account keeps Nessa off the rope line. Orin can still get you to the barracks, but the trust repair will be yours to make.",
        when: [{ type: "flag", flag: "archive-witness-coerced", value: true }],
      },
    ],
  },
  {
    id: "council-watchpost",
    title: "Varo's Watchpost",
    text: [
      {
        text: "Captain Varo Dey watches the catwalk with a shuttered lamp. A wrong step will put your name in his report before the pressure gates close.",
      },
      {
        text: "The council's ration mark makes Varo pause. He will accept its seal, but the favor becomes a fresh obligation.",
        when: [{ type: "flag", flag: "council-control", value: true }],
      },
      {
        text: "Varo has written the council favor into his ledger. The gate will open for you, but the debt will follow the return.",
        when: [{ type: "flag", flag: "blackglass-council-favor", value: true }],
      },
      {
        text: "The public Archive notice has made the watch more alert. Running saves time but draws attention; waiting lets the tide rise.",
        when: [{ type: "flag", flag: "archive-verdict-exposed", value: true }],
      },
    ],
  },
  {
    id: "worker-barracks",
    title: "Blackglass Barracks",
    text: [
      {
        text: "Orin Pell keeps the workers above the sluice floor. Nessa checks one dry rope for the last turn into the control room.",
      },
      {
        text: "There is still time to reach the handwheels before the surge.",
        when: [{ type: "resourceAtMost", resource: "tide", value: 1 }],
      },
      {
        text: "The next crossing will carry you past the surge. The line will need an emergency release; Nessa's help can keep it from drawing more attention.",
        when: [{ type: "resourceAtLeast", resource: "tide", value: 2 }],
      },
      {
        text: "The evacuation line makes the workers ready to follow Orin's hand signals.",
        when: [{ type: "flag", flag: "evacuation-plan", value: true }],
      },
      {
        text: "Nessa remembers that Mara was compelled. She will not call the route safe until you repair the trust that coercion broke.",
        when: [{ type: "flag", flag: "archive-witness-coerced", value: true }, { type: "flag", flag: "blackglass-nessa-aid", value: false }],
      },
      {
        text: "Nessa takes the rope beside you. The workers will follow her signals through the last turn.",
        when: [{ type: "flag", flag: "blackglass-nessa-aid", value: true }],
      },
    ],
  },
  {
    id: "conduit-gallery",
    title: "Conduit Gallery",
    text: [
      {
        text: "The gallery narrows to a wet ledge above the pressure pipes. The next choice decides whether you move with the current or wait for cover.",
      },
      {
        text: "A clean setting requires reaching the control room before Tide 3 and with Risk 2 or lower. At Risk 3+, the watch interrupts unless Nessa has agreed to help.",
      },
      {
        text: "Nessa's shared-repair marks still point to a brace that can carry your weight.",
        when: [{ type: "flag", flag: "shared-water", value: true }, { type: "resourceAtMost", resource: "risk", value: 1 }],
      },
      {
        text: "Lanterns sweep the gallery because the Archive's public notice followed you upriver.",
        when: [{ type: "flag", flag: "archive-verdict-exposed", value: true }],
      },
      {
        text: "The sealed Archive record gives the night crew a cover signal in the gallery.",
        when: [{ type: "flag", flag: "archive-verdict-sealed", value: true }],
      },
      {
        text: "The provisional record leaves a quiet route open, though nobody can promise how long it will stay quiet.",
        when: [{ type: "flag", flag: "archive-verdict-negotiated", value: true }],
      },
    ],
  },
  {
    id: "pressure-control",
    title: "Pressure Control Room",
    text: [
      {
        text: "Three handwheels feed the Blackglass pressure line. Orin calls the sequence from the floor while the tide pounds the lower shutters.",
      },
      {
        text: "The tide has reached the warning marks. A clean setting is still possible if you act before the next beat.",
        when: [{ type: "resourceAtLeast", resource: "tide", value: 2 }, { type: "resourceAtMost", resource: "tide", value: 2 }, { type: "resourceAtMost", resource: "risk", value: 2 }],
      },
      {
        text: "The tide has filled the warning marks. Only an emergency release or Nessa's practiced hand can hold the line now.",
        when: [{ type: "resourceAtLeast", resource: "tide", value: 3 }],
      },
      {
        text: "Your route has drawn enough attention that the control room will remember who held the valve.",
        when: [{ type: "resourceAtLeast", resource: "risk", value: 3 }],
      },
      {
        text: "Nessa has worked these governors for years. Before the surge she can set the line cleanly even under watch; afterward she can hold an emergency release without drawing more attention, but the pressure will still damage the line.",
        when: [{ type: "flag", flag: "blackglass-nessa-aid", value: true }],
      },
    ],
  },
  {
    id: "lowsail-after-blackglass",
    title: "Lowsail After Blackglass",
    text: [
      {
        text: "The boat reaches Lowsail before dawn. Blackglass has a working pressure line, and the account you bring back will change who trusts the next crossing.",
      },
      {
        text: "Nessa's shared channel now has a second set of pressure marks to defend against a new diversion.",
        when: [{ type: "flag", flag: "shared-water", value: true }],
      },
      {
        text: "Varo's watch records the council favor you called in. Council control reaches farther upriver than it did before.",
        when: [{ type: "flag", flag: "blackglass-council-favor", value: true }],
      },
      {
        text: "Council control reaches the works, but you left Varo's favor unused.",
        when: [{ type: "flag", flag: "council-control", value: true }, { type: "flag", flag: "blackglass-council-favor", value: false }],
      },
      {
        text: "Orin can extend the high-ground evacuation line toward the repaired works. The families now have another working route upriver.",
        when: [{ type: "flag", flag: "evacuation-plan", value: true }],
      },
      {
        text: "The public Archive verdict has made the works visible to every patrol between here and the quay.",
        when: [{ type: "flag", flag: "archive-verdict-exposed", value: true }],
      },
      {
        text: "Mara's coerced testimony is still part of the journey. Nessa measures the new account against what you made her carry.",
        when: [{ type: "flag", flag: "archive-witness-coerced", value: true }],
      },
      {
        text: "Nessa's aid survived the crossing. The supply you spent bought a chance to repair the working relationship.",
        when: [{ type: "flag", flag: "archive-witness-coerced", value: true }, { type: "flag", flag: "blackglass-nessa-aid", value: true }],
      },
      {
        text: "You set the pressure before the next surge and bring back a clean account.",
        when: [
          { type: "flag", flag: "blackglass-pressure-scarred", value: false },
          { type: "resourceAtMost", resource: "risk", value: 2 },
        ],
      },
      {
        text: "The line holds after the hard crossing. The watch and the pressure scar will shape the next journey.",
        when: [{ type: "flag", flag: "blackglass-pressure-scarred", value: true }],
      },
      {
        text: "The line is steady, but the watch will remember the attention you drew on the way in.",
        when: [
          { type: "flag", flag: "blackglass-pressure-scarred", value: false },
          { type: "resourceAtLeast", resource: "risk", value: 3 },
        ],
      },
    ],
  },
] as const satisfies readonly SceneData[];

export const BLACKGLASS_CHOICES = [
  {
    id: "continue-to-blackglass",
    scene: "lowsail-reckoning",
    label: "Carry the closed record to Blackglass Works",
    description: "Close the Archive account exactly as recorded, then take its consequences upriver to the pressure works.",
    effects: [
      { type: "setFlag", flag: "archive-returned", value: true },
      { type: "addFact", fact: "archive-case-closed" },
      { type: "goTo", scene: "blackglass-quay" },
    ],
  },
  {
    id: "begin-blackglass-crossing",
    scene: "blackglass-quay",
    label: "Enter the Blackglass Works",
    description: "Take the pressure map from Nessa and cross the reedway before the next tide mark.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: false }],
    effects: [{ type: "goTo", scene: "reedway-crossing" }],
  },
  {
    id: "leave-blackglass-quay",
    scene: "blackglass-quay",
    label: "Leave Blackglass for now",
    description: "Turn back before taking responsibility for the pressure line.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: false }],
    effects: [],
    outcome: { status: "departed", summary: "You leave Blackglass before entering the works. The pressure line and its next failure remain upriver." },
  },
  {
    id: "return-to-lowsail-from-blackglass",
    scene: "blackglass-quay",
    label: "Return to Lowsail with the pressure account",
    description: "Bring Orin's working line and Nessa's marks back to the town that sent you.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
    effects: [{ type: "goTo", scene: "lowsail-after-blackglass" }],
  },
  {
    id: "leave-after-blackglass",
    scene: "blackglass-quay",
    label: "Leave the works behind",
    description: "Depart after the pressure line is set, leaving the full account for someone else to carry.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
    effects: [],
    outcome: { status: "departed", summary: "You leave Blackglass after setting the line. The works keep the pressure account, but Lowsail hears only the part you carried back." },
  },
  {
    id: "take-council-catwalk",
    scene: "reedway-crossing",
    label: "Take Varo's guarded catwalk",
    description: "Use the council's route through the watchpost. Tide +1; Varo will ask for a recorded favor at the gate.",
    when: [{ type: "flag", flag: "council-control", value: true }, { type: "resourceAtMost", resource: "tide", value: 2 }],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "council-watchpost" }],
  },
  {
    id: "take-shared-maintenance-line",
    scene: "reedway-crossing",
    label: "Take Nessa's maintenance line",
    description: "Follow the shared repair marks through the conduit while the current and patrols are low. Tide +1; the line stays quiet.",
    when: [
      { type: "flag", flag: "shared-water", value: true },
      { type: "resourceAtMost", resource: "tide", value: 1 },
      { type: "resourceAtMost", resource: "risk", value: 2 },
    ],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "conduit-gallery" }],
  },
  {
    id: "take-family-rope-line",
    scene: "reedway-crossing",
    label: "Follow Orin's family rope line",
    description: "Use the evacuation route into the workers' barracks. Tide +1; Orin can keep the line together.",
    when: [{ type: "flag", flag: "evacuation-plan", value: true }, { type: "resourceAtMost", resource: "tide", value: 2 }],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "worker-barracks" }],
  },
  {
    id: "take-coerced-worker-line",
    scene: "reedway-crossing",
    label: "Take the workers' line without Nessa",
    description: "Use Orin's rope line after Mara's coerced testimony. Tide +1; Nessa stays back until you repair the trust.",
    when: [{ type: "flag", flag: "archive-witness-coerced", value: true }, { type: "resourceAtMost", resource: "tide", value: 2 }],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "worker-barracks" }],
  },
  {
    id: "cross-the-flooded-road",
    scene: "reedway-crossing",
    label: "Cross the exposed flood road",
    description: "Take the open road to the watchpost. Tide +1 and Risk +1; every patrol will see the crossing.",
    when: [{ type: "flag", flag: "blackglass-open-road-used", value: false }],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "setFlag", flag: "blackglass-open-road-used", value: true },
      { type: "goTo", scene: "council-watchpost" },
    ],
  },
  {
    id: "cross-after-open-road",
    scene: "reedway-crossing",
    label: "Cross by the road already opened",
    description: "Use the exposed road again. Tide +1; the watch already knows you are here, so this adds no new Risk.",
    when: [{ type: "flag", flag: "blackglass-open-road-used", value: true }],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "council-watchpost" }],
  },
  {
    id: "return-to-blackglass-quay",
    scene: "reedway-crossing",
    label: "Return to the Blackglass quay",
    description: "Step back to the quay and reconsider the route. Returning costs no supplies, debt, or risk.",
    effects: [{ type: "goTo", scene: "blackglass-quay" }],
  },
  {
    id: "show-council-seal-at-watch",
    scene: "council-watchpost",
    label: "Show the council seal",
    description: "Open Varo's gate with the seal. Tide +1 and Debt +1; the watch records the favor against you.",
    when: [{ type: "flag", flag: "council-control", value: true }, { type: "flag", flag: "council-seal", value: true }, { type: "resourceAtMost", resource: "tide", value: 2 }],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "adjustResource", resource: "debt", delta: 1 },
      { type: "setFlag", flag: "blackglass-council-favor", value: true },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "wait-for-watch-to-turn",
    scene: "council-watchpost",
    label: "Wait for the watch to turn",
    description: "Wait beneath the rain cover until the lamps turn away. Tide +2 with no added Risk; the surge will arrive before you reach the controls.",
    when: [{ type: "resourceAtMost", resource: "tide", value: 1 }],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 2 },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "run-the-watchline",
    scene: "council-watchpost",
    label: "Run the watchline",
    description: "Run straight through the gate before the next sweep. Tide +1 and Risk +1; you save time, but Varo hears the gate chain shake.",
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "return-to-reedway-from-watch",
    scene: "council-watchpost",
    label: "Return to the reedway",
    description: "Step away from Varo's lamps and choose the crossing again. Returning costs no supplies, debt, or risk.",
    effects: [{ type: "goTo", scene: "reedway-crossing" }],
  },
  {
    id: "follow-shared-repair-marks",
    scene: "conduit-gallery",
    label: "Follow the shared repair marks",
    description: "Use Nessa's brace while the current and patrols are low. Tide +1 with no added Risk; a rough approach cannot use this mark.",
    when: [
      { type: "flag", flag: "shared-water", value: true },
      { type: "resourceAtMost", resource: "tide", value: 2 },
      { type: "resourceAtMost", resource: "risk", value: 1 },
    ],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "pressure-control" }],
  },
  {
    id: "move-before-lantern-patrol",
    scene: "conduit-gallery",
    label: "Move before the lantern patrol",
    description: "Use the short ledge while the patrol looks outward. Tide +1 and Risk +1; reaching Risk 3 forces a scarred repair without Nessa's aid.",
    when: [{ type: "flag", flag: "archive-verdict-exposed", value: true }, { type: "resourceAtMost", resource: "tide", value: 2 }],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "brace-the-conduit-ledge",
    scene: "conduit-gallery",
    label: "Brace the conduit ledge",
    description: "Spend one supply on rope and canvas to quiet the ledge. Tide +1; current Risk stays unchanged.",
    when: [
      { type: "flag", flag: "shared-water", value: true },
      { type: "resourceAtLeast", resource: "risk", value: 2 },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
      { type: "resourceAtMost", resource: "tide", value: 2 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "use-sealed-archive-cover",
    scene: "conduit-gallery",
    label: "Use the sealed Archive cover",
    description: "Follow the protected signal through the gallery. Tide +1 with no added Risk.",
    when: [{ type: "flag", flag: "archive-verdict-sealed", value: true }, { type: "resourceAtMost", resource: "tide", value: 2 }],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "pressure-control" }],
  },
  {
    id: "use-provisional-archive-cover",
    scene: "conduit-gallery",
    label: "Use the provisional Archive route",
    description: "Take the quiet route left by the provisional record. Tide +1 with no added Risk.",
    when: [{ type: "flag", flag: "archive-verdict-negotiated", value: true }, { type: "resourceAtMost", resource: "tide", value: 2 }],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "pressure-control" }],
  },
  {
    id: "ride-the-rising-conduit",
    scene: "conduit-gallery",
    label: "Ride the rising conduit",
    description: "Take the wet ladder while the current is moving. Tide +2 and Risk +1; reaching Tide 3 means an emergency release and pressure damage.",
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 2 },
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "return-to-reedway-from-conduit",
    scene: "conduit-gallery",
    label: "Return to the reedway",
    description: "Leave the gallery ledge and reconsider the crossing. Returning costs no supplies, debt, or risk.",
    effects: [{ type: "goTo", scene: "reedway-crossing" }],
  },
  {
    id: "ask-nessa-to-hold-rope",
    scene: "worker-barracks",
    label: "Ask Nessa to hold the rope",
    description: "Let Nessa lead the workers through the last turn. Tide +1; her aid makes the pressure sequence safer.",
    when: [
      { type: "flag", flag: "evacuation-plan", value: true },
      { type: "flag", flag: "archive-witness-coerced", value: false },
      { type: "flag", flag: "blackglass-nessa-aid", value: false },
    ],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "setFlag", flag: "blackglass-nessa-aid", value: true },
      { type: "addFact", fact: "blackglass-workers-guided" },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "repair-nessa-trust",
    scene: "worker-barracks",
    label: "Spend a supply to repair Nessa's trust",
    description: "Give up one supply and let Nessa see the repair in action. Tide +1; her aid returns after Mara was compelled.",
    when: [
      { type: "flag", flag: "archive-witness-coerced", value: true },
      { type: "flag", flag: "blackglass-nessa-aid", value: false },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "setFlag", flag: "blackglass-nessa-aid", value: true },
      { type: "addFact", fact: "blackglass-aid-restored" },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "lead-workers-before-surge",
    scene: "worker-barracks",
    label: "Lead the workers before the surge",
    description: "Take Orin's signals and move before the next tide mark. Tide +1 with no added Risk.",
    when: [{ type: "resourceAtMost", resource: "tide", value: 1 }],
    effects: [{ type: "advanceClock", clock: "blackglass-tide", delta: 1 }, { type: "goTo", scene: "pressure-control" }],
  },
  {
    id: "take-workers-through-flood",
    scene: "worker-barracks",
    label: "Take the workers through the flood",
    description: "Move without Nessa's full cover while the water is up. Tide +2 and Risk +1.",
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 2 },
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "goTo", scene: "pressure-control" },
    ],
  },
  {
    id: "return-to-reedway-from-barracks",
    scene: "worker-barracks",
    label: "Return to the reedway",
    description: "Leave Orin's barracks and reconsider the crossing. Returning costs no supplies, debt, or risk.",
    effects: [{ type: "goTo", scene: "reedway-crossing" }],
  },
  {
    id: "set-pressure-before-next-surge",
    scene: "pressure-control",
    label: "Set the pressure before the next surge",
    description: "Turn the handwheels in Orin's sequence. Tide +1; with Risk 2 or lower, the line settles cleanly.",
    when: [
      { type: "flag", flag: "blackglass-resolved", value: false },
      { type: "resourceAtMost", resource: "tide", value: 2 },
      { type: "resourceAtMost", resource: "risk", value: 2 },
    ],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "setFlag", flag: "blackglass-resolved", value: true },
      { type: "addFact", fact: "blackglass-pressure-stabilized" },
      { type: "goTo", scene: "blackglass-quay" },
    ],
  },
  {
    id: "let-nessa-balance-the-valve",
    scene: "pressure-control",
    label: "Let Nessa balance the valve",
    description: "Give Nessa the final wheel. Her repair knowledge can steady the line even after a hard crossing.",
    when: [
      { type: "flag", flag: "blackglass-resolved", value: false },
      { type: "flag", flag: "blackglass-nessa-aid", value: true },
      { type: "resourceAtMost", resource: "tide", value: 2 },
    ],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "setFlag", flag: "blackglass-resolved", value: true },
      { type: "addFact", fact: "blackglass-pressure-stabilized" },
      { type: "goTo", scene: "blackglass-quay" },
    ],
  },
  {
    id: "let-nessa-hold-emergency-valve",
    scene: "pressure-control",
    label: "Let Nessa hold the emergency valve",
    description: "Give Nessa the wheel after the tide has filled the room. The line survives, but the surge leaves a pressure scar.",
    when: [
      { type: "flag", flag: "blackglass-resolved", value: false },
      { type: "flag", flag: "blackglass-nessa-aid", value: true },
      { type: "resourceAtLeast", resource: "tide", value: 3 },
    ],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "setFlag", flag: "blackglass-resolved", value: true },
      { type: "setFlag", flag: "blackglass-pressure-scarred", value: true },
      { type: "addFact", fact: "blackglass-pressure-scarred" },
      { type: "goTo", scene: "blackglass-quay" },
    ],
  },
  {
    id: "hold-valve-under-watch",
    scene: "pressure-control",
    label: "Hold the valve under watch",
    description: "Keep the line moving while patrols close in. Tide +1; Risk 3 or higher leaves a pressure scar.",
    when: [
      { type: "flag", flag: "blackglass-resolved", value: false },
      { type: "resourceAtMost", resource: "tide", value: 2 },
      { type: "resourceAtLeast", resource: "risk", value: 3 },
    ],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "setFlag", flag: "blackglass-resolved", value: true },
      { type: "setFlag", flag: "blackglass-pressure-scarred", value: true },
      { type: "addFact", fact: "blackglass-pressure-scarred" },
      { type: "goTo", scene: "blackglass-quay" },
    ],
  },
  {
    id: "open-emergency-bypass",
    scene: "pressure-control",
    label: "Open the emergency bypass",
    description: "Release the surge before it tears through the shutters. Tide is already full; Risk +1 and the line will carry a scar.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: false }, { type: "resourceAtLeast", resource: "tide", value: 3 }],
    effects: [
      { type: "advanceClock", clock: "blackglass-tide", delta: 1 },
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "setFlag", flag: "blackglass-resolved", value: true },
      { type: "setFlag", flag: "blackglass-pressure-scarred", value: true },
      { type: "addFact", fact: "blackglass-pressure-scarred" },
      { type: "goTo", scene: "blackglass-quay" },
    ],
  },
  {
    id: "leave-pressure-control",
    scene: "pressure-control",
    label: "Leave the control room",
    description: "Abandon the pressure sequence while Orin holds the lower shutters.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: false }],
    effects: [],
    outcome: { status: "departed", summary: "You leave the Blackglass control room before the pressure is set. Orin can only hold the shutters for so long." },
  },
  {
    id: "leave-workers-at-barracks",
    scene: "worker-barracks",
    label: "Leave the workers behind",
    description: "Depart from the barracks before taking the pressure line through the works.",
    effects: [],
    outcome: { status: "departed", summary: "You leave Orin Pell's workers in the barracks. The pressure route remains unfinished." },
  },
  {
    id: "leave-conduit-gallery",
    scene: "conduit-gallery",
    label: "Leave the conduit gallery",
    description: "Turn back from the wet ledge before reaching the pressure room.",
    effects: [],
    outcome: { status: "departed", summary: "You leave the conduit gallery before the pressure sequence. Blackglass keeps its rising water." },
  },
  {
    id: "close-blackglass-chapter-clean",
    scene: "lowsail-after-blackglass",
    label: "Close the Blackglass account",
    description: "Record the settled pressure line and carry the clean account into the next journey.",
    when: [{ type: "flag", flag: "blackglass-pressure-scarred", value: false }, { type: "resourceAtMost", resource: "risk", value: 2 }],
    effects: [{ type: "addFact", fact: "blackglass-chapter-closed" }],
    outcome: { status: "completed", summary: "You close the Blackglass account with the pressure line steady. The works are ready for another shift, and Lowsail has your report." },
  },
  {
    id: "close-blackglass-chapter-watched",
    scene: "lowsail-after-blackglass",
    label: "Close the watched Blackglass account",
    description: "Record a steady line after a conspicuous crossing. The pressure holds, but the watch will follow the route.",
    when: [{ type: "flag", flag: "blackglass-pressure-scarred", value: false }, { type: "resourceAtLeast", resource: "risk", value: 3 }],
    effects: [{ type: "addFact", fact: "blackglass-chapter-closed" }],
    outcome: { status: "completed", summary: "You close the Blackglass account with the pressure line steady but watched. The route holds, and every patrol now knows its cost." },
  },
  {
    id: "close-blackglass-chapter-scarred",
    scene: "lowsail-after-blackglass",
    label: "Close the scarred Blackglass account",
    description: "Record that the line holds after the hard crossing, including the risk and attention it leaves behind.",
    when: [{ type: "flag", flag: "blackglass-pressure-scarred", value: true }],
    effects: [{ type: "addFact", fact: "blackglass-chapter-closed" }],
    outcome: { status: "completed", summary: "You close the Blackglass account after a scarred crossing. The line holds, but the watch and the pressure will shape every return." },
  },
  {
    id: "leave-lowsail-after-blackglass",
    scene: "lowsail-after-blackglass",
    label: "Leave Lowsail with the account open",
    description: "Depart before choosing how the Blackglass pressure line should shape the next journey.",
    effects: [],
    outcome: { status: "departed", summary: "You leave Lowsail after Blackglass without closing the new account. The pressure line holds, and its consequences wait." },
  },
] as const satisfies readonly ChoiceData[];
