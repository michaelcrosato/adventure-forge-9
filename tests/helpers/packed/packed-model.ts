import { validateScenario, type Condition, type Effect, type Scenario } from "../../../src/engine/content.js";
import type { GameState, GameStatus } from "../../../src/engine/types.js";

/**
 * An exact finite control state for the packed verifier.
 *
 * Facts, history, revisions, seeds, receipts and hashes are deliberately
 * outside this tuple.  The closed content vocabulary does not read facts or
 * history when deciding a choice; real engine replay remains responsible for
 * those metadata fields on authored witnesses.
 */
export interface PackedState {
  readonly scene: string;
  readonly status: GameStatus;
  readonly resources: Readonly<Record<string, number>>;
  readonly flags: Readonly<Record<string, boolean>>;
  /** Zero for playing; otherwise the one-based validated status/summary pair. */
  readonly ending: number;
}

/** A model-owned authored choice handle. */
export interface PackedChoice {
  readonly id: string;
  readonly scene: string;
  readonly terminal: boolean;
}

export type PackedTransition =
  | { readonly kind: "disabled" }
  | { readonly kind: "success"; readonly state: bigint }
  | {
      readonly kind: "fault";
      readonly reason: "arithmetic-error";
      readonly effectIndex: number;
      readonly resource: string;
    };

type TerminalStatus = Exclude<GameStatus, "playing">;

interface Ending {
  readonly status: TerminalStatus;
  readonly summary: string;
}

type PackedCondition =
  | { readonly type: "flag"; readonly flagIndex: number; readonly value: boolean }
  | { readonly type: "resourceAtLeast"; readonly resourceIndex: number; readonly value: number }
  | { readonly type: "resourceAtMost"; readonly resourceIndex: number; readonly value: number };

type PackedEffect =
  | { readonly type: "setFlag"; readonly flagIndex: number; readonly value: boolean; readonly effectIndex: number }
  | { readonly type: "setResource"; readonly resourceIndex: number; readonly value: number; readonly effectIndex: number }
  | { readonly type: "adjustResource"; readonly resourceIndex: number; readonly delta: number; readonly effectIndex: number }
  | {
      readonly type: "advanceClock";
      readonly resourceIndex: number;
      readonly maximum: number;
      readonly delta: number;
      readonly effectIndex: number;
    }
  | { readonly type: "addFact"; readonly effectIndex: number }
  | { readonly type: "goTo"; readonly sceneIndex: number; readonly effectIndex: number };

interface ChoiceProgram {
  readonly choice: PackedChoice;
  readonly sceneIndex: number;
  readonly conditions: readonly PackedCondition[];
  readonly effects: readonly PackedEffect[];
  readonly terminal: boolean;
  readonly outcomeStatus?: TerminalStatus;
  readonly ending: number;
}

interface ClockSpec {
  readonly resourceIndex: number;
  readonly maximum: number;
}

interface CodeLocation {
  readonly sceneIndex: number;
  readonly statusIndex: number;
  readonly ending: number;
}

const STATUSES: readonly GameStatus[] = ["playing", "completed", "departed", "dead"];
const RESOURCE_BITS = 53;
const DISABLED: PackedTransition = Object.freeze({ kind: "disabled" });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bitsForCardinality(cardinality: number): number {
  if (!Number.isSafeInteger(cardinality) || cardinality < 1) throw new Error("Packed model requires a non-empty field domain");
  let width = 1;
  let capacity = 2;
  while (capacity < cardinality) {
    width += 1;
    capacity *= 2;
  }
  return width;
}

