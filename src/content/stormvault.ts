import type { ChoiceData, SceneData } from "./scenario.js";

export const STORMVAULT_FACT_LABELS = {
  "stormvault-signal-raised": "You raised Nera Voss's Stormvault signal for the night convoy.",
  "stormvault-cistern-opened": "You opened Elian Marr's Stormvault cistern for the return haul.",
} as const satisfies Readonly<Record<string, string>>;

export const STORMVAULT_SCENES = [
  {
    id: "stormvault-landing",
    title: "Stormvault Rise",
    text: [
      {
        text: "Gloamfen's kiln road climbs onto Stormvault Rise, where an old relay tower watches the basin. Nera Voss keeps the signal shutters; Elian Marr guards a cistern cut into the rock.",
        when: [{ type: "flag", flag: "stormvault-resolved", value: false }],
      },
      {
        text: "Mara's Gloamfen sluice holds below the rise. Nera can carry its warning uphill if someone spends a clean Archive record on the signal oil.",
        when: [{ type: "flag", flag: "gloamfen-lock-secured", value: true }],
      },
      {
        text: "Iven's marsh-road marks reach the first Stormvault switchback. Elian can open the cistern, but the exposed climb will make every watcher count the cost.",
        when: [{ type: "flag", flag: "gloamfen-marsh-road-marked", value: true }],
      },
      {
        text: "Nera's Stormvault signal now turns above the basin. The next convoy can see the high route before the marsh smoke closes.",
        when: [{ type: "flag", flag: "stormvault-signal-raised", value: true }],
      },
      {
        text: "Elian's cistern now feeds the rise. The return haul can climb with water in its drums instead of gambling on the kiln road below.",
        when: [{ type: "flag", flag: "stormvault-cistern-opened", value: true }],
      },
      {
        text: "The upper shelf continues to Crownwater, where Mira's bell and Teren's weir watch the next storm line.",
        when: [{ type: "flag", flag: "stormvault-resolved", value: true }, { type: "flag", flag: "crownwater-resolved", value: false }],
      },
      {
        text: "Crownwater's bell or weir now carries the high route beyond Stormvault. The shelf has a warning or a clean descent, but not both.",
        when: [{ type: "flag", flag: "crownwater-resolved", value: true }],
      },
    ],
  },
  {
    id: "stormvault-signal-tower",
    title: "Nera's Signal Tower",
    text: [
      {
        text: "Nera Voss keeps a brass shutter tower above the switchback. The lens is clear, but the oil ledger has been folded into the Archive packet you carried from below.",
        when: [{ type: "flag", flag: "stormvault-resolved", value: false }],
      },
      {
        text: "One Archive evidence mark can buy the signal oil and leave a trace that every relay keeper can read. Without it, the tower stays dark when the convoy turns uphill.",
        when: [{ type: "flag", flag: "stormvault-resolved", value: false }],
      },
      {
        text: "Elian's cistern can supply the rise, but Nera's tower still has no signal. The convoy will climb blind unless the shutter is lit.",
        when: [{ type: "flag", flag: "stormvault-cistern-opened", value: true }],
      },
      {
        text: "The brass shutters turn in a clean rhythm. Nera's signal reaches the next ridge before the basin lamps go out.",
        when: [{ type: "flag", flag: "stormvault-signal-raised", value: true }],
      },
    ],
  },
  {
    id: "stormvault-cistern",
    title: "Elian's Cistern",
    text: [
      {
        text: "Elian Marr keeps a stone cistern under Stormvault Rise. Its intake is clogged with kiln grit, and the exposed climb leaves no room for a second mistake.",
        when: [{ type: "flag", flag: "stormvault-resolved", value: false }],
      },
      {
        text: "Opening the cistern adds one Risk. The return haul will have water for the ridge, but every watcher on the switchback will see the work.",
        when: [{ type: "flag", flag: "stormvault-resolved", value: false }],
      },
      {
        text: "Nera's signal marks the ridge, but Elian's cistern is still dry. The convoy can find the climb and still fail it for want of water.",
        when: [{ type: "flag", flag: "stormvault-signal-raised", value: true }],
      },
      {
        text: "The cistern intake clears and the stone channel runs. Elian can fill the return drums before the next bell.",
        when: [{ type: "flag", flag: "stormvault-cistern-opened", value: true }],
      },
    ],
  },
] as const satisfies readonly SceneData[];

