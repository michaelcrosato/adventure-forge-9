import type { ChoiceData, SceneData } from "./scenario.js";

export const SALTREACH_FACT_LABELS = {
  "saltreach-tidehouse-secured": "You secured Nyra Venn's Saltreach tidehouse against the next rise.",
  "saltreach-channel-marked": "You marked Halden Voss's Saltreach channel for the night convoy.",
} as const satisfies Readonly<Record<string, string>>;

export const SALTREACH_SCENES = [
  {
    id: "saltreach-commons",
    title: "Saltreach Commons",
    text: [
      {
        text: "The warning carries you beyond the upper-bank watch to Saltreach, where the mudflats narrow into two routes: Nyra Venn's tidehouse and Halden Voss's night channel.",
        when: [{ type: "flag", flag: "saltreach-resolved", value: false }],
      },
      {
        text: "Orin's ferry horn gave Saltreach's ferrymen time to pull their tide markers high before the next rise.",
        when: [{ type: "flag", flag: "reedway-warning-ferry", value: true }],
      },
      {
        text: "Sera's quiet towpath brought you to Saltreach before the patrol lamps returned. The night crews are still moving by hand.",
        when: [{ type: "flag", flag: "reedway-warning-towpath", value: true }],
      },
      {
        text: "Nyra's tidehouse now keeps the convoy stores above the next rise. She sends the next warning back along the causeway.",
        when: [{ type: "flag", flag: "saltreach-tidehouse-secured", value: true }],
      },
      {
        text: "Halden's marked channel now guides the night convoy around the deep mud. The upper-bank watch has a second route to the works.",
        when: [{ type: "flag", flag: "saltreach-channel-marked", value: true }],
      },
      {
        text: "The tidehouse and channel works remain open to inspection. You can return to the Reedway commons without losing the route you made.",
      },
    ],
  },
  {
    id: "saltreach-tidehouse",
    title: "Nyra's Tidehouse",
    text: [
      {
        text: "Nyra Venn keeps a timber tidehouse above the salt flats. Her stores are dry for now, but the next convoy will lose its food unless the shutters and rope winch hold.",
        when: [{ type: "flag", flag: "saltreach-resolved", value: false }],
      },
      {
        text: "One supply can brace the shutters and keep the tidehouse stores dry. The work will not change Halden's channel.",
        when: [{ type: "flag", flag: "saltreach-resolved", value: false }],
      },
      {
        text: "The tidehouse shutters are braced and Nyra has moved the convoy stores above the rise. The supply is spent, but the route stays open.",
        when: [{ type: "flag", flag: "saltreach-tidehouse-secured", value: true }],
      },
      {
        text: "Halden's channel marks are doing the work here; Nyra's tidehouse still needs another supply before the next convoy.",
        when: [{ type: "flag", flag: "saltreach-channel-marked", value: true }],
      },
    ],
  },
  {
    id: "saltreach-channel-works",
    title: "Halden's Channel Works",
    text: [
      {
        text: "Halden Voss keeps the Saltreach channel open with a chain of hand-painted stakes. The dry line shifts after every rise, and the night convoy needs a mark it can trust.",
        when: [{ type: "flag", flag: "saltreach-resolved", value: false }],
      },
      {
        text: "You can mark the channel from the mud edge, but the work adds one point of Risk before the patrols turn away.",
        when: [{ type: "flag", flag: "saltreach-resolved", value: false }],
      },
      {
        text: "Halden's stakes now point the night convoy around the deep mud. The route is visible even when the tide turns.",
        when: [{ type: "flag", flag: "saltreach-channel-marked", value: true }],
      },
      {
        text: "Nyra's tidehouse is secured, but Halden's channel still needs a night mark if the convoy is to move without a guide.",
        when: [{ type: "flag", flag: "saltreach-tidehouse-secured", value: true }],
      },
    ],
  },
] as const satisfies readonly SceneData[];