function endingKey(status: TerminalStatus, summary: string): string {
  return JSON.stringify([status, summary]);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function statusIndex(status: GameStatus): number {
  const index = STATUSES.indexOf(status);
  if (index < 0) throw new Error(`Unknown packed status ${JSON.stringify(status)}`);
  return index;
}

function requireSafeNonNegative(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
  return value;
}

/**
 * Exact packed model for the validated closed scenario vocabulary.  Resource
 * fields use all non-negative safe integers, so this model does not introduce
 * guessed campaign bounds or a bound-exit transition kind.
 */
export class PackedModel {
  private readonly scenarioSnapshot: Scenario;
  private readonly sceneIds: readonly string[];
  private readonly resourceNames: readonly string[];
  private readonly flagNames: readonly string[];
  private readonly sceneIndexes: ReadonlyMap<string, number>;
  private readonly resourceIndexes: ReadonlyMap<string, number>;
  private readonly flagIndexes: ReadonlyMap<string, number>;
  private readonly endings: readonly Ending[];
  private readonly endingIndexes: ReadonlyMap<string, number>;
  private readonly clocksById: ReadonlyMap<string, ClockSpec>;
  private readonly clocksByResource: ReadonlyMap<number, ClockSpec>;
  private readonly choiceList: readonly PackedChoice[];
  private readonly choicesByScene: readonly (readonly PackedChoice[])[];
  private readonly programs: ReadonlyMap<PackedChoice, ChoiceProgram>;
  private readonly choiceMembership: ReadonlySet<PackedChoice>;
  private readonly sceneOffset: number;
  private readonly sceneWidth: number;
  private readonly statusOffset: number;
  private readonly statusWidth: number;
  private readonly endingOffset: number;
  private readonly endingWidth: number;
  private readonly sceneMask: bigint;
  private readonly statusMask: bigint;
  private readonly endingMask: bigint;
  private readonly resourceMask: bigint;
  private readonly resourceOffsets: readonly number[];
  private readonly flagOffset: number;
  private readonly codeLimit: bigint;

  readonly initial: bigint;
  readonly bitCount: number;

  constructor(input: unknown) {
    const scenario = validateScenario(input);
    this.scenarioSnapshot = scenario;

    this.sceneIds = Object.freeze(scenario.scenes.map(scene => scene.id));
    this.resourceNames = Object.freeze(Object.keys(scenario.initialResources).sort(compareIds));
    this.flagNames = Object.freeze(this.collectFlagNames(scenario));
    this.sceneIndexes = new Map(this.sceneIds.map((id, index) => [id, index] as const));
    this.resourceIndexes = new Map(this.resourceNames.map((id, index) => [id, index] as const));
    this.flagIndexes = new Map(this.flagNames.map((id, index) => [id, index] as const));

    const endings: Ending[] = [];
    const endingIndexes = new Map<string, number>();
    for (const choice of scenario.choices) {
      if (choice.outcome === undefined) continue;
      const pair: Ending = { status: choice.outcome.status, summary: choice.outcome.summary };
      const key = endingKey(pair.status, pair.summary);
      if (!endingIndexes.has(key)) {
        endings.push(Object.freeze(pair));
        endingIndexes.set(key, endings.length);
      }
    }
    this.endings = Object.freeze(endings);
    this.endingIndexes = endingIndexes;

    const clocksById = new Map<string, ClockSpec>();
    const clocksByResource = new Map<number, ClockSpec>();
    for (const clock of scenario.clocks ?? []) {
      const resourceIndex = this.resourceIndexes.get(clock.resource);
      if (resourceIndex === undefined) throw new Error(`Clock references unknown resource ${JSON.stringify(clock.resource)}`);
      const spec = Object.freeze({ resourceIndex, maximum: clock.max });
      clocksById.set(clock.id, spec);
      clocksByResource.set(resourceIndex, spec);
    }
    this.clocksById = clocksById;
    this.clocksByResource = clocksByResource;

    const sceneWidth = bitsForCardinality(this.sceneIds.length);
    const statusWidth = bitsForCardinality(STATUSES.length);
    this.sceneWidth = sceneWidth;
    this.statusWidth = statusWidth;
    this.endingWidth = bitsForCardinality(this.endings.length + 1);
    this.sceneMask = (1n << BigInt(sceneWidth)) - 1n;
    this.statusMask = (1n << BigInt(statusWidth)) - 1n;
    this.endingMask = (1n << BigInt(this.endingWidth)) - 1n;
    this.resourceMask = (1n << BigInt(RESOURCE_BITS)) - 1n;
    this.sceneOffset = 0;
    this.statusOffset = sceneWidth;
    this.endingOffset = sceneWidth + statusWidth;
    const resourceOffsets: number[] = [];
    let offset = this.endingOffset + this.endingWidth;
    for (let index = 0; index < this.resourceNames.length; index++) {
      resourceOffsets.push(offset);
      offset += RESOURCE_BITS;
    }
    this.resourceOffsets = Object.freeze(resourceOffsets);
    this.flagOffset = offset;
    this.bitCount = this.flagOffset + this.flagNames.length;
    this.codeLimit = 1n << BigInt(this.bitCount);

    const choices: PackedChoice[] = [];
    const choicesByScene: PackedChoice[][] = this.sceneIds.map(() => []);
    const programs = new Map<PackedChoice, ChoiceProgram>();
    for (const choice of scenario.choices) {
      const sceneIndex = this.sceneIndexes.get(choice.scene);
      if (sceneIndex === undefined) throw new Error(`Choice references unknown scene ${JSON.stringify(choice.scene)}`);
      const packedChoice: PackedChoice = Object.freeze({
        id: choice.id,
        scene: choice.scene,
        terminal: choice.outcome !== undefined,
      });
      const program: ChoiceProgram = Object.freeze({
        choice: packedChoice,
        sceneIndex,
        conditions: Object.freeze((choice.when ?? []).map(condition => this.compileCondition(condition))),
        effects: Object.freeze(choice.effects.map((effect, effectIndex) => this.compileEffect(effect, effectIndex))),
        terminal: choice.outcome !== undefined,
        ...(choice.outcome === undefined
          ? { ending: 0 }
          : {
              outcomeStatus: choice.outcome.status,
              ending: this.endingIndexes.get(endingKey(choice.outcome.status, choice.outcome.summary))!,
            }),
      });
      choices.push(packedChoice);
      choicesByScene[sceneIndex]!.push(packedChoice);
      programs.set(packedChoice, program);
    }
    this.choiceList = Object.freeze(choices);
    this.choicesByScene = Object.freeze(choicesByScene.map(sceneChoices => Object.freeze(sceneChoices)));
    this.programs = programs;
    this.choiceMembership = new Set(choices);

    this.initial = this.encode({
      scene: scenario.initialScene,
      status: "playing",
      ending: 0,
      resources: scenario.initialResources,
      flags: Object.fromEntries(this.flagNames.map(flag => [flag, false])),
    });
    Object.freeze(this);
  }

  /** The validated, deeply frozen input snapshot. */
  get scenario(): Scenario {
    return this.scenarioSnapshot;
  }

  get scenes(): readonly string[] {
    return this.sceneIds;
  }

  get resources(): readonly string[] {
    return this.resourceNames;
  }

  get flags(): readonly string[] {
    return this.flagNames;
  }

  get choices(): readonly PackedChoice[] {
    return this.choiceList;
  }

  private collectFlagNames(scenario: Scenario): string[] {
    const names = new Set<string>();
    const read = (conditions: readonly Condition[] | undefined): void => {
      for (const condition of conditions ?? []) if (condition.type === "flag") names.add(condition.flag);
    };
    for (const scene of scenario.scenes) for (const line of scene.text) read(line.when);
    for (const choice of scenario.choices) {
      read(choice.when);
      for (const effect of choice.effects) if (effect.type === "setFlag") names.add(effect.flag);
    }
    return [...names].sort(compareIds);
  }

  private compileCondition(condition: Condition): PackedCondition {
    if (condition.type === "flag") {
      const flagIndex = this.flagIndexes.get(condition.flag);
      if (flagIndex === undefined) throw new Error(`Unknown packed flag ${JSON.stringify(condition.flag)}`);
      return Object.freeze({ type: "flag", flagIndex, value: condition.value });
    }
    const resourceIndex = this.resourceIndexes.get(condition.resource);
    if (resourceIndex === undefined) throw new Error(`Unknown packed resource ${JSON.stringify(condition.resource)}`);
    return Object.freeze({ type: condition.type, resourceIndex, value: condition.value });
  }

  private compileEffect(effect: Effect, effectIndex: number): PackedEffect {
    switch (effect.type) {
      case "setFlag": {
        const flagIndex = this.flagIndexes.get(effect.flag);
        if (flagIndex === undefined) throw new Error(`Unknown packed flag ${JSON.stringify(effect.flag)}`);
        return Object.freeze({ type: effect.type, flagIndex, value: effect.value, effectIndex });
      }
      case "setResource": {
        const resourceIndex = this.resourceIndexes.get(effect.resource);
        if (resourceIndex === undefined) throw new Error(`Unknown packed resource ${JSON.stringify(effect.resource)}`);
        if (this.clocksByResource.has(resourceIndex)) {
          throw new Error(`Clock resource ${JSON.stringify(effect.resource)} cannot be written directly`);
        }
        return Object.freeze({ type: effect.type, resourceIndex, value: effect.value, effectIndex });
      }
      case "adjustResource": {
        const resourceIndex = this.resourceIndexes.get(effect.resource);
        if (resourceIndex === undefined) throw new Error(`Unknown packed resource ${JSON.stringify(effect.resource)}`);
        if (this.clocksByResource.has(resourceIndex)) {
          throw new Error(`Clock resource ${JSON.stringify(effect.resource)} cannot be adjusted directly`);
        }
        return Object.freeze({ type: effect.type, resourceIndex, delta: effect.delta, effectIndex });
      }
      case "advanceClock": {
        const clock = this.clocksById.get(effect.clock);
        if (clock === undefined) throw new Error(`Unknown packed clock ${JSON.stringify(effect.clock)}`);
        return Object.freeze({
          type: effect.type,
          resourceIndex: clock.resourceIndex,
          maximum: clock.maximum,
          delta: effect.delta,
          effectIndex,
        });
      }
      case "addFact":
        return Object.freeze({ type: effect.type, effectIndex });
      case "goTo": {
        const sceneIndex = this.sceneIndexes.get(effect.scene);
        if (sceneIndex === undefined) throw new Error(`Unknown packed destination ${JSON.stringify(effect.scene)}`);
        return Object.freeze({ type: effect.type, sceneIndex, effectIndex });
      }
      default:
        return this.unreachable(effect);
    }
  }

  private unreachable(value: never): never {
    throw new Error(`Unknown packed vocabulary ${JSON.stringify(value)}`);
  }

  private readBits(code: bigint, offset: number, width: number): number {
    const mask = (1n << BigInt(width)) - 1n;
    return Number((code >> BigInt(offset)) & mask);
  }

  private readMaskedBits(code: bigint, offset: number, mask: bigint): number {
    return Number((code >> BigInt(offset)) & mask);
  }

  private writeBits(code: bigint, offset: number, mask: bigint, value: number): bigint {
    const shift = BigInt(offset);
    const shiftedMask = mask << shift;
    return (code & ~shiftedMask) | (BigInt(value) << shift);
  }

  private assertLifecycle(statusValue: number, ending: number): void {
    const status = STATUSES[statusValue];
    if (status === undefined) throw new Error("Packed code contains an invalid status");
    if (status === "playing") {
      if (ending !== 0) throw new Error("Packed playing state must not have an ending");
      return;
    }
    if (ending < 1 || ending > this.endings.length) throw new Error("Packed terminal state contains an invalid ending");
    if (this.endings[ending - 1]!.status !== status) {
      throw new Error("Packed terminal status does not match its ending");
    }
  }

  private readLocation(code: unknown): CodeLocation {
    if (typeof code !== "bigint" || code < 0n) throw new Error("Packed code must be a non-negative bigint");
    if (code >= this.codeLimit) throw new Error("Packed code contains bits outside the model width");
    const sceneIndex = this.readMaskedBits(code, this.sceneOffset, this.sceneMask);
    const statusValue = this.readMaskedBits(code, this.statusOffset, this.statusMask);
    const ending = this.readMaskedBits(code, this.endingOffset, this.endingMask);
    if (this.sceneIds[sceneIndex] === undefined) throw new Error("Packed code contains an invalid scene");
    this.assertLifecycle(statusValue, ending);
    for (const [resourceIndex, clock] of this.clocksByResource.entries()) {
      if (this.readMaskedBits(code, this.resourceOffsets[resourceIndex]!, this.resourceMask) > clock.maximum) {
        throw new Error(`Packed code exceeds clock maximum for ${JSON.stringify(this.resourceNames[resourceIndex])}`);
      }
    }
    return { sceneIndex, statusIndex: statusValue, ending };
  }

  private assertMap(value: unknown, label: string): asserts value is Record<string, unknown> {
    if (!isRecord(value)) throw new Error(`${label} must be an object`);
  }

  /** Encode an exact state using the fixed scene/status/ending/resource/flag layout. */
  encode(state: PackedState): bigint {
    if (!isRecord(state)) throw new Error("Packed state must be an object");
    // Snapshot getter-backed inputs exactly once before validating or packing.
    const scene = state.scene, status = state.status, endingInput = state.ending;
    const resources = state.resources, flags = state.flags;
    const sceneIndex = this.sceneIndexes.get(scene);
    if (sceneIndex === undefined) throw new Error(`Unknown packed scene ${JSON.stringify(scene)}`);
    const statusValue = statusIndex(status);
    const ending = requireSafeNonNegative(endingInput, "Packed ending");
    this.assertLifecycle(statusValue, ending);
    this.assertMap(resources, "Packed resources");
    this.assertMap(flags, "Packed flags");
    for (const name of Object.keys(resources)) {
      if (!this.resourceIndexes.has(name)) throw new Error(`Unknown packed resource ${JSON.stringify(name)}`);
    }
    for (const name of Object.keys(flags)) {
      if (!this.flagIndexes.has(name)) throw new Error(`Unknown packed flag ${JSON.stringify(name)}`);
    }

    let code = BigInt(sceneIndex) << BigInt(this.sceneOffset);
    code |= BigInt(statusValue) << BigInt(this.statusOffset);
    code |= BigInt(ending) << BigInt(this.endingOffset);
    for (const [index, name] of this.resourceNames.entries()) {
      if (!Object.hasOwn(resources, name)) throw new Error(`Missing packed resource ${JSON.stringify(name)}`);
      const value = requireSafeNonNegative(resources[name], `Packed resource ${name}`);
      const clock = this.clocksByResource.get(index);
      if (clock !== undefined && value > clock.maximum) {
        throw new Error(`Packed resource ${JSON.stringify(name)} exceeds clock maximum ${clock.maximum}`);
      }
      code |= BigInt(value) << BigInt(this.resourceOffsets[index]!);
    }
    for (const [index, name] of this.flagNames.entries()) {
      const value = Object.hasOwn(flags, name) ? requireBoolean(flags[name], `Packed flag ${name}`) : false;
      if (value) code |= 1n << BigInt(this.flagOffset + index);
    }
    return code;
  }

  /** Return only location/lifecycle data after validating the complete packed code. */
  location(code: bigint): Readonly<{ scene: string; status: GameStatus; ending: number }> {
    const location = this.readLocation(code);
    return Object.freeze({
      scene: this.sceneIds[location.sceneIndex]!,
      status: STATUSES[location.statusIndex]!,
      ending: location.ending,
    });
  }

  /** Decode a validated packed code into the standalone state shape. */
  decode(code: bigint): PackedState {
    const location = this.readLocation(code);
    const resources: Record<string, number> = {};
    for (const [index, name] of this.resourceNames.entries()) {
      resources[name] = this.readMaskedBits(code, this.resourceOffsets[index]!, this.resourceMask);
    }
    const flags: Record<string, boolean> = {};
    for (const [index, name] of this.flagNames.entries()) {
      flags[name] = this.readBits(code, this.flagOffset + index, 1) === 1;
    }
    return Object.freeze({
      scene: this.sceneIds[location.sceneIndex]!,
      status: STATUSES[location.statusIndex]!,
      ending: location.ending,
      resources: Object.freeze(resources),
      flags: Object.freeze(flags),
    });
  }

  /** Project an actual engine state while normalizing absent known flags to false. */
  project(state: GameState): PackedState {
    const scene = state.scene, status = state.status, receipt = state.receipt;
    const resources = state.resources, flags = state.flags;
    let ending = 0;
    if (status === "playing") {
      if (receipt !== undefined) throw new Error("Playing engine state cannot have a receipt");
    } else {
      const kind = receipt?.kind, summary = receipt?.summary;
      if (receipt === undefined || kind === undefined || summary === undefined || kind !== status) {
        throw new Error("Terminal engine state has no matching receipt");
      }
      const index = this.endingIndexes.get(endingKey(kind, summary));
      if (index === undefined) throw new Error("Engine receipt is not a modeled ending");
      ending = index;
    }
    return this.decode(this.encode({ scene, status, ending, resources, flags }));
  }

  /** Return every authored choice at a playing scene; terminal states have no choices. */
  choicesAt(code: bigint): readonly PackedChoice[] {
    const location = this.readLocation(code);
    if (location.statusIndex !== 0) return Object.freeze([]);
    return this.choicesByScene[location.sceneIndex]!;
  }

  /** Apply one model-owned choice, preserving guard and effect order exactly. */
  transition(code: bigint, choice: PackedChoice): PackedTransition {
    const program = this.programs.get(choice);
    if (program === undefined || !this.choiceMembership.has(choice)) {
      throw new Error("Packed choice belongs to a different model");
    }
    const location = this.readLocation(code);
    if (location.statusIndex !== 0 || location.sceneIndex !== program.sceneIndex) return DISABLED;
    for (const condition of program.conditions) {
      const matches = condition.type === "flag"
        ? this.readMaskedBits(code, this.flagOffset + condition.flagIndex, 1n) === (condition.value ? 1 : 0)
        : condition.type === "resourceAtLeast"
          ? this.readMaskedBits(code, this.resourceOffsets[condition.resourceIndex]!, this.resourceMask) >= condition.value
          : this.readMaskedBits(code, this.resourceOffsets[condition.resourceIndex]!, this.resourceMask) <= condition.value;
      if (!matches) return DISABLED;
    }

    let nextCode = code;
    for (const effect of program.effects) {
      switch (effect.type) {
        case "setFlag":
          nextCode = this.writeBits(
            nextCode,
            this.flagOffset + effect.flagIndex,
            1n,
            effect.value ? 1 : 0,
          );
          break;
        case "setResource":
          nextCode = this.writeBits(
            nextCode,
            this.resourceOffsets[effect.resourceIndex]!,
            this.resourceMask,
            effect.value,
          );
          break;
        case "adjustResource": {
          const currentValue = this.readMaskedBits(nextCode, this.resourceOffsets[effect.resourceIndex]!, this.resourceMask);
          const result = currentValue + effect.delta;
          if (!Number.isSafeInteger(result) || result < 0) {
            return Object.freeze({
              kind: "fault",
              reason: "arithmetic-error",
              effectIndex: effect.effectIndex,
              resource: this.resourceNames[effect.resourceIndex]!,
            });
          }
          nextCode = this.writeBits(nextCode, this.resourceOffsets[effect.resourceIndex]!, this.resourceMask, result);
          break;
        }
        case "advanceClock": {
          const currentValue = this.readMaskedBits(nextCode, this.resourceOffsets[effect.resourceIndex]!, this.resourceMask);
          if (!Number.isSafeInteger(currentValue) || currentValue < 0 || currentValue > effect.maximum) {
            return Object.freeze({
              kind: "fault",
              reason: "arithmetic-error",
              effectIndex: effect.effectIndex,
              resource: this.resourceNames[effect.resourceIndex]!,
            });
          }
          const result = effect.delta >= effect.maximum - currentValue
            ? effect.maximum
            : currentValue + effect.delta;
          if (!Number.isSafeInteger(result) || result < 0) {
            return Object.freeze({
              kind: "fault",
              reason: "arithmetic-error",
              effectIndex: effect.effectIndex,
              resource: this.resourceNames[effect.resourceIndex]!,
            });
          }
          nextCode = this.writeBits(nextCode, this.resourceOffsets[effect.resourceIndex]!, this.resourceMask, result);
          break;
        }
        case "addFact":
          break;
        case "goTo":
          nextCode = this.writeBits(nextCode, this.sceneOffset, this.sceneMask, effect.sceneIndex);
          break;
        default:
          return this.unreachable(effect);
      }
    }

    if (program.terminal) {
      const nextStatus = program.outcomeStatus;
      if (nextStatus === undefined) throw new Error("Terminal packed choice has no outcome status");
      nextCode = this.writeBits(nextCode, this.statusOffset, this.statusMask, statusIndex(nextStatus));
      nextCode = this.writeBits(nextCode, this.endingOffset, this.endingMask, program.ending);
    }
    return Object.freeze({ kind: "success", state: nextCode });
  }
}
