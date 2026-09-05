/** The lifecycle state visible in an observation. */
export type GameStatus = "playing" | "completed" | "departed" | "dead";

/** The kinds of terminal receipts a finished run can carry. */
export type ReceiptKind = Exclude<GameStatus, "playing">;

/** A terminal witness returned with the final player projection. */
export interface Receipt {
  kind: ReceiptKind;
  summary: string;
  revision: number;
  stateHash: string;
}

/** A choice the engine has explicitly made available to the player. */
export interface ChoiceOption {
  id: string;
  label: string;
  description: string;
}

/** The only state sent to a player-facing adapter. */
export interface Observation {
  revision: number;
  sceneId: string;
  title: string;
  text: string[];
  facts: string[];
  resources: Record<string, number>;
  choices: ChoiceOption[];
  status: GameStatus;
  receipt?: Receipt;
}

/** One accepted action in a run's hidden replay history. */
export interface ActionRecord {
  readonly choiceId: string;
  readonly fromRevision: number;
  readonly toRevision: number;
}

/** Internal state. Adapters must use observe instead of exposing this object. */
export interface GameState {
  readonly version: 1;
  readonly buildId: string;
  readonly seed: number;
  readonly revision: number;
  readonly scene: string;
  readonly resources: Readonly<Record<string, number>>;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly knownFacts: readonly string[];
  readonly history: readonly ActionRecord[];
  readonly status: GameStatus;
  readonly receipt?: Receipt;
}

export interface ReplayAction {
  readonly choiceId: string;
  readonly expectedRevision: number;
}
