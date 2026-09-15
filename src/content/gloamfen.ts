import type { ChoiceData, SceneData } from "./scenario.js";

export const GLOAMFEN_FACT_LABELS = {
  "gloamfen-lock-secured": "You secured Mara Orlan's Gloamfen sluice gates for the convoy.",
  "gloamfen-marsh-road-marked": "You marked Iven Venn's Gloamfen marsh road for the night haul.",
} as const satisfies Readonly<Record<string, string>>;

export const GLOAMFEN_SCENES = [
  {
    id: "gloamfen-landing",
    title: "Gloamfen Marsh",
    text: [
      {
        text: "Cinderwake's causeway ends at Gloamfen, where a soot-black lock feeds the marsh edge. Mara Orlan keeps the gates; Iven Venn moves carts along a marsh road cut between the kilns.",
        when: [{ type: "flag", flag: "gloamfen-resolved", value: false }],
      },
      {
        text: "Pera's beacon let the first carts see Gloamfen's lock before the smoke closed in. Mara can hold the gates if someone pays for the brace.",
        when: [{ type: "flag", flag: "fenward-beacon-lit", value: true }],
      },
      {
        text: "Jori's ford chart brought the night haul through the reeds and up to Gloamfen. Iven can guide the carts, but the marsh road still has no mark.",
        when: [{ type: "flag", flag: "fenward-ford-charted", value: true }],
      },
      {
        text: "Mara's lock gates now hold the Gloamfen flow. The belt can load the next convoy without sending soot water back toward Cinderwake.",
        when: [{ type: "flag", flag: "gloamfen-lock-secured", value: true }],
      },
      {
        text: "Iven's marsh-road marks lead the night haul between the kilns. The route is exposed, but the carts no longer need a guide at every turn.",
        when: [{ type: "flag", flag: "gloamfen-marsh-road-marked", value: true }],
      },
    ],
  },
  {
    id: "gloamfen-sluicehouse",
    title: "Mara's Sluicehouse",
    text: [
      {
        text: "Mara Orlan keeps the Gloamfen sluicehouse above a channel of hot runoff. The gate teeth are sound enough to turn, but one brace has split under the kiln weight.",
        when: [{ type: "flag", flag: "gloamfen-resolved", value: false }],
      },
      {
        text: "One Supply can brace the gate and keep soot water inside the industrial channel. The convoy will reach Cinderwake with its clean stores intact.",
        when: [{ type: "flag", flag: "gloamfen-resolved", value: false }],
      },
      {
        text: "Iven's marsh road can move carts around the lock, but Mara still needs a Supply before the gates can hold the next firing cycle.",
        when: [{ type: "flag", flag: "gloamfen-marsh-road-marked", value: true }],
      },
      {
        text: "The sluicehouse brace holds. Mara can keep the kiln channel from spilling into the Cinderwake route during the next load.",
        when: [{ type: "flag", flag: "gloamfen-lock-secured", value: true }],
      },
    ],
  },
  {
    id: "gloamfen-marsh-road",
    title: "Iven's Marsh Road",
    text: [
      {
        text: "Iven Venn lays a chain of pale tiles between the Gloamfen kilns. The smoke hides the sharp turns, and a loaded cart will follow the wrong mark if the route is not clear.",
        when: [{ type: "flag", flag: "gloamfen-resolved", value: false }],
      },
      {
        text: "Marking the road adds one Risk. The night haul will have a line through the smoke, but every kiln watch will see who laid it.",
        when: [{ type: "flag", flag: "gloamfen-resolved", value: false }],
      },
      {
        text: "Mara's lock brace keeps the channel shut, but Iven's marsh road is still unmarked. The carts can wait by the clean bank only until the next bell.",
        when: [{ type: "flag", flag: "gloamfen-lock-secured", value: true }],
      },
      {
        text: "The pale tiles hold their line between the kilns. Iven can send a loaded cart through the smoke without calling a guide into the heat.",
        when: [{ type: "flag", flag: "gloamfen-marsh-road-marked", value: true }],
      },
    ],
  },
] as const satisfies readonly SceneData[];

