import type { Condition, Effect, Scenario } from "../engine/content.js";
import type { GameStatus } from "../engine/types.js";
import { PackedModel } from "./packed-model.js";

type FlagRecord = Readonly<Record<string, readonly string[]>>;
type MaskRecord = Readonly<Record<string, bigint>>;
type Scene = Scenario["scenes"][number];
type Choice = Scenario["choices"][number];

interface Location {
  readonly scene: string;
  readonly status: GameStatus;
  readonly ending: number;
}

function emptyRecord<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function unreachable(value: never): never {
  throw new Error(`Packed phase projection encountered unknown vocabulary ${JSON.stringify(value)}`);
}

function addConditionFlagReads(conditions: readonly Condition[] | undefined, target: Set<string>): void {
  for (const condition of conditions ?? []) {
    if (condition.type === "flag") target.add(condition.flag);
  }
}

function freezeFlagRecord(
  valuesByScene: ReadonlyMap<string, ReadonlySet<string>>,
  scenes: readonly string[],
): FlagRecord {
  const sceneSet = new Set(scenes);
  for (const scene of valuesByScene.keys()) {
    if (!sceneSet.has(scene)) throw new Error(`Packed phase projection contains unknown scene ${JSON.stringify(scene)}`);
  }

  const result = emptyRecord<readonly string[]>();
  for (const scene of scenes) {
    const values = valuesByScene.get(scene);
    if (values === undefined) throw new Error(`Packed phase projection is missing scene ${JSON.stringify(scene)}`);
    result[scene] = Object.freeze([...values].sort(compareIds));
  }
  return Object.freeze(result);
}

function buildMasks(
  flagsByScene: FlagRecord,
  scenes: readonly string[],
  flagIndexes: ReadonlyMap<string, number>,
  flagOffset: number,
  label: string,
): MaskRecord {
  const result = emptyRecord<bigint>();
  for (const scene of scenes) {
    let mask = 0n;
    for (const flag of flagsByScene[scene] ?? []) {
      const index = flagIndexes.get(flag);
      if (index === undefined) throw new Error(`Packed ${label} contains unknown flag ${JSON.stringify(flag)}`);
      mask |= 1n << BigInt(flagOffset + index);
    }
    result[scene] = mask;
  }
  return Object.freeze(result);
}

function assertCondition(
  condition: Condition,
  flags: ReadonlySet<string>,
  resources: ReadonlySet<string>,
): void {
  switch (condition.type) {
    case "flag":
      if (!flags.has(condition.flag)) {
        throw new Error(`Packed phase projection found unknown flag ${JSON.stringify(condition.flag)}`);
      }
      return;
    case "resourceAtLeast":
    case "resourceAtMost":
      if (!resources.has(condition.resource)) {
        throw new Error(`Packed phase projection found unknown resource ${JSON.stringify(condition.resource)}`);
      }
      return;
    default:
      return unreachable(condition);
  }
}

function assertEffect(
  effect: Effect,
  flags: ReadonlySet<string>,
  resources: ReadonlySet<string>,
  clocks: ReadonlySet<string>,
  scenes: ReadonlySet<string>,
): void {
  switch (effect.type) {
    case "setFlag":
      if (!flags.has(effect.flag)) {
        throw new Error(`Packed phase projection found unknown flag ${JSON.stringify(effect.flag)}`);
      }
      return;
    case "setResource":
    case "adjustResource":
      if (!resources.has(effect.resource)) {
        throw new Error(`Packed phase projection found unknown resource ${JSON.stringify(effect.resource)}`);
      }
      return;
    case "advanceClock":
      if (!clocks.has(effect.clock)) {
        throw new Error(`Packed phase projection found unknown clock ${JSON.stringify(effect.clock)}`);
      }
      return;
    case "goTo":
      if (!scenes.has(effect.scene)) {
        throw new Error(`Packed phase projection found unknown destination ${JSON.stringify(effect.scene)}`);
      }
      return;
    case "addFact":
      return;
    default:
      return unreachable(effect);
  }
}

