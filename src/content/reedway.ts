import type { ChoiceData, SceneData } from "./scenario.js";

export const REEDWAY_FACT_LABELS = {
  "reedway-regulator-bought": "You paid Sera Vale for the surviving pressure regulator.",
  "reedway-regulator-liened": "You accepted Sera Vale's work lien for the surviving pressure regulator.",
  "reedway-regulator-forced": "You took the surviving regulator over Sera Vale's objection.",
  "reedway-regulator-canalwright": "You used your canalwright training and clean water to restore Sera Vale's bilge pump in exchange for the regulator.",
  "reedway-regulator-kit-traded": "You traded your repair kit for the surviving pressure regulator.",
  "reedway-clinic-powered": "The Reedway clinic annex's sterilizer is powered by the recovered regulator.",
  "reedway-ferry-powered": "The Reedway worker ferry's hauling engine is powered by the recovered regulator.",
  "reedway-patients-treated-with-medicine": "You treated the Reedway annex patients with medicine from your pack.",
  "reedway-patients-treated-with-supplies": "You treated the Reedway annex patients with a general supply kit.",
  "reedway-patients-triaged-as-medic": "You triaged the Reedway annex patients under your field-medic practice.",
  "reedway-clinic-treatment-ordered": "You put the Reedway annex patients on imported sterile packs and a new debt.",
  "reedway-relief-sent-with-sera": "Sera Vale's crew carried relief to the Reedway workers at her discounted rate.",
  "reedway-relief-hauled-by-porters": "You hired porters to deliver worker relief after Sera refused to help.",
  "reedway-relief-commissioned-with-sera": "You commissioned Sera Vale's crew to carry relief on credit.",
  "reedway-relief-commissioned-with-porters": "You took on debt to hire porters for the worker relief delivery.",
  "reedway-deckhand-treated": "You treated Sera Vale's injured deckhand, Milo Fen.",
  "reedway-deckhand-splinted-as-medic": "You splinted Sera Vale's injured deckhand under your field-medic practice.",
} as const satisfies Readonly<Record<string, string>>;