export const GLOAMFEN_CHOICES = [
  {
    id: "take-gloamfen-sluice-road",
    scene: "cinderwake-landing",
    label: "Take the sluice road into Gloamfen",
    description: "Follow the raised industrial bank and meet Mara at the gates before the next firing bell.",
    when: [
      { type: "flag", flag: "cinderwake-resolved", value: true },
      { type: "flag", flag: "gloamfen-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "gloamfen-landing" }],
  },
  {
    id: "take-gloamfen-marsh-road",
    scene: "cinderwake-landing",
    label: "Take Iven's marsh road",
    description: "Follow the kiln-side route into Gloamfen and trust the pale tiles through the smoke.",
    when: [
      { type: "flag", flag: "cinderwake-resolved", value: true },
      { type: "flag", flag: "gloamfen-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "gloamfen-landing" }],
  },
  {
    id: "revisit-gloamfen-from-cinderwake",
    scene: "cinderwake-landing",
    label: "Revisit Gloamfen",
    description: "Follow the industrial bank beyond Cinderwake and see whether the lock or marsh-road decision held.",
    when: [
      { type: "flag", flag: "cinderwake-resolved", value: true },
      { type: "flag", flag: "gloamfen-resolved", value: true },
    ],
    effects: [{ type: "goTo", scene: "gloamfen-landing" }],
  },
  {
    id: "visit-gloamfen-sluicehouse",
    scene: "gloamfen-landing",
    label: "Visit Mara's sluicehouse",
    description: "Hear how one Supply can keep soot water inside the industrial channel.",
    effects: [{ type: "goTo", scene: "gloamfen-sluicehouse" }],
  },
  {
    id: "visit-gloamfen-marsh-road",
    scene: "gloamfen-landing",
    label: "Visit Iven's marsh road",
    description: "Hear how one risky line of tiles can guide loaded carts between the kilns.",
    effects: [{ type: "goTo", scene: "gloamfen-marsh-road" }],
  },
  {
    id: "return-to-cinderwake-from-gloamfen",
    scene: "gloamfen-landing",
    label: "Return to Cinderwake",
    description: "Carry the Gloamfen decision back to the Cinderwake causeway without ending the journey.",
    effects: [{ type: "goTo", scene: "cinderwake-landing" }],
  },
  {
    id: "secure-gloamfen-lock",
    scene: "gloamfen-sluicehouse",
    label: "Brace Gloamfen's lock",
    description: "Spend one Supply to keep the kiln channel from spilling into the Cinderwake route.",
    when: [
      { type: "flag", flag: "gloamfen-resolved", value: false },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "setFlag", flag: "gloamfen-resolved", value: true },
      { type: "setFlag", flag: "gloamfen-lock-secured", value: true },
      { type: "addFact", fact: "gloamfen-lock-secured" },
      { type: "goTo", scene: "gloamfen-landing" },
    ],
  },
  {
    id: "mark-gloamfen-marsh-road",
    scene: "gloamfen-marsh-road",
    label: "Mark the marsh road",
    description: "Add one Risk to lay Iven's pale tiles through the kiln smoke before the next haul.",
    when: [
      { type: "flag", flag: "gloamfen-resolved", value: false },
      { type: "resourceAtMost", resource: "risk", value: 18 },
    ],
    effects: [
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "setFlag", flag: "gloamfen-resolved", value: true },
      { type: "setFlag", flag: "gloamfen-marsh-road-marked", value: true },
      { type: "addFact", fact: "gloamfen-marsh-road-marked" },
      { type: "goTo", scene: "gloamfen-landing" },
    ],
  },
  {
    id: "leave-gloamfen-sluicehouse",
    scene: "gloamfen-sluicehouse",
    label: "Leave the sluicehouse",
    description: "Return to the Gloamfen belt without spending the Supply.",
    effects: [{ type: "goTo", scene: "gloamfen-landing" }],
  },
  {
    id: "leave-gloamfen-marsh-road",
    scene: "gloamfen-marsh-road",
    label: "Leave the marsh road",
    description: "Return to the Gloamfen belt without taking the night-mark risk.",
    effects: [{ type: "goTo", scene: "gloamfen-landing" }],
  },
] as const satisfies readonly ChoiceData[];