function findMonotoneFlags(choices: readonly Choice[]): readonly string[] {
  const writes = new Map<string, Set<boolean>>();
  for (const choice of choices) {
    for (const effect of choice.effects) {
      if (effect.type !== "setFlag") continue;
      const values = writes.get(effect.flag);
      if (values === undefined) writes.set(effect.flag, new Set([effect.value]));
      else values.add(effect.value);
    }
  }
  return Object.freeze(
    [...writes]
      .filter(([, values]) => values.size > 0 && [...values].every((value) => value === true))
      .map(([flag]) => flag)
      .sort(compareIds),
  );
}

function staticSceneClosure(
  initialScene: string,
  choicesByScene: ReadonlyMap<string, readonly Choice[]>,
): ReadonlySet<string> {
  const reachable = new Set<string>([initialScene]);
  const pending = [initialScene];
  for (let index = 0; index < pending.length; index += 1) {
    const sceneId = pending[index]!;
    for (const choice of choicesByScene.get(sceneId) ?? []) {
      for (const effect of choice.effects) {
        if (effect.type !== "goTo" || reachable.has(effect.scene)) continue;
        reachable.add(effect.scene);
        pending.push(effect.scene);
      }
    }
  }
  return reachable;
}

function freezeMaskRecord(
  flagsByScene: FlagRecord,
  scenes: readonly string[],
  flagIndexes: ReadonlyMap<string, number>,
  flagOffset: number,
  label: string,
): MaskRecord {
  return buildMasks(flagsByScene, scenes, flagIndexes, flagOffset, label);
}

/**
 * State-local conservative flag projection for packed control-state keys.
 *
 * The full packed code remains the representative. This helper only clears
 * flags that cannot affect a future choice or conditional scene text from the
 * current phase. A choice is omitted from that closure only when a currently
 * true, globally true-only-written flag makes one of its false conditions
 * permanently impossible. For a pruned choice, every monotone false-gate in
 * its condition stays in the mask, including currently false siblings; this
 * declared stronger boundary makes successor masks monotone under handoff.
 * Resources, location, lifecycle and ending identity are always retained.
 * Facts, history, revisions and receipts remain outside this control proof.
 */
export class PackedPhaseProjection {
  readonly monotoneFlags: readonly string[];
  readonly prunedChoiceRetention: "all-monotone-false-gates" = "all-monotone-false-gates";
  readonly phaseFlagsByScene: FlagRecord;
  readonly terminalFlagsByScene: FlagRecord;

  private readonly model: PackedModel;
  private readonly scenesById: ReadonlyMap<string, Scene>;
  private readonly choicesByScene: ReadonlyMap<string, readonly Choice[]>;
  private readonly flagIndexes: ReadonlyMap<string, number>;
  private readonly flagBits: readonly bigint[];
  private readonly monotoneFlagSet: ReadonlySet<string>;
  private readonly phaseMasksByScene: MaskRecord;
  private readonly terminalMasksByScene: MaskRecord;
  private readonly lowMask: bigint;
  private readonly flagMask: bigint;
  private readonly retainedMasks = new Map<string, bigint>();

