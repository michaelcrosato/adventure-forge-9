import type { ChoiceData, SceneData } from "./scenario.js";

/** A persistent regional loop entered only after the pressure works are settled. */
export const REEDWAY_SCENES = [
  {
    id: "reedway-commons",
    title: "Reedway Commons",
    text: [
      { text: "The raised causeway joins Lowsail's clinic annex to the Blackglass worker landing. Boats still reach the stranded salvage barge below it. You can visit either shore and return before making a commitment." },
      { text: "Ilyra needs a regulator for the clinic's sterilizer; Orin needs the same part for the worker ferry's hauling engine. The barge holds one working regulator. Hear their plans before deciding where it belongs." },
    ],
  },
  {
    id: "reedway-salvage-barge",
    title: "The Stranded Barge",
    text: [
      { text: "Salvager Sera Vale has lashed the barge to a willow stump. Its cargo is ruined, but one pressure regulator survived above the waterline. Sera owns the salvage claim and needs the work to keep her crew paid." },
      { text: "The regulator can run Ilyra's sterilizer or Orin's hauling engine. It cannot be installed in both. The shores remain open while you consider what to do." },
    ],
  },
  {
    id: "reedway-clinic-annex",
    title: "Ilyra's Clinic Annex",
    text: [
      { text: "Ilyra Senn has moved the fever beds above the flood line. Clean water alone cannot sterilize the instruments: the annex's steam regulator has cracked. She asks you to recover the barge's intact part." },
      { text: "A working sterilizer would let the ward reopen its treatment benches. Orin has asked for that same regulator for the worker ferry; you can hear his case before choosing." },
    ],
  },
  {
    id: "reedway-worker-landing",
    title: "Orin's Worker Landing",
    text: [
      { text: "Orin Pell's crew pulls the ferry by hand. Without a regulator, its hauling engine cannot carry the heavy loads that keep the upper bank supplied. He asks for the intact part on Sera's barge." },
      { text: "The clinic needs the same part. Orin will show you the landing without asking you to promise it to him, and the commons leads back to Ilyra." },
    ],
  },
] as const satisfies readonly SceneData[];

export const REEDWAY_CHOICES = [
  {
    id: "explore-reedway-from-lowsail", scene: "lowsail-after-blackglass",
    label: "Explore the Reedway shores", description: "Visit the clinic annex, worker landing and stranded salvage barge. You can return to Lowsail and close your journey whenever you wish.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
    effects: [{ type: "goTo", scene: "reedway-commons" }],
  },
  {
    id: "explore-reedway-from-blackglass", scene: "blackglass-quay",
    label: "Walk to the Reedway commons", description: "Leave the settled pressure works to visit the shores between Blackglass and Lowsail. The return route remains open.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
    effects: [{ type: "goTo", scene: "reedway-commons" }],
  },
  { id: "visit-reedway-barge", scene: "reedway-commons", label: "Visit the stranded barge", description: "Talk to Sera Vale about the surviving regulator and her salvage claim.", effects: [{ type: "goTo", scene: "reedway-salvage-barge" }] },
  { id: "visit-reedway-clinic", scene: "reedway-commons", label: "Visit Ilyra's annex", description: "Hear what the regulator would make possible at the clinic.", effects: [{ type: "goTo", scene: "reedway-clinic-annex" }] },
  { id: "visit-reedway-workers", scene: "reedway-commons", label: "Visit Orin's landing", description: "Hear what the regulator would make possible for the worker ferry.", effects: [{ type: "goTo", scene: "reedway-worker-landing" }] },
  { id: "return-to-lowsail-from-reedway", scene: "reedway-commons", label: "Return to Lowsail", description: "Return to the town with your pressure account. You can finish the journey there or come back to the shores.", effects: [{ type: "goTo", scene: "lowsail-after-blackglass" }] },
  { id: "return-to-blackglass-from-reedway", scene: "reedway-commons", label: "Return to Blackglass Quay", description: "Revisit the settled works and the people waiting at the quay.", effects: [{ type: "goTo", scene: "blackglass-quay" }] },
  { id: "leave-reedway-barge", scene: "reedway-salvage-barge", label: "Return to the commons", description: "Leave the salvage site and visit either shore.", effects: [{ type: "goTo", scene: "reedway-commons" }] },
  { id: "leave-reedway-clinic", scene: "reedway-clinic-annex", label: "Return to the commons", description: "Leave the annex and visit the worker landing or salvage site.", effects: [{ type: "goTo", scene: "reedway-commons" }] },
  { id: "leave-reedway-workers", scene: "reedway-worker-landing", label: "Return to the commons", description: "Leave the landing and visit the clinic or salvage site.", effects: [{ type: "goTo", scene: "reedway-commons" }] },
] as const satisfies readonly ChoiceData[];
