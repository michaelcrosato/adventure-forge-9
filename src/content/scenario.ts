export type ScenarioStatus = "completed" | "departed" | "dead";

export interface FlagConditionData {
  readonly type: "flag";
  readonly flag: string;
  readonly value: boolean;
}

export interface ResourceConditionData {
  readonly type: "resourceAtLeast";
  readonly resource: string;
  readonly value: number;
}

export type ConditionData = FlagConditionData | ResourceConditionData;

export interface SetFlagEffectData {
  readonly type: "setFlag";
  readonly flag: string;
  readonly value: boolean;
}

export interface SetResourceEffectData {
  readonly type: "setResource";
  readonly resource: string;
  readonly value: number;
}

export interface AdjustResourceEffectData {
  readonly type: "adjustResource";
  readonly resource: string;
  readonly delta: number;
}

export interface AddFactEffectData {
  readonly type: "addFact";
  readonly fact: string;
}

export interface GoToEffectData {
  readonly type: "goTo";
  readonly scene: string;
}

export type EffectData =
  | SetFlagEffectData
  | SetResourceEffectData
  | AdjustResourceEffectData
  | AddFactEffectData
  | GoToEffectData;

export interface TextLineData {
  readonly text: string;
  readonly when?: readonly ConditionData[];
}

export interface SceneData {
  readonly id: string;
  readonly title: string;
  readonly text: readonly TextLineData[];
}

export interface OutcomeData {
  readonly status: ScenarioStatus;
  readonly summary: string;
}

export interface ChoiceData {
  readonly id: string;
  readonly scene: string;
  readonly label: string;
  readonly description: string;
  readonly when?: readonly ConditionData[];
  readonly effects: readonly EffectData[];
  readonly outcome?: OutcomeData;
}

export interface ScenarioData {
  readonly version: 1;
  readonly initialScene: string;
  readonly initialResources: Readonly<Record<string, number>>;
  readonly initialFacts: readonly string[];
  readonly scenes: readonly SceneData[];
  readonly choices: readonly ChoiceData[];
}

/** Player-facing wording keeps internal fact identifiers out of projections. */
export const FACT_LABELS = {
  "dry-tanks": "Lowsail's tanks were dry when you arrived.",
  "stolen-water-order": "A stolen order diverted Lowsail's water; Nessa gave you a copy.",
  "clinic-visited": "Ilyra Senn asked for help at the clinic.",
  "council-heard": "Tovan Rusk offered a council seal.",
  "nessa-found": "Nessa Quill showed you the floodwork tools.",
  "clinic-promise-made": "You promised the clinic the first clean water.",
  "clinic-promise-declined": "The clinic received no promise of clean water.",
  "council-seal-carried": "The council seal is in your hand.",
  "council-offer-refused": "You refused the council's claim on the sluice.",
  "nessa-tools-borrowed": "Nessa Quill lent you one repair kit.",
  "tools-skipped": "You entered the road without repair tools.",
  "scouts-paid": "Canal scouts marked a path that all eight families can cross.",
  "order-names-council": "The stolen order bears Tovan Rusk's seal.",
  "gate-forced": "The Red Sluice gate was forced open.",
  "shared-flow-repaired": "Red Sluice is set to share clean water.",
  "council-flow-controlled": "Red Sluice is under council control.",
  "evacuation-route-open": "A flood route to high ground is open.",
  "lost-in-flood": "The flooded tunnel took you.",
  "shared-water-released": "Clean water is running toward Lowsail.",
  "council-water-released": "Council water is running toward Lowsail.",
  "evacuation-signaled": "The high-ground signal reached Lowsail.",
  "clinic-returned": "You returned to Lowsail's clinic with the water order resolved.",
  "council-returned": "You returned to Lowsail under the council's water rule.",
  "evacuation-returned": "You returned to Lowsail with an evacuation route open.",
  "clinic-water-restored": "Ilyra Senn filled the clinic jars with clean water.",
  "council-charter-signed": "Tovan Rusk recorded your council charter.",
  "market-evacuated": "Bram Dorr moved Lowsail's families above the flood line.",
  "lowsail-departed": "You departed Lowsail before the water was settled.",
  "clinic-left": "You left the clinic without closing its account.",
  "council-left": "You left the council's water charter unsigned.",
  "workshop-left": "You left Nessa Quill's workshop.",
  "road-abandoned": "You abandoned the road to Red Sluice.",
  "gate-abandoned": "You abandoned Red Sluice at the gate.",
  "chamber-abandoned": "You abandoned the control chamber.",
  "test-abandoned": "You abandoned the water test.",
  "clinic-unfinished": "The clinic account was left unfinished.",
  "charter-declined": "The council charter was left unsigned.",
  "high-ground-left": "You left the families on high ground without leading them onward.",
  "market-stranded": "You remained below the flood line.",
  "unmarked-crossing": "Seven families reached shelter; one wounded family remains at the landing.",
  "stragglers-treated": "Silverleaf let the wounded family cross with the others.",
  "clinic-exemption": "Ilyra won a clinic exemption from council rationing.",
  "kit-ferry-built": "Nessa's repair kit became a brace for the evacuation landing.",
} as const satisfies Readonly<Record<string, string>>;

