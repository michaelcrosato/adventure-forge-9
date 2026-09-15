import type { ChoiceData, SceneData } from "./scenario.js";

export const CINDERWAKE_FACT_LABELS = {
  "cinderwake-lock-secured": "You secured Bex Orlan's Cinderwake lock gates for the convoy.",
  "cinderwake-smoke-road-marked": "You marked Tessa Venn's Cinderwake smoke road for the night haul.",
} as const satisfies Readonly<Record<string, string>>;

export const CINDERWAKE_SCENES = [
  {
    id: "cinderwake-landing",
    title: "Cinderwake Belt",
    text: [
      {
        text: "Fenward's causeway ends at Cinderwake, where a soot-black lock feeds the industrial belt. Bex Orlan keeps the gates; Tessa Venn moves carts along a smoke road cut between the kilns.",
        when: [{ type: "flag", flag: "cinderwake-resolved", value: false }],
      },
      {
        text: "Pera's beacon let the first carts see Cinderwake's lock before the smoke closed in. Bex can hold the gates if someone pays for the brace.",
        when: [{ type: "flag", flag: "fenward-beacon-lit", value: true }],
      },
      {
        text: "Jori's ford chart brought the night haul through the reeds and up to Cinderwake. Tessa can guide the carts, but the smoke road still has no mark.",
        when: [{ type: "flag", flag: "fenward-ford-charted", value: true }],
      },
      {
        text: "Bex's lock gates now hold the Cinderwake flow. The belt can load the next convoy without sending soot water back toward Fenward.",
        when: [{ type: "flag", flag: "cinderwake-lock-secured", value: true }],
      },
      {
        text: "Tessa's smoke-road marks lead the night haul between the kilns. The route is exposed, but the carts no longer need a guide at every turn.",
        when: [{ type: "flag", flag: "cinderwake-smoke-road-marked", value: true }],
      },
    ],
  },
  {
    id: "cinderwake-lockhouse",
    title: "Bex's Lockhouse",
    text: [
      {
        text: "Bex Orlan keeps the Cinderwake lockhouse above a channel of hot runoff. The gate teeth are sound enough to turn, but one brace has split under the kiln weight.",
        when: [{ type: "flag", flag: "cinderwake-resolved", value: false }],
      },
      {
        text: "One Supply can brace the gate and keep soot water inside the industrial channel. The convoy will reach Fenward with its clean stores intact.",
        when: [{ type: "flag", flag: "cinderwake-resolved", value: false }],
      },
      {
        text: "Tessa's smoke road can move carts around the lock, but Bex still needs a Supply before the gates can hold the next firing cycle.",
        when: [{ type: "flag", flag: "cinderwake-smoke-road-marked", value: true }],
      },
      {
        text: "The lockhouse brace holds. Bex can keep the kiln channel from spilling into the Fenward route during the next load.",
        when: [{ type: "flag", flag: "cinderwake-lock-secured", value: true }],
      },
    ],
  },
  {
    id: "cinderwake-smoke-road",
    title: "Tessa's Smoke Road",
    text: [
      {
        text: "Tessa Venn lays a chain of pale tiles between the Cinderwake kilns. The smoke hides the sharp turns, and a loaded cart will follow the wrong mark if the route is not clear.",
        when: [{ type: "flag", flag: "cinderwake-resolved", value: false }],
      },
      {
        text: "Marking the road adds one Risk. The night haul will have a line through the smoke, but every kiln watch will see who laid it.",
        when: [{ type: "flag", flag: "cinderwake-resolved", value: false }],
      },
      {
        text: "Bex's lock brace keeps the channel shut, but Tessa's smoke road is still unmarked. The carts can wait by the clean bank only until the next bell.",
        when: [{ type: "flag", flag: "cinderwake-lock-secured", value: true }],
      },
      {
        text: "The pale tiles hold their line between the kilns. Tessa can send a loaded cart through the smoke without calling a guide into the heat.",
        when: [{ type: "flag", flag: "cinderwake-smoke-road-marked", value: true }],
      },
    ],
  },
] as const satisfies readonly SceneData[];

