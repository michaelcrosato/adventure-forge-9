import type { ChoiceData, SceneData } from "./scenario.js";

export const CROWNWATER_FACT_LABELS = {
  "crownwater-bell-rung": "You rang Mira Cale's Crownwater warning bell for the high-basin convoy.",
  "crownwater-weir-set": "You set Teren Or's Crownwater weir to release clean water toward the lower basin.",
} as const satisfies Readonly<Record<string, string>>;

export const CROWNWATER_SCENES = [
  {
    id: "crownwater-landing",
    title: "Crownwater Shelf",
    text: [
      {
        text: "Stormvault's upper path breaks onto Crownwater Shelf, where a copper warning bell hangs above a split weir. Mira Cale keeps the bell; Teren Or clears the channel.",
        when: [{ type: "flag", flag: "crownwater-resolved", value: false }],
      },
      {
        text: "Nera's Stormvault signal reaches the shelf before the cloud bank closes. Mira can warn the high-basin convoy if someone replaces the bell's cracked striker.",
        when: [{ type: "flag", flag: "stormvault-signal-raised", value: true }],
      },
      {
        text: "Elian's cistern gives the shelf a reserve for the climb. Teren can turn the weir, but the exposed channel will make every watcher count the work.",
        when: [{ type: "flag", flag: "stormvault-cistern-opened", value: true }],
      },
      {
        text: "Mira's warning bell now carries across Crownwater Shelf. The next convoy can hear the cloud bank before it reaches the high basin.",
        when: [{ type: "flag", flag: "crownwater-bell-rung", value: true }],
      },
      {
        text: "Teren's weir now releases clean water toward the lower basin. The return haul can descend without waiting for the shelf to flood.",
        when: [{ type: "flag", flag: "crownwater-weir-set", value: true }],
      },
    ],
  },
  {
    id: "crownwater-bellhouse",
    title: "Mira's Bellhouse",
    text: [
      {
        text: "Mira Cale keeps a copper bellhouse over the Crownwater drop. The striker is cracked through, and a convoy that cannot hear the warning will enter the cloud bank blind.",
        when: [{ type: "flag", flag: "crownwater-resolved", value: false }],
      },
      {
        text: "One Archive evidence mark can purchase a replacement striker. The warning will travel farther than a shouted order, and the record will be spent on the shelf.",
        when: [{ type: "flag", flag: "crownwater-resolved", value: false }],
      },
      {
        text: "Teren's weir is set below the bellhouse, but Mira's warning still has no striker. The convoy can have water and still miss the cloud bank.",
        when: [{ type: "flag", flag: "crownwater-weir-set", value: true }],
      },
      {
        text: "The copper striker holds. Mira's bell rolls across the shelf before the cloud bank reaches the high basin.",
        when: [{ type: "flag", flag: "crownwater-bell-rung", value: true }],
      },
    ],
  },
  {
    id: "crownwater-weir",
    title: "Teren's Weir",
    text: [
      {
        text: "Teren Or keeps a stone weir above the lower basin. The gate is packed with storm grit, and the exposed shelf leaves no room for a second mistake.",
        when: [{ type: "flag", flag: "crownwater-resolved", value: false }],
      },
      {
        text: "Setting the weir adds one Risk. The return haul will have a clean descent, but every watcher on the shelf will see who turned the gate.",
        when: [{ type: "flag", flag: "crownwater-resolved", value: false }],
      },
      {
        text: "Mira's bell warns the shelf, but Teren's weir is still jammed. The convoy can hear the cloud bank and still lose the descent for want of water.",
        when: [{ type: "flag", flag: "crownwater-bell-rung", value: true }],
      },
      {
        text: "The weir gate turns and the lower channel clears. Teren can send the return haul down before the next storm line.",
        when: [{ type: "flag", flag: "crownwater-weir-set", value: true }],
      },
    ],
  },
] as const satisfies readonly SceneData[];

