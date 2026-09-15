import type { ChoiceData, SceneData } from "./scenario.js";

export const FENWARD_FACT_LABELS = {
  "fenward-beacon-lit": "You lit Pera Holt's Fenward warning beacon for the causeway.",
  "fenward-ford-charted": "You charted Jori Kett's submerged Fenward ford for the night convoy.",
} as const satisfies Readonly<Record<string, string>>;

export const FENWARD_SCENES = [
  {
    id: "fenward-landing",
    title: "Fenward Causeway",
    text: [
      {
        text: "Beyond Saltreach, the raised causeway enters Fenward's reed floodplain. Pera Holt keeps a warning beacon on the tower; Jori Kett knows a submerged ford the convoy can cross only by sound.",
        when: [{ type: "flag", flag: "fenward-resolved", value: false }],
      },
      {
        text: "Nyra's dry stores carried the Saltreach convoy this far. Pera can keep the beacon lit, but the causeway still needs a choice about who can find it after dark.",
        when: [{ type: "flag", flag: "saltreach-tidehouse-secured", value: true }],
      },
      {
        text: "Halden's channel marks brought a night convoy to Fenward's edge. Jori can guide it through the reeds, but the beacon is still dark.",
        when: [{ type: "flag", flag: "saltreach-channel-marked", value: true }],
      },
      {
        text: "Pera's beacon now marks the raised causeway beyond Saltreach. The convoy can find the safe bank before the lamps go out.",
        when: [{ type: "flag", flag: "fenward-beacon-lit", value: true }],
      },
      {
        text: "Jori's ford chart carries the night convoy around the flooded reed beds. The route is dangerous, but it no longer depends on a guide standing in the dark.",
        when: [{ type: "flag", flag: "fenward-ford-charted", value: true }],
      },
      {
        text: "Bex's Cinderwake lock now holds the industrial flow beyond Fenward. The causeway carries clean stores instead of soot water.",
        when: [{ type: "flag", flag: "cinderwake-lock-secured", value: true }],
      },
      {
        text: "Tessa's Cinderwake smoke-road marks guide the night haul beyond Fenward. The kiln route remains exposed, but the carts keep moving.",
        when: [{ type: "flag", flag: "cinderwake-smoke-road-marked", value: true }],
      },
    ],
  },
  {
    id: "fenward-beacon",
    title: "Pera's Beacon Tower",
    text: [
      {
        text: "Pera Holt's beacon tower leans over the reeds. Its lamp can mark the raised bank, but the shutters are warped and the oil stores are low.",
        when: [{ type: "flag", flag: "fenward-resolved", value: false }],
      },
      {
        text: "One Supply can brace the shutters and leave enough oil for the convoy's return. The light will tell Fenward where the safe bank begins.",
        when: [{ type: "flag", flag: "fenward-resolved", value: false }],
      },
      {
        text: "Jori's ford chart can guide the convoy without this lamp, but Pera still needs another supply before the beacon can stand through a storm.",
        when: [{ type: "flag", flag: "fenward-ford-charted", value: true }],
      },
      {
        text: "The beacon burns above the reeds. Pera has enough oil to mark the raised bank through the next convoy.",
        when: [{ type: "flag", flag: "fenward-beacon-lit", value: true }],
      },
    ],
  },
  {
    id: "fenward-ford",
    title: "Jori's Submerged Ford",
    text: [
      {
        text: "Jori Kett lays a rope across the submerged ford. The reeds hide a hard shelf beneath the water, but one wrong step can pull a loaded cart into the current.",
        when: [{ type: "flag", flag: "fenward-resolved", value: false }],
      },
      {
        text: "Marking the ford adds one Risk. The stakes will give the night convoy a line through the water when the beacon cannot be seen.",
        when: [{ type: "flag", flag: "fenward-resolved", value: false }],
      },
      {
        text: "Pera's beacon marks the raised bank, but Jori's ford is still uncharted. The convoy can see where to leave the water only after it crosses.",
        when: [{ type: "flag", flag: "fenward-beacon-lit", value: true }],
      },
      {
        text: "The ford stakes hold their line beneath the reeds. Jori can guide a loaded cart by touch even when the Fenward beacon is out.",
        when: [{ type: "flag", flag: "fenward-ford-charted", value: true }],
      },
    ],
  },
] as const satisfies readonly SceneData[];