export const CINDERWAKE_CHOICES = [
  {
    id: "take-cinderwake-lock-road",
    scene: "fenward-landing",
    label: "Take the lock road into Cinderwake",
    description: "Follow the raised industrial bank and meet Bex at the gates before the next firing bell.",
    when: [
      { type: "flag", flag: "fenward-resolved", value: true },
      { type: "flag", flag: "cinderwake-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "cinderwake-landing" }],
  },
  {
    id: "take-cinderwake-smoke-road",
    scene: "fenward-landing",
    label: "Take Tessa's smoke road",
    description: "Follow the kiln-side route into Cinderwake and trust the pale tiles through the smoke.",
    when: [
      { type: "flag", flag: "fenward-resolved", value: true },
      { type: "flag", flag: "cinderwake-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "cinderwake-landing" }],
  },
  {
    id: "revisit-cinderwake-from-fenward",
    scene: "fenward-landing",
    label: "Revisit Cinderwake",
    description: "Follow the industrial bank beyond Fenward and see whether the lock or smoke-road decision held.",
    when: [
      { type: "flag", flag: "fenward-resolved", value: true },
      { type: "flag", flag: "cinderwake-resolved", value: true },
    ],
    effects: [{ type: "goTo", scene: "cinderwake-landing" }],
  },
  {
    id: "visit-cinderwake-lockhouse",
    scene: "cinderwake-landing",
    label: "Visit Bex's lockhouse",
    description: "Hear how one Supply can keep soot water inside the industrial channel.",
    effects: [{ type: "goTo", scene: "cinderwake-lockhouse" }],
  },
  {
    id: "visit-cinderwake-smoke-road",
    scene: "cinderwake-landing",
    label: "Visit Tessa's smoke road",
    description: "Hear how one risky line of tiles can guide loaded carts between the kilns.",
    effects: [{ type: "goTo", scene: "cinderwake-smoke-road" }],
  },
  {
    id: "return-to-fenward-from-cinderwake",
    scene: "cinderwake-landing",
    label: "Return to Fenward",
    description: "Carry the Cinderwake decision back to the Fenward causeway without ending the journey.",
    effects: [{ type: "goTo", scene: "fenward-landing" }],
  },
  {
    id: "secure-cinderwake-lock",
    scene: "cinderwake-lockhouse",
    label: "Brace Cinderwake's lock",
    description: "Spend one Supply to keep the kiln channel from spilling into the Fenward route.",
    when: [
      { type: "flag", flag: "cinderwake-resolved", value: false },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "setFlag", flag: "cinderwake-resolved", value: true },
      { type: "setFlag", flag: "cinderwake-lock-secured", value: true },
      { type: "addFact", fact: "cinderwake-lock-secured" },
      { type: "goTo", scene: "cinderwake-landing" },
    ],
  },
  {
    id: "mark-cinderwake-smoke-road",
    scene: "cinderwake-smoke-road",
    label: "Mark the smoke road",
    description: "Add one Risk to lay Tessa's pale tiles through the kiln smoke before the next haul.",
    when: [
      { type: "flag", flag: "cinderwake-resolved", value: false },
      { type: "resourceAtMost", resource: "risk", value: 18 },
    ],
    effects: [
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "setFlag", flag: "cinderwake-resolved", value: true },
      { type: "setFlag", flag: "cinderwake-smoke-road-marked", value: true },
      { type: "addFact", fact: "cinderwake-smoke-road-marked" },
      { type: "goTo", scene: "cinderwake-landing" },
    ],
  },
  {
    id: "leave-cinderwake-lockhouse",
    scene: "cinderwake-lockhouse",
    label: "Leave the lockhouse",
    description: "Return to the Cinderwake belt without spending the Supply.",
    effects: [{ type: "goTo", scene: "cinderwake-landing" }],
  },
  {
    id: "leave-cinderwake-smoke-road",
    scene: "cinderwake-smoke-road",
    label: "Leave the smoke road",
    description: "Return to the Cinderwake belt without taking the night-mark risk.",
    effects: [{ type: "goTo", scene: "cinderwake-landing" }],
  },
] as const satisfies readonly ChoiceData[];