/**
 * Stage 2 follows one stolen water order from Lowsail to Red Sluice and back.
 * Preparation flags gate one-time costs, and the market scene is revisited
 * with a different reaction after the water or evacuation signal returns.
 */
export const RAW_SCENARIO = {
  version: 1,
  initialScene: "lowsail-market",
  initialResources: {
    supplies: 2,
    medicine: 0,
    debt: 0,
    risk: 0,
    tools: 0,
    water: 0,
    evacuees: 0,
  },
  initialFacts: ["dry-tanks", "stolen-water-order"],
  scenes: [
    {
      id: "lowsail-market",
      title: "Lowsail Market",
      text: [
        {
          text: "Lowsail's tanks are dry while floodwater piles behind Red Sluice. Ilyra Senn's fever ward needs clean water.",
          when: [{ type: "flag", flag: "expedition-started", value: false }],
        },
        {
          text: "Nessa Quill gives you a copy of the stolen order that diverted the flow. Tovan Rusk offers council help in exchange for control; Nessa wants a shared repair.",
          when: [{ type: "flag", flag: "expedition-started", value: false }],
        },
        {
          text: "The market tanks run again. Ilyra Senn fills clinic jars while Nessa Quill watches the shared channel.",
          when: [{ type: "flag", flag: "shared-water", value: true }],
        },
        {
          text: "Water runs, but Tovan Rusk's council guards ration every bucket. Ilyra Senn counts the clinic's allotment.",
          when: [{ type: "flag", flag: "council-control", value: true }],
        },
        {
          text: "The market is closing. Bram Dorr gathers eight families at the landing; your signal has given them a way to high ground.",
          when: [{ type: "flag", flag: "evacuation-plan", value: true }],
        },
        {
          text: "The stolen order is on your table. Choose how Lowsail will remember the sluice.",
          when: [{ type: "flag", flag: "water-released", value: true }],
        },
      ],
    },
    {
      id: "clinic-yard",
      title: "Clinic Yard",
      text: [
        {
          text: "Ilyra Senn shows you two silverleaf doses. One can purge the fouled intake at Red Sluice; the other will treat the fever ward once clean water returns.",
        },
        {
          text: "She entrusts both doses to you if you promise the clinic the first clean water. Diverting them elsewhere will leave her patients waiting.",
        },
      ],
    },
    {
      id: "council-hall",
      title: "Council Hall",
      text: [
        {
          text: "Tovan Rusk unfolds the stolen water order. His seal can open Red Sluice if the council owns the gate.",
        },
        {
          text: "His goal is control. Nessa Quill's repair would give every street a share.",
        },
      ],
    },
    {
      id: "workshop",
      title: "Nessa's Workshop",
      text: [
        {
          text: "Nessa Quill lays out a cracked gear and one sound brace. She can lend tools once.",
        },
        {
          text: "The road is short, but the floodworks will punish a careless repair.",
        },
      ],
    },
    {
      id: "sluice-road",
      title: "The Canal Road",
      text: [
        {
          text: "Immediate costs: follow the canal adds 1 risk and spends 0 supplies. Paying the scouts spends 1 supply and adds 0 risk.",
        },
        {
          text: "Keep a supply if you want to repair the sluice. If you evacuate instead, scouts get all eight families across without medicine. Evacuation leaves the clinic without clean water.",
        },
      ],
    },
    {
      id: "red-sluice-gate",
      title: "Red Sluice Gate",
      text: [
        {
          text: "The gate grinds beneath floodwater. Tovan Rusk's order bears the mark of a stolen command.",
        },
        {
          text: "Beyond the gate, one control chamber can decide Lowsail's water.",
        },
      ],
    },
    {
      id: "sluice-chamber",
      title: "Control Chamber",
      text: [
        {
          text: "The control chamber is half flooded. One lever can set the town's future.",
        },
        {
          text: "Shared repair needs one repair kit (the tools resource), one supply, one silverleaf dose (the medicine resource), and Ilyra's promise. Council control needs Tovan's seal. Evacuation needs one supply or the repair kit (the tools resource) to brace the landing.",
        },
        {
          text: "An evacuation route can save families, but it leaves the market and its tanks behind.",
        },
        {
          text: "The scouts used your last supply, so shared repair is unavailable. Your kit can still brace the evacuation landing.",
          when: [{ type: "flag", flag: "repair-tools", value: true }, { type: "flag", flag: "scouts-marked", value: true }],
        },
        {
          text: "The stolen order bears a stamp naming Tovan Rusk as its owner; that stamp is not the council seal Tovan can grant you.",
          when: [{ type: "flag", flag: "gate-read", value: true }],
        },
        {
          text: "The forced gate leaks. The flooded tunnel is already rising.",
          when: [{ type: "flag", flag: "gate-forced", value: true }],
        },
      ],
    },
    {
      id: "water-test",
      title: "Water Test",
      text: [
        {
          text: "Nessa Quill watches the gauges while the first current enters the lower channel.",
        },
        {
          text: "The next release decides who receives the water and who must move.",
        },
        {
          text: "The shared channel holds. Clean water can run to the clinic.",
          when: [{ type: "flag", flag: "shared-water", value: true }],
        },
        {
          text: "The council valve locks. Tovan Rusk's guards wait for the first ration list.",
          when: [{ type: "flag", flag: "council-control", value: true }],
        },
        {
          text: "The high-ground route opens. Bram Dorr's boats can reach the market before the surge.",
          when: [{ type: "flag", flag: "evacuation-plan", value: true }],
        },
      ],
    },
    {
      id: "clinic-followthrough",
      title: "Ilyra's Clinic",
      text: [
        {
          text: "Ilyra Senn opens the clinic door. The clean flow reaches her jars, but fever patients still need medicine.",
          when: [{ type: "flag", flag: "clinic-aided", value: false }],
        },
        {
          text: "Your promise is ready to be kept or abandoned.",
          when: [{ type: "flag", flag: "clinic-aided", value: false }],
        },
        {
          text: "Ilyra has treated the fever ward. The patients drink from the first clean jars, and your promise is kept.",
          when: [{ type: "flag", flag: "clinic-aided", value: true }],
        },
      ],
    },
    {
      id: "council-followthrough",
      title: "Council Record",
      text: [
        {
          text: "Tovan Rusk has water running under council control. Every mark of debt gives him another claim on your work.",
        },
        {
          text: "The guards enforce the ration rule at every tap. Ilyra's fever ward depends on what the council allows.",
        },
      ],
    },
    {
      id: "evacuation-followthrough",
      title: "High Ground",
      text: [
        {
          text: "Bram Dorr waits with eight families at the last landing. The market stands empty behind them; the final crossing is still ahead.",
          when: [{ type: "flag", flag: "evacuation-finished", value: false }],
        },
        {
          text: "He needs one last lead through the rain before the road closes.",
          when: [{ type: "flag", flag: "evacuation-finished", value: false }],
        },
        {
          text: "The crossing is over. Bram counts the families who reached shelter as the rain covers the old market.",
          when: [{ type: "flag", flag: "evacuation-finished", value: true }],
        },
      ],
    },
  ],
  choices: [
    {
      id: "visit-clinic",
      scene: "lowsail-market",
      label: "Visit Ilyra's clinic",
      description: "Ask for medicine and promise the clinic the first clean water.",
      when: [{ type: "flag", flag: "expedition-started", value: false }],
      effects: [
        { type: "setFlag", flag: "expedition-started", value: true },
        { type: "setFlag", flag: "clinic-visit-made", value: true },
        { type: "addFact", fact: "clinic-visited" },
        { type: "goTo", scene: "clinic-yard" },
      ],
    },
    {
      id: "hear-council",
      scene: "lowsail-market",
      label: "Hear Tovan's offer",
      description: "Learn what the council will give you for control of Red Sluice.",
      when: [{ type: "flag", flag: "expedition-started", value: false }],
      effects: [
        { type: "setFlag", flag: "expedition-started", value: true },
        { type: "addFact", fact: "council-heard" },
        { type: "goTo", scene: "council-hall" },
      ],
    },
    {
      id: "find-nessa",
      scene: "lowsail-market",
      label: "Find Nessa's tools",
      description: "Ask Nessa Quill how to reach Red Sluice before the flood rises.",
      when: [{ type: "flag", flag: "expedition-started", value: false }],
      effects: [
        { type: "setFlag", flag: "expedition-started", value: true },
        { type: "addFact", fact: "nessa-found" },
        { type: "goTo", scene: "workshop" },
      ],
    },
    {
      id: "depart-lowsail",
      scene: "lowsail-market",
      label: "Depart Lowsail",
      description: "Leave before taking responsibility for the water order.",
      when: [{ type: "flag", flag: "water-released", value: false }],
      effects: [{ type: "addFact", fact: "lowsail-departed" }],
      outcome: {
        status: "departed",
        summary: "You depart Lowsail before the water is settled. The dry tanks wait behind you.",
      },
    },
    {
      id: "make-clinic-promise",
      scene: "clinic-yard",
      label: "Promise clean water, then go to Council Hall",
      description: "Take two silverleaf doses: one for the intake, one for the fever ward. Promise Ilyra the first clean water, then walk to Council Hall to hear Tovan's offer.",
      when: [{ type: "flag", flag: "clinic-promise", value: false }],
      effects: [
        { type: "setFlag", flag: "clinic-promise", value: true },
        { type: "adjustResource", resource: "medicine", delta: 2 },
        { type: "addFact", fact: "clinic-promise-made" },
        { type: "goTo", scene: "council-hall" },
      ],
    },
    {
      id: "skip-clinic-promise",
      scene: "clinic-yard",
      label: "Refuse the promise, then go to Council Hall",
      description: "Leave the clinic's medicine behind without an obligation to Ilyra, then walk to Council Hall to hear Tovan's offer.",
      when: [{ type: "flag", flag: "clinic-promise", value: false }],
      effects: [
        { type: "addFact", fact: "clinic-promise-declined" },
        { type: "goTo", scene: "council-hall" },
      ],
    },
    {
      id: "depart-clinic",
      scene: "clinic-yard",
      label: "Depart the clinic",
      description: "Leave Ilyra with dry jars and no promise.",
      effects: [{ type: "addFact", fact: "clinic-left" }],
      outcome: {
        status: "departed",
        summary: "You leave Ilyra's clinic without medicine or a water promise.",
      },
    },
    {
      id: "take-council-seal",
      scene: "council-hall",
      label: "Take the council seal",
      description: "Borrow Tovan's authority. The council will own the gate, and the debt will follow you.",
      when: [{ type: "flag", flag: "council-seal", value: false }],
      effects: [
        { type: "setFlag", flag: "council-seal", value: true },
        { type: "adjustResource", resource: "debt", delta: 1 },
        { type: "addFact", fact: "council-seal-carried" },
        { type: "goTo", scene: "workshop" },
      ],
    },
    {
      id: "refuse-council-control",
      scene: "council-hall",
      label: "Refuse council control",
      description: "Reject Tovan's claim and seek Nessa's repair instead.",
      when: [{ type: "flag", flag: "council-seal", value: false }],
      effects: [{ type: "addFact", fact: "council-offer-refused" }, { type: "goTo", scene: "workshop" }],
    },
    {
      id: "continue-with-council-seal", scene: "council-hall",
      label: "Return to Nessa with the seal",
      description: "Keep the authority you already borrowed and continue preparing.",
      when: [{ type: "flag", flag: "council-seal", value: true }],
      effects: [{ type: "goTo", scene: "workshop" }],
    },
    {
      id: "depart-council",
      scene: "council-hall",
      label: "Depart the council hall",
      description: "Leave Tovan's offer unanswered.",
      effects: [{ type: "addFact", fact: "council-left" }],
      outcome: {
        status: "departed",
        summary: "You leave the council hall. Tovan keeps the stolen order and its claim.",
      },
    },
    {
      id: "ask-clinic-before-leaving",
      scene: "workshop",
      label: "Check the clinic first",
      description: "Visit Ilyra before taking Nessa's tools. The detour costs no supplies.",
      when: [{ type: "flag", flag: "clinic-visit-made", value: false }],
      effects: [
        { type: "setFlag", flag: "clinic-visit-made", value: true },
        { type: "goTo", scene: "clinic-yard" },
      ],
    },
    {
      id: "borrow-repair-tools",
      scene: "workshop",
      label: "Borrow Nessa's repair kit",
      description: "Spend one supply and owe Nessa one mark for a repair kit. Keep one supply and a silverleaf dose for the shared repair.",
      when: [
        { type: "flag", flag: "repair-tools", value: false },
        { type: "resourceAtLeast", resource: "supplies", value: 1 },
      ],
      effects: [
        { type: "setFlag", flag: "repair-tools", value: true },
        { type: "setResource", resource: "tools", value: 1 },
        { type: "adjustResource", resource: "supplies", delta: -1 },
        { type: "adjustResource", resource: "debt", delta: 1 },
        { type: "addFact", fact: "nessa-tools-borrowed" },
        { type: "goTo", scene: "sluice-road" },
      ],
    },
    {
      id: "work-without-tools",
      scene: "workshop",
      label: "Work without tools",
      description: "Leave with bare hands. It adds risk and may close the flood tunnel behind you.",
      when: [{ type: "flag", flag: "repair-tools", value: false }],
      effects: [
        { type: "adjustResource", resource: "risk", delta: 1 },
        { type: "addFact", fact: "tools-skipped" },
        { type: "goTo", scene: "sluice-road" },
      ],
    },
    {
      id: "depart-workshop",
      scene: "workshop",
      label: "Depart the workshop",
      description: "Leave Nessa's tools and the failing gate behind.",
      effects: [{ type: "addFact", fact: "workshop-left" }],
      outcome: {
        status: "departed",
        summary: "You leave Nessa's workshop without taking a repair kit.",
      },
    },
    {
      id: "follow-canal",
      scene: "sluice-road",
      label: "Follow the canal",
      description: "Risk +1; supplies unchanged. Keep a supply for repair. If you later evacuate without scouts, spend one medicine dose to bring all eight families across, or leave one wounded family behind. That dose cannot go to the fever ward.",
      effects: [{ type: "adjustResource", resource: "risk", delta: 1 }, { type: "goTo", scene: "red-sluice-gate" }],
    },
    {
      id: "pay-scouts",
      scene: "sluice-road",
      label: "Pay the canal scouts",
      description: "Supplies -1; risk unchanged. If you later evacuate, all eight families can cross without medicine. With a borrowed kit, this spends the last supply required for repair.",
      when: [{ type: "resourceAtLeast", resource: "supplies", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "supplies", delta: -1 },
        { type: "setFlag", flag: "scouts-marked", value: true },
        { type: "addFact", fact: "scouts-paid" },
        { type: "goTo", scene: "red-sluice-gate" },
      ],
    },
    {
      id: "turn-back-road",
      scene: "sluice-road",
      label: "Turn back from the road",
      description: "Abandon the expedition before reaching the gate.",
      effects: [{ type: "addFact", fact: "road-abandoned" }],
      outcome: {
        status: "departed",
        summary: "You turn back from the canal road. Red Sluice keeps its failing gate.",
      },
    },
    {
      id: "read-stolen-order",
      scene: "red-sluice-gate",
      label: "Read the stolen order",
      description: "Use the maintenance marks on Nessa's copy to open the service hatch without damaging the gate.",
      when: [{ type: "flag", flag: "gate-read", value: false }],
      effects: [
        { type: "setFlag", flag: "gate-read", value: true },
        { type: "addFact", fact: "order-names-council" },
        { type: "goTo", scene: "sluice-chamber" },
      ],
    },
    {
      id: "force-sluice-gate",
      scene: "red-sluice-gate",
      label: "Force the sluice gate",
      description: "Break the lock and move fast. The rising tunnel will add risk.",
      when: [{ type: "flag", flag: "gate-forced", value: false }],
      effects: [
        { type: "setFlag", flag: "gate-forced", value: true },
        { type: "adjustResource", resource: "risk", delta: 1 },
        { type: "addFact", fact: "gate-forced" },
        { type: "goTo", scene: "sluice-chamber" },
      ],
    },
    {
      id: "leave-red-sluice",
      scene: "red-sluice-gate",
      label: "Leave Red Sluice",
      description: "Walk away from the gate and let the town face the flood alone.",
      effects: [{ type: "addFact", fact: "gate-abandoned" }],
      outcome: {
        status: "departed",
        summary: "You leave Red Sluice at the gate. Lowsail's dry tanks remain behind you.",
      },
    },
    {
      id: "repair-and-share-water",
      scene: "sluice-chamber",
      label: "Repair and share the flow",
      description: "Fit Nessa's kit and spend one supply plus one silverleaf dose to purge the intake. Send clean water to every street, with the clinic first.",
      when: [
        { type: "flag", flag: "repair-tools", value: true },
        { type: "flag", flag: "clinic-promise", value: true },
        { type: "resourceAtLeast", resource: "medicine", value: 1 },
        { type: "resourceAtLeast", resource: "tools", value: 1 },
        { type: "resourceAtLeast", resource: "supplies", value: 1 },
      ],
      effects: [
        { type: "adjustResource", resource: "supplies", delta: -1 },
        { type: "adjustResource", resource: "medicine", delta: -1 },
        { type: "adjustResource", resource: "tools", delta: -1 },
        { type: "setResource", resource: "water", value: 2 },
        { type: "setFlag", flag: "shared-water", value: true },
        { type: "addFact", fact: "shared-flow-repaired" },
        { type: "goTo", scene: "water-test" },
      ],
    },
    {
      id: "give-red-sluice-to-council",
      scene: "sluice-chamber",
      label: "Give Red Sluice to the council",
      description: "Use Tovan's seal. Water will flow, but the council will ration it and add another mark of debt.",
      when: [{ type: "flag", flag: "council-seal", value: true }],
      effects: [
        { type: "setResource", resource: "water", value: 1 },
        { type: "adjustResource", resource: "debt", delta: 1 },
        { type: "setFlag", flag: "council-control", value: true },
        { type: "addFact", fact: "council-flow-controlled" },
        { type: "goTo", scene: "water-test" },
      ],
    },
    {
      id: "open-evacuation-route",
      scene: "sluice-chamber",
      label: "Open the evacuation route",
      description: "Spend one supply to send families uphill. The market and its water will be left behind.",
      when: [{ type: "resourceAtLeast", resource: "supplies", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "supplies", delta: -1 },
        { type: "adjustResource", resource: "risk", delta: 1 },
        { type: "setResource", resource: "water", value: 0 },
        { type: "setFlag", flag: "evacuation-plan", value: true },
        { type: "addFact", fact: "evacuation-route-open" },
        { type: "goTo", scene: "water-test" },
      ],
    },
    {
      id: "brace-evacuation-landing", scene: "sluice-chamber",
      label: "Use the repair kit to brace an evacuation landing",
      description: "Sacrifice Nessa's kit instead of a supply to open the high-ground route. The town's water stays cut off, and your debt to Nessa remains.",
      when: [{ type: "resourceAtLeast", resource: "tools", value: 1 }],
      effects: [{ type: "adjustResource", resource: "tools", delta: -1 }, { type: "adjustResource", resource: "risk", delta: 1 }, { type: "setFlag", flag: "evacuation-plan", value: true }, { type: "addFact", fact: "kit-ferry-built" }, { type: "addFact", fact: "evacuation-route-open" }, { type: "goTo", scene: "water-test" }],
    },
    {
      id: "take-flooded-tunnel",
      scene: "sluice-chamber",
      label: "Take the flooded tunnel",
      description: "Enter the flooded tunnel. The current is too strong to survive; this choice will kill you.",
      when: [{ type: "resourceAtLeast", resource: "risk", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "risk", delta: 1 },
        { type: "addFact", fact: "lost-in-flood" },
      ],
      outcome: {
        status: "dead",
        summary: "The flooded tunnel takes you before the lever can be set. Lowsail loses its last chance to choose.",
      },
    },
    {
      id: "leave-chamber",
      scene: "sluice-chamber",
      label: "Leave the control chamber",
      description: "Abandon the lever and return with no resolution.",
      effects: [{ type: "addFact", fact: "chamber-abandoned" }],
      outcome: {
        status: "departed",
        summary: "You leave the flooded control chamber. Red Sluice stays unresolved.",
      },
    },
    {
      id: "release-shared-water",
      scene: "water-test",
      label: "Release shared water",
      description: "Send Nessa's repaired flow downstream to Lowsail's clinic and market.",
      when: [{ type: "flag", flag: "shared-water", value: true }],
      effects: [
        { type: "setFlag", flag: "water-released", value: true },
        { type: "addFact", fact: "shared-water-released" },
        { type: "goTo", scene: "lowsail-market" },
      ],
    },
    {
      id: "release-council-water",
      scene: "water-test",
      label: "Release council water",
      description: "Send the controlled flow downstream for Tovan's ration list.",
      when: [{ type: "flag", flag: "council-control", value: true }],
      effects: [
        { type: "setFlag", flag: "water-released", value: true },
        { type: "addFact", fact: "council-water-released" },
        { type: "goTo", scene: "lowsail-market" },
      ],
    },
    {
      id: "signal-evacuation",
      scene: "water-test",
      label: "Signal the evacuation",
      description: "Send the high-ground signal before the flood reaches the market.",
      when: [{ type: "flag", flag: "evacuation-plan", value: true }],
      effects: [
        { type: "setFlag", flag: "water-released", value: true },
        { type: "addFact", fact: "evacuation-signaled" },
        { type: "goTo", scene: "lowsail-market" },
      ],
    },
    {
      id: "abandon-water-test",
      scene: "water-test",
      label: "Abandon the water test",
      description: "Leave before the result reaches Lowsail.",
      effects: [{ type: "addFact", fact: "test-abandoned" }],
      outcome: {
        status: "departed",
        summary: "You abandon the water test. Lowsail never sees what the sluice could do.",
      },
    },
    {
      id: "bring-shared-water-to-clinic",
      scene: "lowsail-market",
      label: "Bring the shared water to Ilyra",
      description: "Keep the clinic promise and carry the first clean flow to Ilyra's patients.",
      when: [
        { type: "flag", flag: "shared-water", value: true },
        { type: "flag", flag: "water-released", value: true },
      ],
      effects: [{ type: "addFact", fact: "clinic-returned" }, { type: "goTo", scene: "clinic-followthrough" }],
    },
    {
      id: "report-council-rationing",
      scene: "lowsail-market",
      label: "Report the council rationing",
      description: "Return to Tovan and answer for water controlled in the council's name.",
      when: [
        { type: "flag", flag: "council-control", value: true },
        { type: "flag", flag: "water-released", value: true },
      ],
      effects: [{ type: "addFact", fact: "council-returned" }, { type: "goTo", scene: "council-followthrough" }],
    },
    {
      id: "organize-high-ground-evacuation",
      scene: "lowsail-market",
      label: "Organize the high-ground evacuation",
      description: "Return to Bram and move the families beyond the flood line.",
      when: [
        { type: "flag", flag: "evacuation-plan", value: true },
        { type: "flag", flag: "water-released", value: true },
      ],
      effects: [{ type: "addFact", fact: "evacuation-returned" }, { type: "goTo", scene: "evacuation-followthrough" }],
    },
    {
      id: "deliver-clinic-medicine",
      scene: "clinic-followthrough",
      label: "Deliver the clinic medicine",
      description: "Give Ilyra one medicine bundle and finish the promise you made in the yard.",
      when: [{ type: "resourceAtLeast", resource: "medicine", value: 1 }],
      effects: [
        { type: "adjustResource", resource: "medicine", delta: -1 },
        { type: "setFlag", flag: "clinic-aided", value: true },
        { type: "addFact", fact: "clinic-water-restored" },
      ],
      outcome: {
        status: "completed",
        summary: "Clean water reaches Ilyra Senn's clinic, and medicine reaches the fever ward. Lowsail keeps a shared flow.",
      },
    },
    {
      id: "leave-clinic-unfinished",
      scene: "clinic-followthrough",
      label: "Leave the clinic unfinished",
      description: "Depart with clean water running but keep the medicine for another day.",
      effects: [{ type: "addFact", fact: "clinic-unfinished" }],
      outcome: {
        status: "departed",
        summary: "You leave Ilyra's clinic with the water promise only partly kept.",
      },
    },
    {
      id: "win-clinic-exemption", scene: "council-followthrough",
      label: "Trade your remaining supplies for a clinic exemption",
      description: "Spend one supply and one medicine dose for Ilyra's patients. Tovan exempts the fever ward from rationing and forgives one mark; his control of the market remains.",
      when: [{ type: "flag", flag: "clinic-promise", value: true }, { type: "resourceAtLeast", resource: "supplies", value: 1 }, { type: "resourceAtLeast", resource: "medicine", value: 1 }, { type: "resourceAtLeast", resource: "debt", value: 1 }],
      effects: [{ type: "adjustResource", resource: "supplies", delta: -1 }, { type: "adjustResource", resource: "medicine", delta: -1 }, { type: "adjustResource", resource: "debt", delta: -1 }, { type: "addFact", fact: "clinic-exemption" }],
      outcome: { status: "completed", summary: "Ilyra treats the fever ward with an exemption from the ration rule. Tovan keeps the market's water under council control and records your reduced debt." },
    },
    {
      id: "sign-council-charter",
      scene: "council-followthrough",
      label: "Sign the council charter",
      description: "Accept the ration rule, add one mark of debt, and finish under Tovan's control.",
      effects: [
        { type: "adjustResource", resource: "debt", delta: 1 },
        { type: "setFlag", flag: "council-charter", value: true },
        { type: "addFact", fact: "council-charter-signed" },
      ],
      outcome: {
        status: "completed",
        summary: "Tovan Rusk records the council charter and your remaining debt. Water flows under ration; the fever ward must wait its turn.",
      },
    },
    {
      id: "leave-council-charter",
      scene: "council-followthrough",
      label: "Leave the charter unsigned",
      description: "Depart with council control in place but refuse to sign its final account.",
      effects: [{ type: "addFact", fact: "charter-declined" }],
      outcome: {
        status: "departed",
        summary: "You leave the council record unsigned. Its rationing still governs the water.",
      },
    },
    {
      id: "lead-evacuation",
      scene: "evacuation-followthrough",
      label: "Lead the families onward",
      description: "Use the scouts' marked crossing to guide all eight families to shelter before the road closes.",
      when: [{ type: "flag", flag: "scouts-marked", value: true }],
      effects: [
        { type: "setResource", resource: "evacuees", value: 8 },
        { type: "setFlag", flag: "evacuation-finished", value: true },
        { type: "addFact", fact: "market-evacuated" },
      ],
      outcome: {
        status: "completed",
        summary: "Bram Dorr moves eight families above the flood line. Lowsail loses its market but keeps its people.",
      },
    },
    {
      id: "lead-unmarked-evacuation", scene: "evacuation-followthrough",
      label: "Lead seven families across the washout",
      description: "Without scouts or treatment, seven families can cross. One wounded family will remain at the landing awaiting help.",
      when: [{ type: "flag", flag: "scouts-marked", value: false }],
      effects: [{ type: "setResource", resource: "evacuees", value: 7 }, { type: "setFlag", flag: "evacuation-finished", value: true }, { type: "addFact", fact: "unmarked-crossing" }],
      outcome: { status: "completed", summary: "Seven families reach shelter. One wounded family is left at the landing; Bram must find another boat. The market is lost." },
    },
    {
      id: "treat-evacuation-straggler", scene: "evacuation-followthrough",
      label: "Treat the wounded family and take everyone",
      description: "Spend one silverleaf dose to get all eight families across the unmarked washout. This medicine will not reach the fever ward.",
      when: [{ type: "flag", flag: "scouts-marked", value: false }, { type: "resourceAtLeast", resource: "medicine", value: 1 }],
      effects: [{ type: "adjustResource", resource: "medicine", delta: -1 }, { type: "setResource", resource: "evacuees", value: 8 }, { type: "setFlag", flag: "evacuation-finished", value: true }, { type: "addFact", fact: "stragglers-treated" }],
      outcome: { status: "completed", summary: "Silverleaf gets the wounded family moving. All eight families reach shelter with Bram, but the fever ward's promised dose went to the crossing. Lowsail's market is lost." },
    },
    {
      id: "stay-in-floodplain",
      scene: "evacuation-followthrough",
      label: "Stay in the floodplain",
      description: "Stay below the flood line while the boats leave. The surge will kill you.",
      effects: [
        { type: "adjustResource", resource: "risk", delta: 1 },
        { type: "addFact", fact: "market-stranded" },
      ],
      outcome: {
        status: "dead",
        summary: "You stay below the flood line. The surge reaches the market before the last boat returns.",
      },
    },
    {
      id: "depart-high-ground",
      scene: "evacuation-followthrough",
      label: "Depart the high ground",
      description: "Leave Bram with the families and the final move unfinished.",
      effects: [{ type: "addFact", fact: "high-ground-left" }],
      outcome: {
        status: "departed",
        summary: "You leave the high ground before the evacuation is complete.",
      },
    },
  ],
} as const satisfies ScenarioData;
