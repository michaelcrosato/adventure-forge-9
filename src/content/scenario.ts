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

/**
 * Stage 1 is deliberately small: one storm, one return scene, and a handful
 * of authored decisions whose consequences remain visible at the quay.
 */
export const RAW_SCENARIO = {
  version: 1,
  initialScene: "ferry-crisis",
  initialResources: {
    cargo: 3,
    debt: 0,
    risk: 0,
    survivors: 0,
  },
  initialFacts: ["storm-over-the-ferry"],
  scenes: [
    {
      id: "ferry-crisis",
      title: "The Split Tide",
      text: [
        {
          text: "A ferry has torn loose in the storm. Six people are trapped on its flooded deck. Three crates of fever medicine slide toward the rail.",
        },
        {
          text: "Families need the medicine at the clinic. The shore is close enough for one hard decision. You cannot save everything.",
        },
      ],
    },
    {
      id: "ferry-return",
      title: "The South Quay",
      text: [
        {
          text: "The rain thins at the south quay. Harbor master Mara Venn has seen what came back.",
        },
        {
          text: "Six survivors huddle under a sail, alive and shivering. Their families run down the quay. The cargo is gone.",
          when: [{ type: "flag", flag: "rescued-people", value: true }],
        },
        {
          text: "Three crates sit dry on the quay. Six people are missing. The saved medicine feels heavy.",
          when: [{ type: "flag", flag: "secured-cargo", value: true }],
        },
        {
          text: "Mara Venn waits for your account before the tide turns again.",
        },
      ],
    },
  ],
  choices: [
    {
      id: "rescue-people",
      scene: "ferry-crisis",
      label: "Cut the cargo loose",
      description: "Pull six people to shore. Three crates of fever medicine will be lost.",
      effects: [
        { type: "setFlag", flag: "rescued-people", value: true },
        { type: "setResource", resource: "cargo", value: 0 },
        { type: "setResource", resource: "survivors", value: 6 },
        { type: "addFact", fact: "survivors-safe" },
        { type: "addFact", fact: "cargo-lost" },
        { type: "goTo", scene: "ferry-return" },
      ],
    },
    {
      id: "secure-cargo",
      scene: "ferry-crisis",
      label: "Hold the medicine line",
      description: "Use Mara Venn's winch on credit to save three crates. Six people remain aboard; debt and risk follow you ashore.",
      effects: [
        { type: "setFlag", flag: "secured-cargo", value: true },
        { type: "setResource", resource: "survivors", value: 0 },
        { type: "adjustResource", resource: "debt", delta: 2 },
        { type: "adjustResource", resource: "risk", delta: 1 },
        { type: "addFact", fact: "cargo-secured" },
        { type: "addFact", fact: "debt-owed" },
        { type: "addFact", fact: "survivors-left-behind" },
        { type: "goTo", scene: "ferry-return" },
      ],
    },
    {
      id: "leave-ferry",
      scene: "ferry-crisis",
      label: "Leave the wreck behind",
      description: "Walk away from the ferry before choosing a side. The storm keeps whatever remains.",
      effects: [
        { type: "setFlag", flag: "ferry-abandoned", value: true },
        { type: "addFact", fact: "ferry-abandoned" },
      ],
      outcome: {
        status: "departed",
        summary: "You leave the wreck behind. The ferry bell fades into the storm.",
      },
    },
    {
      id: "finish-rescue",
      scene: "ferry-return",
      label: "Finish: stand with the survivors",
      description: "Stay for the families and accept that the medicine is gone.",
      when: [{ type: "flag", flag: "rescued-people", value: true }],
      effects: [{ type: "addFact", fact: "rescue-recorded" }],
      outcome: {
        status: "completed",
        summary: "The survivors reach their families. You finish the night with empty holds and a full count of lives saved.",
      },
    },
    {
      id: "finish-cargo",
      scene: "ferry-return",
      label: "Finish: account for the cargo",
      description: "Sign for the three crates and accept the winch debt and river risk.",
      when: [{ type: "flag", flag: "secured-cargo", value: true }],
      effects: [{ type: "addFact", fact: "cargo-recorded" }],
      outcome: {
        status: "completed",
        summary: "The crates are counted, but the harbor will remember the empty berths. You finish owing two marks and carrying the risk forward.",
      },
    },
    {
      id: "risk-the-rapids",
      scene: "ferry-return",
      label: "Run the manifest back into the flood",
      description: "Take the secured cargo upriver before the harbor master can stop you. The current is too strong to survive.",
      when: [
        { type: "flag", flag: "secured-cargo", value: true },
        { type: "resourceAtLeast", resource: "risk", value: 1 },
      ],
      effects: [
        { type: "adjustResource", resource: "risk", delta: 1 },
        { type: "addFact", fact: "lost-in-rapids" },
      ],
      outcome: {
        status: "dead",
        summary: "The flood takes the boat, the manifest, and you. The south quay keeps the only account that remains.",
      },
    },
    {
      id: "depart-harbor",
      scene: "ferry-return",
      label: "Depart the south quay",
      description: "Leave the harbor with the consequences of your choice behind you.",
      effects: [],
      outcome: {
        status: "departed",
        summary: "You depart the south quay while the harbor makes its own judgment.",
      },
    },
  ],
} as const satisfies ScenarioData;

/** Player-facing wording keeps internal fact identifiers out of projections. */
export const FACT_LABELS = {
  "storm-over-the-ferry": "A storm has broken the ferry loose.",
  "survivors-safe": "Six ferry passengers reached shore alive.",
  "cargo-lost": "Three crates of fever medicine were lost.",
  "cargo-secured": "Three crates of fever medicine reached the quay.",
  "debt-owed": "Two marks are owed for Mara Venn's winch.",
  "survivors-left-behind": "Six people were left aboard the ferry.",
  "ferry-abandoned": "The ferry was abandoned in the storm.",
  "rescue-recorded": "Mara Venn recorded the rescue.",
  "cargo-recorded": "Mara Venn recorded the cargo and its debt.",
  "lost-in-rapids": "The flood took the boat and its manifest.",
} as const satisfies Readonly<Record<string, string>>;