export const SALTREACH_CHOICES = [
  {
    id: "follow-ferry-warning-to-saltreach",
    scene: "reedway-upper-watch",
    label: "Follow the ferry warning to Saltreach",
    description: "Take the raised bank beyond the watch while Orin's warning still gives the convoy time to move.",
    when: [
      { type: "flag", flag: "blackglass-resolved", value: true },
      { type: "flag", flag: "reedway-warning-ferry", value: true },
      { type: "flag", flag: "saltreach-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "saltreach-commons" }],
  },
  {
    id: "follow-towpath-warning-to-saltreach",
    scene: "reedway-upper-watch",
    label: "Follow the quiet warning to Saltreach",
    description: "Take Sera's marked towpath beyond the watch before the patrol lamps return.",
    when: [
      { type: "flag", flag: "blackglass-resolved", value: true },
      { type: "flag", flag: "reedway-warning-towpath", value: true },
      { type: "flag", flag: "saltreach-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "saltreach-commons" }],
  },
  {
    id: "revisit-saltreach-from-reedway",
    scene: "reedway-commons",
    label: "Revisit Saltreach",
    description: "Follow the causeway beyond the warned upper-bank watch and see how the tidehouse or channel work held.",
    when: [
      { type: "flag", flag: "blackglass-resolved", value: true },
      { type: "flag", flag: "saltreach-resolved", value: true },
    ],
    effects: [{ type: "goTo", scene: "saltreach-commons" }],
  },
  {
    id: "visit-saltreach-tidehouse",
    scene: "saltreach-commons",
    label: "Visit Nyra's tidehouse",
    description: "Hear how one supply can keep the Saltreach convoy stores dry through the next rise.",
    effects: [{ type: "goTo", scene: "saltreach-tidehouse" }],
  },
  {
    id: "visit-saltreach-channel-works",
    scene: "saltreach-commons",
    label: "Visit Halden's channel works",
    description: "Hear how a risky night mark can guide the Saltreach convoy around the deep mud.",
    effects: [{ type: "goTo", scene: "saltreach-channel-works" }],
  },
  {
    id: "return-to-reedway-from-saltreach",
    scene: "saltreach-commons",
    label: "Return to Reedway",
    description: "Return to the Reedway commons and keep the Saltreach work in the campaign record.",
    effects: [{ type: "goTo", scene: "reedway-commons" }],
  },
  {
    id: "secure-saltreach-tidehouse",
    scene: "saltreach-tidehouse",
    label: "Brace the tidehouse stores",
    description: "Spend one Supply to brace Nyra's shutters and keep the next convoy's food dry.",
    when: [
      { type: "flag", flag: "saltreach-resolved", value: false },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "setFlag", flag: "saltreach-resolved", value: true },
      { type: "setFlag", flag: "saltreach-tidehouse-secured", value: true },
      { type: "addFact", fact: "saltreach-tidehouse-secured" },
      { type: "goTo", scene: "saltreach-commons" },
    ],
  },
  {
    id: "mark-saltreach-channel",
    scene: "saltreach-channel-works",
    label: "Mark the night channel",
    description: "Add one Risk to mark the deep mud for the Saltreach convoy before the patrols return.",
    when: [
      { type: "flag", flag: "saltreach-resolved", value: false },
      { type: "resourceAtMost", resource: "risk", value: 18 },
    ],
    effects: [
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "setFlag", flag: "saltreach-resolved", value: true },
      { type: "setFlag", flag: "saltreach-channel-marked", value: true },
      { type: "addFact", fact: "saltreach-channel-marked" },
      { type: "goTo", scene: "saltreach-commons" },
    ],
  },
  {
    id: "leave-saltreach-tidehouse",
    scene: "saltreach-tidehouse",
    label: "Leave the tidehouse",
    description: "Return to the Saltreach commons without committing the supply.",
    effects: [{ type: "goTo", scene: "saltreach-commons" }],
  },
  {
    id: "leave-saltreach-channel-works",
    scene: "saltreach-channel-works",
    label: "Leave the channel works",
    description: "Return to the Saltreach commons without taking the night-mark risk.",
    effects: [{ type: "goTo", scene: "saltreach-commons" }],
  },
] as const satisfies readonly ChoiceData[];