export const FENWARD_CHOICES = [
  {
    id: "take-fenward-causeway",
    scene: "saltreach-commons",
    label: "Take the raised Fenward causeway",
    description: "Follow the high bank beyond Saltreach while the convoy can still see the reed markers.",
    when: [
      { type: "flag", flag: "saltreach-resolved", value: true },
      { type: "flag", flag: "fenward-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "fenward-landing" }],
  },
  {
    id: "take-fenward-night-ford",
    scene: "saltreach-commons",
    label: "Take Jori's night ford",
    description: "Follow the submerged route beyond Saltreach and trust the rope line through the reeds.",
    when: [
      { type: "flag", flag: "saltreach-resolved", value: true },
      { type: "flag", flag: "fenward-resolved", value: false },
    ],
    effects: [{ type: "goTo", scene: "fenward-landing" }],
  },
  {
    id: "revisit-fenward-from-saltreach",
    scene: "saltreach-commons",
    label: "Revisit Fenward",
    description: "Follow the causeway beyond Saltreach and see whether the beacon or ford record held.",
    when: [
      { type: "flag", flag: "saltreach-resolved", value: true },
      { type: "flag", flag: "fenward-resolved", value: true },
    ],
    effects: [{ type: "goTo", scene: "fenward-landing" }],
  },
  {
    id: "visit-fenward-beacon",
    scene: "fenward-landing",
    label: "Visit Pera's beacon tower",
    description: "Hear how one Supply can keep the raised bank visible through the next Fenward convoy.",
    effects: [{ type: "goTo", scene: "fenward-beacon" }],
  },
  {
    id: "visit-fenward-ford",
    scene: "fenward-landing",
    label: "Visit Jori's submerged ford",
    description: "Hear how a risky line of stakes can guide loaded carts through the reeds after dark.",
    effects: [{ type: "goTo", scene: "fenward-ford" }],
  },
  {
    id: "return-to-saltreach-from-fenward",
    scene: "fenward-landing",
    label: "Return to Saltreach",
    description: "Carry the Fenward decision back to the Saltreach commons without ending the journey.",
    effects: [{ type: "goTo", scene: "saltreach-commons" }],
  },
  {
    id: "secure-fenward-beacon",
    scene: "fenward-beacon",
    label: "Light the Fenward beacon",
    description: "Spend one Supply to brace Pera's shutters and keep the raised causeway visible.",
    when: [
      { type: "flag", flag: "fenward-resolved", value: false },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "setFlag", flag: "fenward-resolved", value: true },
      { type: "setFlag", flag: "fenward-beacon-lit", value: true },
      { type: "addFact", fact: "fenward-beacon-lit" },
      { type: "goTo", scene: "fenward-landing" },
    ],
  },
  {
    id: "chart-fenward-ford",
    scene: "fenward-ford",
    label: "Chart the submerged ford",
    description: "Add one Risk to stake Jori's rope line through the reeds before the night convoy returns.",
    when: [
      { type: "flag", flag: "fenward-resolved", value: false },
      { type: "resourceAtMost", resource: "risk", value: 18 },
    ],
    effects: [
      { type: "adjustResource", resource: "risk", delta: 1 },
      { type: "setFlag", flag: "fenward-resolved", value: true },
      { type: "setFlag", flag: "fenward-ford-charted", value: true },
      { type: "addFact", fact: "fenward-ford-charted" },
      { type: "goTo", scene: "fenward-landing" },
    ],
  },
  {
    id: "leave-fenward-beacon",
    scene: "fenward-beacon",
    label: "Leave the beacon tower",
    description: "Return to the Fenward causeway without spending the Supply.",
    effects: [{ type: "goTo", scene: "fenward-landing" }],
  },
  {
    id: "leave-fenward-ford",
    scene: "fenward-ford",
    label: "Leave the submerged ford",
    description: "Return to the Fenward causeway without taking the night-mark risk.",
    effects: [{ type: "goTo", scene: "fenward-landing" }],
  },
] as const satisfies readonly ChoiceData[];