export const STORMVAULT_CHOICES = [
  {
    id: "take-stormvault-signal-road",
    scene: "gloamfen-landing",
    label: "Take the signal road to Stormvault",
    description: "Climb the marked switchback and meet Nera before the relay lamps go dark.",
    when: [
      { type: "flag", flag: "gloamfen-resolved", value: true },
      { type: "flag", flag: "stormvault-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "stormvault-landing" }],
  },
  {
    id: "take-stormvault-cistern-road",
    scene: "gloamfen-landing",
    label: "Take Elian's cistern road",
    description: "Follow the exposed switchback and trust the stone channel above the marsh smoke.",
    when: [
      { type: "flag", flag: "gloamfen-resolved", value: true },
      { type: "flag", flag: "stormvault-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "stormvault-landing" }],
  },
  {
    id: "revisit-stormvault-from-gloamfen",
    scene: "gloamfen-landing",
    label: "Revisit Stormvault",
    description: "Climb above Gloamfen and see whether the signal or cistern decision held on the ridge.",
    when: [
      { type: "flag", flag: "gloamfen-resolved", value: true },
      { type: "flag", flag: "stormvault-resolved", value: true },
    ],
    effects: [{ type: "goTo", scene: "stormvault-landing" }],
  },
  {
    id: "visit-stormvault-signal-tower",
    scene: "stormvault-landing",
    label: "Visit Nera's signal tower",
    description: "Hear how one Archive evidence mark can light the relay above the basin.",
    effects: [{ type: "goTo", scene: "stormvault-signal-tower" }],
  },
  {
    id: "visit-stormvault-cistern",
    scene: "stormvault-landing",
    label: "Visit Elian's cistern",
    description: "Hear how one risky climb can open water for the return haul.",
    effects: [{ type: "goTo", scene: "stormvault-cistern" }],
  },
  {
    id: "return-to-gloamfen-from-stormvault",
    scene: "stormvault-landing",
    label: "Return to Gloamfen",
    description: "Carry the Stormvault decision back to the marsh edge without ending the journey.",
    effects: [{ type: "goTo", scene: "gloamfen-landing" }],
  },
  {
    id: "raise-stormvault-signal",
    scene: "stormvault-signal-tower",
    label: "Raise Stormvault's signal",
    description: "Spend one Archive evidence mark to light Nera's relay above the basin.",
    when: [
      { type: "flag", flag: "stormvault-resolved", value: false },
      { type: "resourceAtLeast", resource: "archive-evidence", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "archive-evidence", delta: -1 },
      { type: "setFlag", flag: "stormvault-resolved", value: true },
      { type: "setFlag", flag: "stormvault-signal-raised", value: true },
      { type: "addFact", fact: "stormvault-signal-raised" },
      { type: "goTo", scene: "stormvault-landing" },
    ],
  },
  {
    id: "open-stormvault-cistern",
    scene: "stormvault-cistern",
    label: "Open the Stormvault cistern",
    description: "Add one Risk to clear Elian's intake before the next return haul.",
    when: [
      { type: "flag", flag: "stormvault-resolved", value: false },
      { type: "resourceAtMost", resource: "risk", value: 18 },
    ],
    effects: [
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "setFlag", flag: "stormvault-resolved", value: true },
      { type: "setFlag", flag: "stormvault-cistern-opened", value: true },
      { type: "addFact", fact: "stormvault-cistern-opened" },
      { type: "goTo", scene: "stormvault-landing" },
    ],
  },
  {
    id: "leave-stormvault-signal-tower",
    scene: "stormvault-signal-tower",
    label: "Leave the signal tower",
    description: "Return to Stormvault Rise without spending the Archive evidence.",
    effects: [{ type: "goTo", scene: "stormvault-landing" }],
  },
  {
    id: "leave-stormvault-cistern",
    scene: "stormvault-cistern",
    label: "Leave the cistern",
    description: "Return to Stormvault Rise without taking the night-climb risk.",
    effects: [{ type: "goTo", scene: "stormvault-landing" }],
  },
] as const satisfies readonly ChoiceData[];