  constructor(model: PackedModel) {
    if (!(model instanceof PackedModel)) throw new Error("Expected a packed model");
    this.model = model;

    const scenario = model.scenario;
    const sceneSet = new Set(model.scenes);
    const resourceSet = new Set(model.resources);
    const flagSet = new Set(model.flags);
    const clockSet = new Set((scenario.clocks ?? []).map((clock) => clock.id));
    const scenesById = new Map<string, Scene>();
    for (const scene of scenario.scenes) {
      if (scenesById.has(scene.id)) throw new Error(`Packed phase projection found duplicate scene ${JSON.stringify(scene.id)}`);
      scenesById.set(scene.id, scene);
      for (const line of scene.text) {
        for (const condition of line.when ?? []) assertCondition(condition, flagSet, resourceSet);
      }
    }
    if (!scenesById.has(scenario.initialScene)) {
      throw new Error(`Packed phase projection found unknown initial scene ${JSON.stringify(scenario.initialScene)}`);
    }

    const choicesBySceneMutable = new Map<string, Choice[]>();
    const choiceIds = new Set<string>();
    for (const choice of scenario.choices) {
      if (choiceIds.has(choice.id)) throw new Error(`Packed phase projection found duplicate choice ${JSON.stringify(choice.id)}`);
      choiceIds.add(choice.id);
      if (!sceneSet.has(choice.scene)) {
        throw new Error(`Packed phase projection found choice in unknown scene ${JSON.stringify(choice.scene)}`);
      }
      for (const condition of choice.when ?? []) assertCondition(condition, flagSet, resourceSet);
      for (const effect of choice.effects) assertEffect(effect, flagSet, resourceSet, clockSet, sceneSet);
      const choices = choicesBySceneMutable.get(choice.scene);
      if (choices === undefined) choicesBySceneMutable.set(choice.scene, [choice]);
      else choices.push(choice);
    }
    this.scenesById = scenesById;
    this.choicesByScene = new Map(
      model.scenes.map((scene) => [scene, Object.freeze([...(choicesBySceneMutable.get(scene) ?? [])])] as const),
    );

    this.flagIndexes = new Map(model.flags.map((flag, index) => [flag, index] as const));
    const flagOffset = model.bitCount - model.flags.length;
    if (!Number.isSafeInteger(flagOffset) || flagOffset < 0) {
      throw new Error("Packed phase projection has an invalid flag offset");
    }
    this.flagBits = Object.freeze(model.flags.map((_, index) => 1n << BigInt(flagOffset + index)));
    this.lowMask = (1n << BigInt(flagOffset)) - 1n;
    this.flagMask = this.flagBits.reduce((mask, bit) => mask | bit, 0n);

    this.monotoneFlags = findMonotoneFlags(scenario.choices);
    this.monotoneFlagSet = new Set(this.monotoneFlags);

    const phaseFlagsSource = new Map<string, Set<string>>();
    const terminalFlagsSource = new Map<string, Set<string>>();
    for (const scene of model.scenes) {
      const phaseFlags = new Set<string>();
      for (const sceneId of staticSceneClosure(scene, this.choicesByScene)) {
        for (const choice of this.choicesByScene.get(sceneId) ?? []) {
          for (const condition of choice.when ?? []) {
            if (condition.type === "flag"
              && condition.value === false
              && this.monotoneFlagSet.has(condition.flag)) {
              phaseFlags.add(condition.flag);
            }
          }
        }
      }
      phaseFlagsSource.set(scene, phaseFlags);

      const terminalFlags = new Set<string>();
      const sceneData = scenesById.get(scene);
      if (sceneData === undefined) throw new Error(`Packed phase projection has no scene ${JSON.stringify(scene)}`);
      for (const line of sceneData.text) addConditionFlagReads(line.when, terminalFlags);
      terminalFlagsSource.set(scene, terminalFlags);
    }
    this.phaseFlagsByScene = freezeFlagRecord(phaseFlagsSource, model.scenes);
    this.terminalFlagsByScene = freezeFlagRecord(terminalFlagsSource, model.scenes);
    this.phaseMasksByScene = freezeMaskRecord(
      this.phaseFlagsByScene,
      model.scenes,
      this.flagIndexes,
      flagOffset,
      "phase flags",
    );
    this.terminalMasksByScene = freezeMaskRecord(
      this.terminalFlagsByScene,
      model.scenes,
      this.flagIndexes,
      flagOffset,
      "terminal flags",
    );

    Object.freeze(this);
  }

  private currentFlagIsTrue(code: bigint, flag: string): boolean {
    const index = this.flagIndexes.get(flag);
    if (index === undefined) throw new Error(`Packed phase projection found unknown flag ${JSON.stringify(flag)}`);
    return (code & this.flagBits[index]!) !== 0n;
  }