export const CROWNWATER_CHOICES = [
  {
    id: "take-crownwater-bell-road",
    scene: "stormvault-landing",
    label: "Take Mira's bell road to Crownwater",
    description: "Cross the upper shelf and meet Mira before the cloud bank reaches the high-basin convoy.",
    when: [
      { type: "flag", flag: "stormvault-resolved", value: true },
      { type: "flag", flag: "crownwater-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "crownwater-landing" }],
  },
  {
    id: "take-crownwater-weir-road",
    scene: "stormvault-landing",
    label: "Take Teren's weir road to Crownwater",
    description: "Follow the exposed shelf and trust the stone gate above the lower basin.",
    when: [
      { type: "flag", flag: "stormvault-resolved", value: true },
      { type: "flag", flag: "crownwater-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "crownwater-landing" }],
  },
  {
    id: "revisit-crownwater-from-stormvault",
    scene: "stormvault-landing",
    label: "Revisit Crownwater",
    description: "Cross the shelf again and see whether the bell or weir decision held above Stormvault.",
    when: [
      { type: "flag", flag: "stormvault-resolved", value: true },
      { type: "flag", flag: "crownwater-resolved", value: true },
    ],
    effects: [{ type: "goTo", scene: "crownwater-landing" }],
  },
  {
    id: "visit-crownwater-bellhouse",
    scene: "crownwater-landing",
    label: "Visit Mira's bellhouse",
    description: "Hear how one Supply can carry a warning across the cloud bank.",
    effects: [{ type: "goTo", scene: "crownwater-bellhouse" }],
  },
  {
    id: "visit-crownwater-weir",
    scene: "crownwater-landing",
    label: "Visit Teren's weir",
    description: "Hear how one risky turn can clear the descent for the return haul.",
    effects: [{ type: "goTo", scene: "crownwater-weir" }],
  },
  {
    id: "return-to-stormvault-from-crownwater",
    scene: "crownwater-landing",
    label: "Return to Stormvault",
    description: "Carry the Crownwater decision back across the upper shelf without ending the journey.",
    effects: [{ type: "goTo", scene: "stormvault-landing" }],
  },
  {
    id: "ring-crownwater-bell",
    scene: "crownwater-bellhouse",
    label: "Ring Crownwater's warning bell",
    description: "Spend one Archive evidence mark to replace Mira's striker and warn the high-basin convoy.",
    when: [
      { type: "flag", flag: "crownwater-resolved", value: false },
      { type: "resourceAtLeast", resource: "archive-evidence", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "archive-evidence", delta: -1 },
      { type: "setFlag", flag: "crownwater-resolved", value: true },
      { type: "setFlag", flag: "crownwater-bell-rung", value: true },
      { type: "addFact", fact: "crownwater-bell-rung" },
      { type: "goTo", scene: "crownwater-landing" },
    ],
  },
  {
    id: "set-crownwater-weir",
    scene: "crownwater-weir",
    label: "Set Crownwater's weir",
    description: "Add one Risk to clear Teren's gate before the next storm line reaches the shelf.",
    when: [
      { type: "flag", flag: "crownwater-resolved", value: false },
      { type: "resourceAtMost", resource: "risk", value: 18 },
    ],
    effects: [
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "setFlag", flag: "crownwater-resolved", value: true },
      { type: "setFlag", flag: "crownwater-weir-set", value: true },
      { type: "addFact", fact: "crownwater-weir-set" },
      { type: "goTo", scene: "crownwater-landing" },
    ],
  },
  {
    id: "leave-crownwater-bellhouse",
    scene: "crownwater-bellhouse",
    label: "Leave the bellhouse",
    description: "Return to Crownwater Shelf without spending the Supply.",
    effects: [{ type: "goTo", scene: "crownwater-landing" }],
  },
  {
    id: "leave-crownwater-weir",
    scene: "crownwater-weir",
    label: "Leave the weir",
    description: "Return to Crownwater Shelf without taking the storm-line risk.",
    effects: [{ type: "goTo", scene: "crownwater-landing" }],
  },
] as const satisfies readonly ChoiceData[];