export const REEDWAY_SCENES = [
  {
    id: "reedway-commons",
    title: "Reedway Commons",
    text: [
      {
        text: "The raised causeway links Ilyra's clinic annex, Orin's worker landing and Sera Vale's stranded barge. The shores remain open; paths lead back to both Lowsail and Blackglass.",
        when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
      },
      {
        text: "The raised causeway links Ilyra's clinic annex, Orin's worker landing and Sera Vale's stranded barge. The Archive case remains open; the landing is the road back while you decide whether to carry a verdict upriver.",
        when: [
          { type: "flag", flag: "archive-started", value: true },
          { type: "flag", flag: "archive-verdict-recorded", value: false },
          { type: "flag", flag: "archive-returned", value: false },
          { type: "flag", flag: "blackglass-resolved", value: false },
        ],
      },
      {
        text: "The raised causeway links Ilyra's clinic annex, Orin's worker landing and Sera Vale's stranded barge. The Archive verdict is decided; the Lowsail record is the road back while Blackglass waits for its pressure crossing.",
        when: [
          { type: "flag", flag: "archive-verdict-recorded", value: true },
          { type: "flag", flag: "archive-returned", value: false },
          { type: "flag", flag: "blackglass-resolved", value: false },
        ],
      },
      {
        text: "The Archive decision and Blackglass account are already carried; the Reedway shores remain open for this journey.",
        when: [
          { type: "flag", flag: "archive-returned", value: true },
          { type: "flag", flag: "blackglass-resolved", value: true },
        ],
      },
      {
        text: "One regulator survived on Sera's barge. Ilyra offers two medicine for restoring the sterilizer; Orin offers two supplies for restoring heavy transport. Visit both before deciding. You can also arrange patient care and worker relief without repairing either machine.",
        when: [
          { type: "flag", flag: "reedway-regulator-recovered", value: false },
          { type: "flag", flag: "reedway-clinic-powered", value: false },
          { type: "flag", flag: "reedway-ferry-powered", value: false },
        ],
      },
      {
        text: "The regulator is off Sera's barge and still unassigned. Ilyra's clinic and Orin's ferry are waiting for the same part; choose its destination.",
        when: [
          { type: "flag", flag: "reedway-regulator-recovered", value: true },
          { type: "flag", flag: "reedway-clinic-powered", value: false },
          { type: "flag", flag: "reedway-ferry-powered", value: false },
        ],
      },
      {
        text: "Ilyra's sterilizer is running in the annex. The regulator cannot also power Orin's ferry.",
        when: [{ type: "flag", flag: "reedway-clinic-powered", value: true }],
      },
      {
        text: "Orin's heavy transport is running at the landing. The regulator cannot also power Ilyra's sterilizer.",
        when: [{ type: "flag", flag: "reedway-ferry-powered", value: true }],
      },
      {
        text: "Ilyra's annex patients have received the care you provided, and the beds are back under her watch.",
        when: [{ type: "flag", flag: "reedway-patients-treated", value: true }],
      },
      {
        text: "Relief crates have reached the upper-bank workers. Orin's people are distributing the load you arranged.",
        when: [{ type: "flag", flag: "reedway-relief-sent", value: true }],
      },
      {
        text: "Sera has pulled her crew out of your work after the seizure. Hired porters charge more than she did.",
        when: [{ type: "flag", flag: "reedway-salvager-hostile", value: true }],
      },
      {
        text: "Milo Fen rests with his hand dressed. Sera greets you willingly after the care you gave her deckhand.",
        when: [
          { type: "flag", flag: "reedway-crew-treated", value: true },
          { type: "flag", flag: "reedway-salvager-hostile", value: false },
        ],
      },
      {
        text: "Milo still wears your dressing, but taking the regulator afterward cost you Sera's goodwill. She keeps her crew away.",
        when: [
          { type: "flag", flag: "reedway-crew-treated", value: true },
          { type: "flag", flag: "reedway-salvager-hostile", value: true },
        ],
      },
    ],
  },
  {
    id: "reedway-salvage-barge",
    title: "The Stranded Barge",
    text: [
      {
        text: "Sera Vale, the Archive keeper who also owns this salvage claim, has lashed the barge to a willow stump. Its cargo is ruined, but one pressure regulator survived above the waterline. She is responsible for the crew and needs this work to keep them paid.",
      },
      {
        text: "Milo Fen sits beside the winch, cradling a crushed hand. Sera has bound it in sailcloth; he needs a proper dressing and support.",
        when: [{ type: "flag", flag: "reedway-crew-treated", value: false }],
      },
      {
        text: "The single regulator can power Ilyra's sterilizer or Orin's hauling engine. It cannot be installed in both, so Sera asks how you will take responsibility for it.",
        when: [{ type: "flag", flag: "reedway-regulator-recovered", value: false }],
      },
      {
        text: "The regulator is off the barge and still unassigned. The clinic and worker landing remain open while you consider its destination.",
        when: [
          { type: "flag", flag: "reedway-regulator-recovered", value: true },
          { type: "flag", flag: "reedway-clinic-powered", value: false },
          { type: "flag", flag: "reedway-ferry-powered", value: false },
        ],
      },
      {
        text: "The regulator now turns Ilyra's annex sterilizer; there is no second part for Orin's ferry.",
        when: [{ type: "flag", flag: "reedway-clinic-powered", value: true }],
      },
      {
        text: "The regulator now drives Orin's ferry engine; there is no second part for Ilyra's sterilizer.",
        when: [{ type: "flag", flag: "reedway-ferry-powered", value: true }],
      },
      {
        text: "Sera will not accept a lien or credit that would take total debt above four. A seizure closes her discounted relief route.",
      },
      {
        text: "Sera refuses to put her crew on your relief work after the seizure. You would have to hire more expensive porters.",
        when: [{ type: "flag", flag: "reedway-salvager-hostile", value: true }],
      },
      {
        text: "Milo's hand is dressed and supported. Sera's crew welcomes the person who cared for their deckhand.",
        when: [
          { type: "flag", flag: "reedway-crew-treated", value: true },
          { type: "flag", flag: "reedway-salvager-hostile", value: false },
        ],
      },
      {
        text: "Milo's hand still carries your dressing. Sera acknowledges the earlier help, but taking the regulator afterward cost you her cooperation.",
        when: [
          { type: "flag", flag: "reedway-crew-treated", value: true },
          { type: "flag", flag: "reedway-salvager-hostile", value: true },
        ],
      },
    ],
  },
  {
    id: "reedway-clinic-annex",
    title: "Ilyra's Clinic Annex",
    text: [
      {
        text: "Ilyra Senn has moved the fever beds above the flood line. Her cracked steam regulator leaves the sterilizer idle, but patient care can begin before the barge part is found.",
        when: [
          { type: "flag", flag: "reedway-clinic-powered", value: false },
          { type: "flag", flag: "reedway-ferry-powered", value: false },
        ],
      },
      {
        text: "The annex sterilizer is still waiting for the single regulator. Orin has asked for that same part for the worker ferry; you can return to the commons before choosing.",
        when: [
          { type: "flag", flag: "reedway-clinic-powered", value: false },
          { type: "flag", flag: "reedway-ferry-powered", value: false },
        ],
      },
      {
        text: "Orin's ferry has the single regulator. Ilyra's annex can still treat patients, but its sterilizer must wait for another part.",
        when: [
          { type: "flag", flag: "reedway-clinic-powered", value: false },
          { type: "flag", flag: "reedway-ferry-powered", value: true },
        ],
      },
      {
        text: "The sterilizer hisses steadily. Ilyra shared two medicine from the reserve your repair made usable; the treatment benches can stay open.",
        when: [{ type: "flag", flag: "reedway-clinic-powered", value: true }],
      },
      {
        text: "Imported sterile packs add two debt marks and are available only while the debt ceiling of four is not exceeded.",
        when: [
          { type: "flag", flag: "reedway-patients-treated", value: false },
          { type: "resourceAtMost", resource: "debt", value: 2 },
        ],
      },
      {
        text: "The supplier will not extend another two marks of credit against your current debt. Ilyra can still use medicine or supplies you bring.",
        when: [{ type: "flag", flag: "reedway-patients-treated", value: false }, { type: "resourceAtLeast", resource: "debt", value: 3 }],
      },
      {
        text: "Ilyra's annex patients have received the care you provided, and the beds are back under her watch.",
        when: [{ type: "flag", flag: "reedway-patients-treated", value: true }],
      },
    ],
  },
  {
    id: "reedway-worker-landing",
    title: "Orin's Worker Landing",
    text: [
      {
        text: "Orin Pell's crew pulls the ferry by hand. Without a regulator, its hauling engine cannot carry the heavy loads that keep the upper bank supplied.",
        when: [
          { type: "flag", flag: "reedway-ferry-powered", value: false },
          { type: "flag", flag: "reedway-clinic-powered", value: false },
        ],
      },
      {
        text: "The worker ferry is still waiting for the single regulator. Ilyra needs the same part for the clinic; you can return to the commons before choosing.",
        when: [
          { type: "flag", flag: "reedway-ferry-powered", value: false },
          { type: "flag", flag: "reedway-clinic-powered", value: false },
        ],
      },
      {
        text: "Ilyra's annex has the single regulator. Orin's crew can still send relief, but the hauling engine must wait for another part.",
        when: [
          { type: "flag", flag: "reedway-ferry-powered", value: false },
          { type: "flag", flag: "reedway-clinic-powered", value: true },
        ],
      },
      {
        text: "The ferry engine hauls heavy loads again. Orin shared two supplies from the freight your repair let the crew unload.",
        when: [{ type: "flag", flag: "reedway-ferry-powered", value: true }],
      },
      {
        text: "Sera's crew can carry relief for one supply while her cooperation holds. Porters cost two supplies after a seizure; credit remains subject to the debt ceiling of four.",
        when: [{ type: "flag", flag: "reedway-relief-sent", value: false }],
      },
      {
        text: "Orin's workers have received the relief load you chose to send, and the landing settles around the ferry.",
        when: [{ type: "flag", flag: "reedway-relief-sent", value: true }],
      },
    ],
  },
] as const satisfies readonly SceneData[];