  private computePlayingMask(initialScene: string, code: bigint): bigint {
    const reachable = new Set<string>([initialScene]);
    const pending = [initialScene];
    const retained = new Set<string>();
    for (let index = 0; index < pending.length; index += 1) {
      const sceneId = pending[index]!;
      const scene = this.scenesById.get(sceneId);
      if (scene === undefined) throw new Error(`Packed phase projection encountered unknown scene ${JSON.stringify(sceneId)}`);
      for (const line of scene.text) addConditionFlagReads(line.when, retained);

      for (const choice of this.choicesByScene.get(sceneId) ?? []) {
        const pruningFlags: string[] = [];
        for (const condition of choice.when ?? []) {
          if (condition.type === "flag"
            && condition.value === false
            && this.monotoneFlagSet.has(condition.flag)
            && this.currentFlagIsTrue(code, condition.flag)) {
            pruningFlags.push(condition.flag);
          }
        }
        if (pruningFlags.length > 0) {
          // Keep every monotone false-gate on a pruned choice. A sibling that
          // is false now can be set true by the next legal choice, so keeping
          // only currently true justifiers would let the successor mask grow.
          for (const condition of choice.when ?? []) {
            if (condition.type === "flag"
              && condition.value === false
              && this.monotoneFlagSet.has(condition.flag)) {
              retained.add(condition.flag);
            }
          }
          continue;
        }

        addConditionFlagReads(choice.when, retained);
        for (const effect of choice.effects) {
          if (effect.type !== "goTo" || reachable.has(effect.scene)) continue;
          reachable.add(effect.scene);
          pending.push(effect.scene);
        }
      }
    }

    let mask = 0n;
    for (const flag of retained) {
      const index = this.flagIndexes.get(flag);
      if (index === undefined) throw new Error(`Packed phase projection contains unknown retained flag ${JSON.stringify(flag)}`);
      mask |= this.flagBits[index]!;
    }
    return mask;
  }

  private maskFor(code: bigint, location: Location): { readonly cacheKey: string; readonly mask: bigint } {
    if (location.status !== "playing") {
      const mask = this.terminalMasksByScene[location.scene];
      if (mask === undefined) throw new Error(`Packed phase projection has no terminal mask for ${JSON.stringify(location.scene)}`);
      return { cacheKey: `terminal\u0000${location.scene}`, mask };
    }

    const phaseMask = this.phaseMasksByScene[location.scene];
    if (phaseMask === undefined) throw new Error(`Packed phase projection has no phase mask for ${JSON.stringify(location.scene)}`);
    const phaseBits = code & phaseMask;
    const cacheKey = `playing\u0000${location.scene}\u0000${phaseBits.toString(16)}`;
    const cached = this.retainedMasks.get(cacheKey);
    if (cached !== undefined) return { cacheKey, mask: cached };
    const mask = this.computePlayingMask(location.scene, code);
    this.retainedMasks.set(cacheKey, mask);
    return { cacheKey, mask };
  }

  private resolve(code: bigint): { readonly location: Location; readonly cacheKey: string; readonly mask: bigint } {
    // location validates the complete code, including lifecycle, clock bounds,
    // resource fields and every high flag bit, before any masking occurs.
    const location = this.model.location(code);
    const resolved = this.maskFor(code, location);
    return { location, ...resolved };
  }

  /** Return absolute packed flag bits retained for this complete code. */
  retainedMask(code: bigint): bigint {
    return this.resolve(code).mask;
  }

  /** Return retained flag identifiers in the model's deterministic order. */
  retainedFlags(code: bigint): readonly string[] {
    const mask = this.resolve(code).mask;
    const flags: string[] = [];
    for (const [index, flag] of this.model.flags.entries()) {
      if ((mask & this.flagBits[index]!) !== 0n) flags.push(flag);
    }
    return Object.freeze(flags);
  }

  /** Clear only flags outside the state-local retained mask. */
  normalized(code: bigint): bigint {
    const resolved = this.resolve(code);
    return code & (this.lowMask | resolved.mask);
  }

  /** Include retained-mask identity as well as the normalized full code. */
  key(code: bigint): string {
    const resolved = this.resolve(code);
    const normalized = code & (this.lowMask | resolved.mask);
    return `${resolved.mask.toString(16)}:${normalized.toString(16)}`;
  }

  /** Verify that a successor never needs a flag absent from its predecessor mask. */
  assertHandoff(from: bigint, to: bigint): void {
    const fromResolved = this.resolve(from);
    const toResolved = this.resolve(to);
    const newlyNeeded = toResolved.mask & (this.flagMask ^ fromResolved.mask);
    if (newlyNeeded !== 0n) {
      throw new Error(
        `Packed phase projection successor retained mask is not a subset (from ${fromResolved.mask.toString(16)}, to ${toResolved.mask.toString(16)})`,
      );
    }
  }
}
