import { analyzeFutureReads } from "../../../src/engine/audit.js";
import { PackedModel } from "./packed-model.js";

type FlagRecord = Readonly<Record<string, readonly string[]>>;
type MaskRecord = Readonly<Record<string, bigint>>;

function emptyRecord<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

function freezeFlagRecord(
  source: ReadonlyMap<string, readonly string[]>,
  scenes: readonly string[],
  modelFlags: readonly string[],
  label: string,
): FlagRecord {
  const knownFlags = new Set(modelFlags);
  const sceneSet = new Set(scenes);
  for (const scene of source.keys()) {
    if (!sceneSet.has(scene)) throw new Error(`Packed ${label} contains unknown scene ${JSON.stringify(scene)}`);
  }

  const result = emptyRecord<readonly string[]>();
  for (const scene of scenes) {
    const flags = source.get(scene);
    if (flags === undefined) throw new Error(`Packed ${label} is missing scene ${JSON.stringify(scene)}`);
    const seen = new Set<string>();
    let previous: string | undefined;
    const copy: string[] = [];
    for (const flag of flags) {
      if (!knownFlags.has(flag)) throw new Error(`Packed ${label} contains unknown flag ${JSON.stringify(flag)}`);
      if (seen.has(flag)) throw new Error(`Packed ${label} repeats flag ${JSON.stringify(flag)}`);
      if (previous !== undefined && previous >= flag) {
        throw new Error(`Packed ${label} is not deterministically sorted for ${JSON.stringify(scene)}`);
      }
      seen.add(flag);
      previous = flag;
      copy.push(flag);
    }
    result[scene] = Object.freeze(copy);
  }
  return Object.freeze(result);
}

function buildMasks(
  flagsByScene: FlagRecord,
  scenes: readonly string[],
  modelFlags: readonly string[],
  flagOffset: number,
): MaskRecord {
  const indexes = new Map(modelFlags.map((flag, index) => [flag, index] as const));
  const result = emptyRecord<bigint>();
  for (const scene of scenes) {
    let mask = 0n;
    for (const flag of flagsByScene[scene] ?? []) {
      const index = indexes.get(flag);
      if (index === undefined) throw new Error(`Packed mask contains unknown flag ${JSON.stringify(flag)}`);
      mask |= 1n << BigInt(flagOffset + index);
    }
    result[scene] = mask;
  }
  return Object.freeze(result);
}

function assertSubset(
  subset: readonly string[],
  superset: ReadonlySet<string>,
  label: string,
): void {
  for (const flag of subset) {
    if (!superset.has(flag)) throw new Error(`Packed ${label} is not a subset: ${JSON.stringify(flag)}`);
  }
}

/**
 * A conservative, static control projection for packed graph interning.
 *
 * All resources and all model flag bits remain in PackedModel codes. This
 * class only supplies an opt-in normalized key: flags outside a scene's
 * static future read closure are cleared for control-state interning. Such
 * flags remain observable engine metadata through saves and state hashes.
 * The projection therefore proves control and conditional-text equivalence,
 * not full GameState or full-flag reachability.
 */
export class PackedControlProjection {
  readonly playingFlagsByScene: FlagRecord;
  readonly terminalFlagsByScene: FlagRecord;

  private readonly model: PackedModel;
  private readonly playingMasksByScene: MaskRecord;
  private readonly terminalMasksByScene: MaskRecord;
  private readonly lowMask: bigint;

  constructor(model: PackedModel) {
    if (!(model instanceof PackedModel)) throw new Error("Expected a packed model");
    this.model = model;

    // PackedModel.scenario is the model's validated, deeply frozen snapshot.
    const analysis = analyzeFutureReads(model.scenario);
    this.playingFlagsByScene = freezeFlagRecord(
      analysis.retainedFlagsByScene,
      model.scenes,
      model.flags,
      "playing flag closure",
    );
    this.terminalFlagsByScene = freezeFlagRecord(
      analysis.terminalTextFlagsByScene,
      model.scenes,
      model.flags,
      "terminal text flag closure",
    );

    const flagOffset = model.bitCount - model.flags.length;
    if (!Number.isSafeInteger(flagOffset) || flagOffset < 0) {
      throw new Error("Packed model has an invalid flag offset");
    }
    this.playingMasksByScene = buildMasks(this.playingFlagsByScene, model.scenes, model.flags, flagOffset);
    this.terminalMasksByScene = buildMasks(this.terminalFlagsByScene, model.scenes, model.flags, flagOffset);
    this.lowMask = (1n << BigInt(flagOffset)) - 1n;

    const playingSets = new Map(model.scenes.map((scene) => [scene, new Set(this.playingFlagsByScene[scene])] as const));
    for (const choice of model.scenario.choices) {
      const sourceFlags = playingSets.get(choice.scene);
      if (sourceFlags === undefined) throw new Error(`Packed playing closure has no source ${JSON.stringify(choice.scene)}`);
      for (const effect of choice.effects) {
        if (effect.type !== "goTo") continue;
        const destinationFlags = this.playingFlagsByScene[effect.scene];
        if (destinationFlags === undefined) throw new Error(`Packed playing closure has no destination ${JSON.stringify(effect.scene)}`);
        assertSubset(destinationFlags, sourceFlags, `playing successor ${JSON.stringify(choice.id)}`);
      }
      if (choice.outcome !== undefined) {
        const navigation = choice.effects.find(effect => effect.type === "goTo");
        const terminalScene = navigation?.type === "goTo" ? navigation.scene : choice.scene;
        const terminalFlags = this.terminalFlagsByScene[terminalScene];
        if (terminalFlags === undefined) throw new Error(`Packed terminal closure has no scene ${JSON.stringify(terminalScene)}`);
        assertSubset(terminalFlags, sourceFlags, `terminal successor ${JSON.stringify(choice.id)}`);
      }
    }

    Object.freeze(this);
  }

  /** Normalize a full code after validating every scene, lifecycle, resource and flag bit. */
  normalized(code: bigint): bigint {
    const location = this.model.location(code);
    const masks = location.status === "playing" ? this.playingMasksByScene : this.terminalMasksByScene;
    const retained = masks[location.scene];
    if (retained === undefined) throw new Error(`Packed projection has no mask for ${JSON.stringify(location.scene)}`);
    return code & (this.lowMask | retained);
  }

  /** Return a deterministic hexadecimal key for the normalized control code. */
  key(code: bigint): string {
    return this.normalized(code).toString(16);
  }
}