export const REEDWAY_CHOICES = [
  {
    id: "explore-reedway-from-lowsail",
    scene: "lowsail-after-blackglass",
    label: "Explore the Reedway shores",
    description: "Visit the clinic annex, worker landing and stranded barge within this journey. Travel costs nothing; you can return to Lowsail and finish whenever you wish.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
    effects: [{ type: "goTo", scene: "reedway-commons" }],
  },
  {
    id: "explore-reedway-from-blackglass",
    scene: "blackglass-quay",
    label: "Walk to the Reedway commons",
    description: "Visit the Reedway commons within this journey. Travel costs nothing; you can return to Blackglass or Lowsail whenever you wish.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
    effects: [{ type: "goTo", scene: "reedway-commons" }],
  },
  {
    id: "return-to-open-archive-from-reedway",
    scene: "reedway-commons",
    label: "Return to the open Archive case",
    description: "Return to the Archive landing with the regional account intact. The case remains open and the Blackglass pressure clock has not started.",
    when: [
      { type: "flag", flag: "archive-started", value: true },
      { type: "flag", flag: "archive-verdict-recorded", value: false },
    ],
    effects: [{ type: "goTo", scene: "lantern-landing" }],
  },
  {
    id: "return-to-archive-record-from-reedway",
    scene: "reedway-commons",
    label: "Return to the Archive record",
    description: "Return to the Lowsail record with the verdict intact. Revisit the regional account whenever you are ready.",
    when: [{ type: "flag", flag: "archive-verdict-recorded", value: true }],
    effects: [{ type: "goTo", scene: "lowsail-reckoning" }],
  },
  {
    id: "visit-reedway-barge",
    scene: "reedway-commons",
    label: "Visit the stranded barge",
    description: "Talk to Sera Vale about the surviving regulator, her injured deckhand and the salvage claim.",
    effects: [{ type: "goTo", scene: "reedway-salvage-barge" }],
  },
  {
    id: "visit-reedway-clinic",
    scene: "reedway-commons",
    label: "Visit Ilyra's annex",
    description: "Hear what the regulator would make possible and handle the annex patients if you can.",
    effects: [{ type: "goTo", scene: "reedway-clinic-annex" }],
  },
  {
    id: "visit-reedway-workers",
    scene: "reedway-commons",
    label: "Visit Orin's landing",
    description: "Hear what the regulator would make possible and decide how relief will reach the workers.",
    effects: [{ type: "goTo", scene: "reedway-worker-landing" }],
  },
  {
    id: "return-to-lowsail-from-reedway",
    scene: "reedway-commons",
    label: "Return to Lowsail",
    description: "Return to the town with your pressure account. You can finish the journey there or come back to the shores.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
    effects: [{ type: "goTo", scene: "lowsail-after-blackglass" }],
  },
  {
    id: "return-to-blackglass-from-reedway",
    scene: "reedway-commons",
    label: "Return to Blackglass Quay",
    description: "Revisit the settled works and the people waiting at the quay.",
    when: [{ type: "flag", flag: "blackglass-resolved", value: true }],
    effects: [{ type: "goTo", scene: "blackglass-quay" }],
  },
  {
    id: "close-reedway-clinic-account",
    scene: "reedway-commons",
    label: "Finish this journey: close the clinic account",
    description: "Finish this journey by recording that the recovered regulator powers Ilyra's annex sterilizer and closing the Reedway account.",
    when: [{ type: "flag", flag: "reedway-clinic-powered", value: true }],
    effects: [],
    outcome: {
      status: "completed",
      summary: "You leave Ilyra's sterilizer running. The annex can keep its treatment benches open, while Orin's crew still hauls the heavy ferry loads by hand.",
    },
  },
  {
    id: "close-reedway-ferry-account",
    scene: "reedway-commons",
    label: "Finish this journey: close the ferry account",
    description: "Finish this journey by recording that the recovered regulator powers Orin's heavy worker transport and closing the Reedway account.",
    when: [{ type: "flag", flag: "reedway-ferry-powered", value: true }],
    effects: [],
    outcome: {
      status: "completed",
      summary: "You leave a working freight ferry at the upper bank. Orin's crew can move heavy loads again; Ilyra's annex still relies on hand-boiled instruments.",
    },
  },
  {
    id: "leave-reedway-barge",
    scene: "reedway-salvage-barge",
    label: "Return to the commons",
    description: "Leave the salvage site and visit either shore.",
    effects: [{ type: "goTo", scene: "reedway-commons" }],
  },
  {
    id: "leave-reedway-clinic",
    scene: "reedway-clinic-annex",
    label: "Return to the commons",
    description: "Leave the annex and visit the worker landing or salvage site.",
    effects: [{ type: "goTo", scene: "reedway-commons" }],
  },
  {
    id: "leave-reedway-workers",
    scene: "reedway-worker-landing",
    label: "Return to the commons",
    description: "Leave the landing and visit the clinic or salvage site.",
    effects: [{ type: "goTo", scene: "reedway-commons" }],
  },
  {
    id: "buy-reedway-regulator",
    scene: "reedway-salvage-barge",
    label: "Buy the regulator from Sera",
    description: "Spend one supply to honor Sera's salvage claim, then carry the regulator back to the commons. Her crew will keep its discounted relief route.",
    when: [
      { type: "flag", flag: "reedway-regulator-recovered", value: false },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "adjustResource", resource: "reedway-regulator", delta: 1 },
      { type: "setFlag", flag: "reedway-regulator-recovered", value: true },
      { type: "setFlag", flag: "reedway-salvager-hostile", value: false },
      { type: "addFact", fact: "reedway-regulator-bought" },
      { type: "goTo", scene: "reedway-commons" },
    ],
  },
  {
    id: "accept-reedway-work-lien",
    scene: "reedway-salvage-barge",
    label: "Accept Sera's work lien",
    description: "Take the regulator against one debt mark, up to the debt ceiling of four, then carry it back to the commons. Sera's crew keeps its discounted relief route.",
    when: [
      { type: "flag", flag: "reedway-regulator-recovered", value: false },
      { type: "resourceAtMost", resource: "debt", value: 3 },
    ],
    effects: [
      { type: "adjustResource", resource: "debt", delta: 1 },
      { type: "adjustResource", resource: "reedway-regulator", delta: 1 },
      { type: "setFlag", flag: "reedway-regulator-recovered", value: true },
      { type: "setFlag", flag: "reedway-salvager-hostile", value: false },
      { type: "addFact", fact: "reedway-regulator-liened" },
      { type: "goTo", scene: "reedway-commons" },
    ],
  },
  {
    id: "force-reedway-regulator",
    scene: "reedway-salvage-barge",
    label: "Seize the regulator",
    description: "Take the part over Sera's objection and carry it back to the commons without paying her. Her discounted relief transport will no longer be available.",
    when: [{ type: "flag", flag: "reedway-regulator-recovered", value: false }],
    effects: [
      { type: "adjustResource", resource: "reedway-regulator", delta: 1 },
      { type: "setFlag", flag: "reedway-regulator-recovered", value: true },
      { type: "setFlag", flag: "reedway-salvager-hostile", value: true },
      { type: "addFact", fact: "reedway-regulator-forced" },
      { type: "goTo", scene: "reedway-commons" },
    ],
  },
  {
    id: "fit-reedway-regulator-as-canalwright",
    scene: "reedway-salvage-barge",
    label: "Repair Sera's pump in exchange for the part",
    description: "Use one unit of clean water and your canalwright training to restore Sera's bilge pump in exchange for the regulator. Carry it back to the commons; her crew keeps its discounted relief route.",
    when: [
      { type: "flag", flag: "reedway-regulator-recovered", value: false },
      { type: "flag", flag: "background-canalwright", value: true },
      { type: "resourceAtLeast", resource: "water", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "water", delta: -1 },
      { type: "adjustResource", resource: "reedway-regulator", delta: 1 },
      { type: "setFlag", flag: "reedway-regulator-recovered", value: true },
      { type: "setFlag", flag: "reedway-salvager-hostile", value: false },
      { type: "addFact", fact: "reedway-regulator-canalwright" },
      { type: "goTo", scene: "reedway-commons" },
    ],
  },
  {
    id: "trade-reedway-repair-kit",
    scene: "reedway-salvage-barge",
    label: "Trade the repair kit for the regulator",
    description: "Give Sera one repair kit for the part, then carry the regulator back to the commons. Her crew will keep its discounted relief route.",
    when: [
      { type: "flag", flag: "reedway-regulator-recovered", value: false },
      { type: "resourceAtLeast", resource: "tools", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "tools", delta: -1 },
      { type: "adjustResource", resource: "reedway-regulator", delta: 1 },
      { type: "setFlag", flag: "reedway-regulator-recovered", value: true },
      { type: "setFlag", flag: "reedway-salvager-hostile", value: false },
      { type: "addFact", fact: "reedway-regulator-kit-traded" },
      { type: "goTo", scene: "reedway-commons" },
    ],
  },
  {
    id: "treat-reedway-deckhand",
    scene: "reedway-salvage-barge",
    label: "Treat Milo's injured hand",
    description: "Spend one medicine to dress and support Milo's hand. Sera will cooperate with your relief work, even if you took the regulator over her objection.",
    when: [
      { type: "flag", flag: "reedway-crew-treated", value: false },
      { type: "resourceAtLeast", resource: "medicine", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "medicine", delta: -1 },
      { type: "setFlag", flag: "reedway-crew-treated", value: true },
      { type: "setFlag", flag: "reedway-salvager-hostile", value: false },
      { type: "addFact", fact: "reedway-deckhand-treated" },
      { type: "goTo", scene: "reedway-salvage-barge" },
    ],
  },
  {
    id: "splint-reedway-deckhand-as-medic",
    scene: "reedway-salvage-barge",
    label: "Splint Milo's hand as a field medic",
    description: "Use your training and one supply to support Milo's injured hand. Sera will cooperate with your relief work, even after the seizure.",
    when: [
      { type: "flag", flag: "reedway-crew-treated", value: false },
      { type: "flag", flag: "background-field-medic", value: true },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "setFlag", flag: "reedway-crew-treated", value: true },
      { type: "setFlag", flag: "reedway-salvager-hostile", value: false },
      { type: "addFact", fact: "reedway-deckhand-splinted-as-medic" },
      { type: "goTo", scene: "reedway-salvage-barge" },
    ],
  },
  {
    id: "install-reedway-regulator-at-clinic",
    scene: "reedway-clinic-annex",
    label: "Install the regulator in Ilyra's sterilizer",
    description: "Use the regulator to restore the sterilizer permanently. Ilyra gives you two medicine from her reserve; the ferry will keep hauling by hand.",
    when: [
      { type: "flag", flag: "reedway-regulator-recovered", value: true },
      { type: "resourceAtLeast", resource: "reedway-regulator", value: 1 },
      { type: "flag", flag: "reedway-clinic-powered", value: false },
      { type: "flag", flag: "reedway-ferry-powered", value: false },
    ],
    effects: [
      { type: "adjustResource", resource: "reedway-regulator", delta: -1 },
      { type: "setFlag", flag: "reedway-clinic-powered", value: true },
      { type: "adjustResource", resource: "medicine", delta: 2 },
      { type: "addFact", fact: "reedway-clinic-powered" },
      { type: "goTo", scene: "reedway-clinic-annex" },
    ],
  },
  {
    id: "treat-reedway-patients-with-medicine",
    scene: "reedway-clinic-annex",
    label: "Treat the patients with medicine",
    description: "Spend one medicine to treat the annex patients before or after the sterilizer is powered.",
    when: [
      { type: "flag", flag: "reedway-patients-treated", value: false },
      { type: "resourceAtLeast", resource: "medicine", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "medicine", delta: -1 },
      { type: "setFlag", flag: "reedway-patients-treated", value: true },
      { type: "addFact", fact: "reedway-patients-treated-with-medicine" },
      { type: "goTo", scene: "reedway-clinic-annex" },
    ],
  },
  {
    id: "treat-reedway-patients-with-supplies",
    scene: "reedway-clinic-annex",
    label: "Treat the patients with a supply kit",
    description: "Give Ilyra two supplies for fuel and fresh dressings so she can treat the patients with equipment boiled by hand.",
    when: [
      { type: "flag", flag: "reedway-patients-treated", value: false },
      { type: "flag", flag: "background-field-medic", value: false },
      { type: "resourceAtLeast", resource: "supplies", value: 2 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -2 },
      { type: "setFlag", flag: "reedway-patients-treated", value: true },
      { type: "addFact", fact: "reedway-patients-treated-with-supplies" },
      { type: "goTo", scene: "reedway-clinic-annex" },
    ],
  },
  {
    id: "triage-reedway-patients-as-medic",
    scene: "reedway-clinic-annex",
    label: "Triage the patients as a field medic",
    description: "Spend one supply and use your field-medic practice to treat the annex patients.",
    when: [
      { type: "flag", flag: "reedway-patients-treated", value: false },
      { type: "flag", flag: "background-field-medic", value: true },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "setFlag", flag: "reedway-patients-treated", value: true },
      { type: "addFact", fact: "reedway-patients-triaged-as-medic" },
      { type: "goTo", scene: "reedway-clinic-annex" },
    ],
  },
  {
    id: "order-reedway-clinic-treatment",
    scene: "reedway-clinic-annex",
    label: "Order imported sterile packs",
    description: "Add two debt marks for imported packs, up to the debt ceiling of four, and treat the patients without spending supplies.",
    when: [
      { type: "flag", flag: "reedway-patients-treated", value: false },
      { type: "resourceAtMost", resource: "debt", value: 2 },
    ],
    effects: [
      { type: "adjustResource", resource: "debt", delta: 2 },
      { type: "setFlag", flag: "reedway-patients-treated", value: true },
      { type: "addFact", fact: "reedway-clinic-treatment-ordered" },
      { type: "goTo", scene: "reedway-clinic-annex" },
    ],
  },
  {
    id: "install-reedway-regulator-at-workers",
    scene: "reedway-worker-landing",
    label: "Install the regulator in Orin's ferry",
    description: "Use the regulator to restore heavy transport. Orin gives you two supplies from the newly unloaded freight; the annex will keep sterilizing by hand.",
    when: [
      { type: "flag", flag: "reedway-regulator-recovered", value: true },
      { type: "resourceAtLeast", resource: "reedway-regulator", value: 1 },
      { type: "flag", flag: "reedway-clinic-powered", value: false },
      { type: "flag", flag: "reedway-ferry-powered", value: false },
    ],
    effects: [
      { type: "adjustResource", resource: "reedway-regulator", delta: -1 },
      { type: "setFlag", flag: "reedway-ferry-powered", value: true },
      { type: "adjustResource", resource: "supplies", delta: 2 },
      { type: "addFact", fact: "reedway-ferry-powered" },
      { type: "goTo", scene: "reedway-worker-landing" },
    ],
  },
  {
    id: "send-reedway-relief-with-sera",
    scene: "reedway-worker-landing",
    label: "Send relief with Sera's crew",
    description: "Spend one supply and use Sera's discounted route while her cooperation holds.",
    when: [
      { type: "flag", flag: "reedway-relief-sent", value: false },
      { type: "flag", flag: "reedway-salvager-hostile", value: false },
      { type: "resourceAtLeast", resource: "supplies", value: 1 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -1 },
      { type: "setFlag", flag: "reedway-relief-sent", value: true },
      { type: "addFact", fact: "reedway-relief-sent-with-sera" },
      { type: "goTo", scene: "reedway-worker-landing" },
    ],
  },
  {
    id: "haul-reedway-relief-with-porters",
    scene: "reedway-worker-landing",
    label: "Haul relief with porters",
    description: "Spend two supplies to send relief with hired porters. Sera has refused to lend her crew after the seizure.",
    when: [
      { type: "flag", flag: "reedway-relief-sent", value: false },
      { type: "flag", flag: "reedway-salvager-hostile", value: true },
      { type: "resourceAtLeast", resource: "supplies", value: 2 },
    ],
    effects: [
      { type: "adjustResource", resource: "supplies", delta: -2 },
      { type: "setFlag", flag: "reedway-relief-sent", value: true },
      { type: "addFact", fact: "reedway-relief-hauled-by-porters" },
      { type: "goTo", scene: "reedway-worker-landing" },
    ],
  },
  {
    id: "commission-reedway-relief-with-sera",
    scene: "reedway-worker-landing",
    label: "Commission Sera's crew on credit",
    description: "Add one debt mark, up to the debt ceiling of four, to commission Sera's crew while her cooperation holds.",
    when: [
      { type: "flag", flag: "reedway-relief-sent", value: false },
      { type: "flag", flag: "reedway-salvager-hostile", value: false },
      { type: "resourceAtMost", resource: "debt", value: 3 },
    ],
    effects: [
      { type: "adjustResource", resource: "debt", delta: 1 },
      { type: "setFlag", flag: "reedway-relief-sent", value: true },
      { type: "addFact", fact: "reedway-relief-commissioned-with-sera" },
      { type: "goTo", scene: "reedway-worker-landing" },
    ],
  },
  {
    id: "commission-reedway-relief-with-porters",
    scene: "reedway-worker-landing",
    label: "Commission porters on credit",
    description: "Add two debt marks to hire porters after Sera's refusal. New credit cannot take your total Debt above four.",
    when: [
      { type: "flag", flag: "reedway-relief-sent", value: false },
      { type: "flag", flag: "reedway-salvager-hostile", value: true },
      { type: "resourceAtMost", resource: "debt", value: 2 },
    ],
    effects: [
      { type: "adjustResource", resource: "debt", delta: 2 },
      { type: "setFlag", flag: "reedway-relief-sent", value: true },
      { type: "addFact", fact: "reedway-relief-commissioned-with-porters" },
      { type: "goTo", scene: "reedway-worker-landing" },
    ],
  },
] as const satisfies readonly ChoiceData[];
