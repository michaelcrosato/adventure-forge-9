import { validateScenario, type Choice, type Condition, type Scenario } from "../engine/content.js";
import type { GameState, GameStatus } from "../engine/types.js";
import { Bdd } from "./bdd.js";

/** Experimental exact finite model. This module does not replace the release audit. */
export interface SemanticState {
  readonly scene: string;
  readonly status: GameStatus;
  readonly resources: Readonly<Record<string, number>>;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly ending: number;
}

interface Field {
  readonly id: string;
  readonly maximum: number;
  readonly current: readonly number[];
  readonly next: readonly number[];
}

export interface SymbolicChoice {
  readonly id: string;
  readonly enabled: number;
  readonly relation: number;
  readonly arithmeticError: number;
  readonly boundExit: number;
  readonly terminal: boolean;
}

export interface SymbolicOptions {
  readonly order?: "interleaved" | "blocked";
  readonly nodeLimit?: number;
  readonly cacheLimit?: number;
  /** Unary effect tables are deliberately limited in this first experiment. */
  readonly maxDomain?: number;
}

const STATUSES: readonly GameStatus[] = ["playing", "completed", "departed", "dead"];

function flagNames(scenario: Scenario): string[] {
  const names = new Set<string>();
  const read = (conditions: readonly Condition[] | undefined) => {
    for (const condition of conditions ?? []) if (condition.type === "flag") names.add(condition.flag);
  };
  for (const scene of scenario.scenes) for (const line of scene.text) read(line.when);
  for (const choice of scenario.choices) {
    read(choice.when);
    for (const effect of choice.effects) if (effect.type === "setFlag") names.add(effect.flag);
  }
  return [...names].sort();
}

/** A failure contains an authored action path, never a fabricated GameState. */
export class SymbolicTransitionError extends Error {
  constructor(
    readonly reason: "arithmetic-error" | "bound-exit",
    readonly choiceId: string,
    readonly path: readonly string[],
  ) {
    super(`Symbolic ${reason} is reachable through ${choiceId}`);
    this.name = "SymbolicTransitionError";
  }
}

export class SymbolicModel {
  readonly scenario: Scenario;
  readonly bdd: Bdd;
  readonly initial: number;
  readonly validDomain: number;
  readonly playing: number;
  readonly completed: number;
  readonly choices: readonly SymbolicChoice[];
  readonly currentVariables: readonly number[];
  readonly nextVariables: readonly number[];
  readonly flags: readonly string[];
  readonly resources: readonly string[];
  private readonly fields = new Map<string, Field>();
  private readonly scenes: readonly string[];
  private readonly endings: readonly (readonly [GameStatus, string])[];
  private readonly toCurrent: ReadonlyMap<number, number>;
  private readonly toNext: ReadonlyMap<number, number>;
  private readonly variableCount: number;

  constructor(input: unknown, bounds: Readonly<Record<string, number>>, options: SymbolicOptions = {}) {
    this.scenario = validateScenario(input);
    this.scenes = Object.freeze(this.scenario.scenes.map(scene => scene.id));
    this.flags = Object.freeze(flagNames(this.scenario));
    this.resources = Object.freeze(Object.keys(this.scenario.initialResources).sort());
    const endings: [GameStatus, string][] = [];
    for (const choice of this.scenario.choices) if (choice.outcome !== undefined) {
      const pair: [GameStatus, string] = [choice.outcome.status, choice.outcome.summary];
      if (!endings.some(([status, summary]) => status === pair[0] && summary === pair[1])) endings.push(pair);
    }
    this.endings = Object.freeze(endings.map(pair => Object.freeze(pair)));
    const maxDomain = options.maxDomain ?? 256;
    if (!Number.isSafeInteger(maxDomain) || maxDomain < 1 || maxDomain > 4096) {
      throw new Error("Unsupported symbolic unary-table domain limit");
    }
    if (Object.keys(bounds).length !== this.resources.length
      || Object.keys(bounds).some(name => !this.resources.includes(name))) {
      throw new Error("Symbolic bounds must specify exactly the declared resources");
    }
    const specs: { id: string; maximum: number }[] = [
      { id: "scene", maximum: this.scenes.length - 1 },
      { id: "status", maximum: STATUSES.length - 1 },
      { id: "ending", maximum: this.endings.length },
    ];
    for (const name of this.resources) {
      const bound = Object.hasOwn(bounds, name) ? bounds[name] : undefined;
      if (bound === undefined || !Number.isSafeInteger(bound) || bound < 0 || bound >= maxDomain) {
        throw new Error(`Unsupported symbolic bound for ${name}`);
      }
      if (this.scenario.initialResources[name]! > bound) throw new Error(`Initial ${name} exceeds symbolic bound`);
      const clock = this.scenario.clocks?.find(clock => clock.resource === name);
      if (clock !== undefined && clock.max !== bound) throw new Error(`Clock ${name} must use its declared maximum`);
      specs.push({ id: `resource:${name}`, maximum: bound });
    }
    for (const name of this.flags) specs.push({ id: `flag:${name}`, maximum: 1 });
    const width = (maximum: number) => Math.max(1, Math.ceil(Math.log2(maximum + 1)));
    const bitCount = specs.reduce((count, spec) => count + width(spec.maximum), 0);
    const order = options.order ?? "interleaved";
    if (order !== "interleaved" && order !== "blocked") throw new Error("Unknown symbolic variable order");
    this.variableCount = bitCount * 2;
    this.bdd = new Bdd(this.variableCount, { nodeLimit: options.nodeLimit ?? 250_000, cacheLimit: options.cacheLimit ?? 100_000 });
    const currentVariables: number[] = [], nextVariables: number[] = [];
    let offset = 0;
    for (const spec of specs) {
      const current: number[] = [], next: number[] = [];
      for (let bit = 0; bit < width(spec.maximum); bit++) {
        const index = offset++;
        current.push(order === "interleaved" ? index * 2 : index);
        next.push(order === "interleaved" ? index * 2 + 1 : bitCount + index);
      }
      currentVariables.push(...current); nextVariables.push(...next);
      this.fields.set(spec.id, Object.freeze({ ...spec, current: Object.freeze(current), next: Object.freeze(next) }));
    }
    this.currentVariables = Object.freeze(currentVariables);
    this.nextVariables = Object.freeze(nextVariables);
    this.toCurrent = new Map(nextVariables.map((variable, index) => [variable, currentVariables[index]!]));
    this.toNext = new Map(currentVariables.map((variable, index) => [variable, nextVariables[index]!]));
    let domain = 1;
    for (const field of this.fields.values()) {
      let values = 0;
      for (let value = 0; value <= field.maximum; value++) values = this.bdd.or(values, this.equal(field.id, value));
      domain = this.bdd.and(domain, values);
    }
    let lifecycle = this.bdd.and(this.equal("status", 0), this.equal("ending", 0));
    for (const [index, [status]] of this.endings.entries()) {
      lifecycle = this.bdd.or(lifecycle, this.bdd.and(this.equal("status", STATUSES.indexOf(status)), this.equal("ending", index + 1)));
    }
    this.validDomain = this.bdd.and(domain, lifecycle);
    this.playing = this.bdd.and(this.validDomain, this.equal("status", 0));
    this.completed = this.bdd.and(this.validDomain, this.equal("status", 1));
    this.initial = this.encode({
      scene: this.scenario.initialScene, status: "playing", ending: 0,
      resources: this.scenario.initialResources,
      flags: Object.fromEntries(this.flags.map(flag => [flag, false])),
    });
    this.choices = Object.freeze(this.scenario.choices.map(choice => this.compileChoice(choice)));
  }

  private field(id: string): Field {
    const field = this.fields.get(id);
    if (field === undefined) throw new Error(`Unknown symbolic field ${id}`);
    return field;
  }

  private equal(id: string, value: number, phase: "current" | "next" = "current"): number {
    const field = this.field(id);
    if (!Number.isSafeInteger(value) || value < 0 || value > field.maximum) throw new Error(`Invalid symbolic ${id} value`);
    let result = 1;
    for (const [bit, variable] of field[phase].entries()) {
      const literal = this.bdd.variable(variable);
      result = this.bdd.and(result, Math.floor(value / 2 ** bit) % 2 === 1 ? literal : this.bdd.not(literal));
    }
    return result;
  }

  private unchanged(id: string): number {
    const field = this.field(id);
    let result = 1;
    for (const [bit, variable] of field.current.entries()) {
      result = this.bdd.and(result, this.bdd.not(this.bdd.xor(this.bdd.variable(variable), this.bdd.variable(field.next[bit]!))));
    }
    return result;
  }

  private condition(condition: Condition): number {
    if (condition.type === "flag") return this.equal(`flag:${condition.flag}`, condition.value ? 1 : 0);
    const field = this.field(`resource:${condition.resource}`);
    let result = 0;
    for (let value = 0; value <= field.maximum; value++) {
      const matches = condition.type === "resourceAtLeast" ? value >= condition.value : value <= condition.value;
      if (matches) result = this.bdd.or(result, this.equal(field.id, value));
    }
    return result;
  }

  private compileChoice(choice: Choice): SymbolicChoice {
    let enabled = this.bdd.and(this.playing, this.equal("scene", this.scenes.indexOf(choice.scene)));
    for (const condition of choice.when ?? []) enabled = this.bdd.and(enabled, this.condition(condition));
    const flagWrites = new Map<string, boolean>();
    let destination = choice.scene;
    for (const effect of choice.effects) {
      if (effect.type === "goTo") destination = effect.scene;
      else if (effect.type === "setFlag") flagWrites.set(effect.flag, effect.value);
    }
    let relation = enabled;
    relation = this.bdd.and(relation, this.equal("scene", this.scenes.indexOf(destination), "next"));
    const status = choice.outcome?.status ?? "playing";
    const ending = choice.outcome === undefined ? 0
      : this.endings.findIndex(([kind, summary]) => kind === status && summary === choice.outcome!.summary) + 1;
    relation = this.bdd.and(relation, this.equal("status", STATUSES.indexOf(status), "next"));
    relation = this.bdd.and(relation, this.equal("ending", ending, "next"));
    for (const flag of this.flags) {
      relation = this.bdd.and(relation, flagWrites.has(flag)
        ? this.equal(`flag:${flag}`, flagWrites.get(flag) ? 1 : 0, "next") : this.unchanged(`flag:${flag}`));
    }
    const effectFailures = choice.effects.map(() => ({ arithmetic: 0, bound: 0 }));
    for (const resource of this.resources) {
      const field = this.field(`resource:${resource}`);
      const effects = [...choice.effects.entries()].filter(([, effect]) =>
        ((effect.type === "setResource" || effect.type === "adjustResource") && effect.resource === resource)
        || (effect.type === "advanceClock" && this.scenario.clocks?.find(clock => clock.id === effect.clock)?.resource === resource));
      if (effects.length === 0) { relation = this.bdd.and(relation, this.unchanged(field.id)); continue; }
      let resourceRelation = 0;
      for (let input = 0; input <= field.maximum; input++) {
        let output = input;
        let failure: "arithmetic-error" | "bound-exit" | undefined;
        let failureIndex = -1;
        for (const [index, effect] of effects) {
          if (effect.type === "setResource") output = effect.value;
          else if (effect.type === "adjustResource") output += effect.delta;
          else if (effect.type === "advanceClock") {
            const clock = this.scenario.clocks!.find(clock => clock.id === effect.clock)!;
            output = effect.delta >= clock.max - output ? clock.max : output + effect.delta;
          }
          if (!Number.isSafeInteger(output) || output < 0) { failure = "arithmetic-error"; failureIndex = index; break; }
          if (output > field.maximum) { failure = "bound-exit"; failureIndex = index; break; }
        }
        const source = this.equal(field.id, input);
        if (failure === "arithmetic-error") effectFailures[failureIndex]!.arithmetic = this.bdd.or(effectFailures[failureIndex]!.arithmetic, source);
        else if (failure === "bound-exit") effectFailures[failureIndex]!.bound = this.bdd.or(effectFailures[failureIndex]!.bound, source);
        else resourceRelation = this.bdd.or(resourceRelation, this.bdd.and(source, this.equal(field.id, output, "next")));
      }
      relation = this.bdd.and(relation, resourceRelation);
    }
    // Resource folds commute on successful transitions, but fault diagnostics
    // must retain the original cross-resource effect order.
    let arithmeticError = 0, boundExit = 0, beforeFailure = enabled;
    for (const failure of effectFailures) {
      arithmeticError = this.bdd.or(arithmeticError, this.bdd.and(beforeFailure, failure.arithmetic));
      boundExit = this.bdd.or(boundExit, this.bdd.and(beforeFailure, failure.bound));
      beforeFailure = this.bdd.and(beforeFailure, this.bdd.not(this.bdd.or(failure.arithmetic, failure.bound)));
    }
    return Object.freeze({ id: choice.id, enabled, relation,
      arithmeticError: this.bdd.and(enabled, arithmeticError),
      boundExit: this.bdd.and(enabled, boundExit), terminal: choice.outcome !== undefined });
  }

  encode(state: SemanticState): number {
    let result = this.bdd.and(this.equal("scene", this.scenes.indexOf(state.scene)), this.equal("status", STATUSES.indexOf(state.status)));
    result = this.bdd.and(result, this.equal("ending", state.ending));
    for (const resource of this.resources) {
      if (!Object.hasOwn(state.resources, resource)) throw new Error(`Missing modeled resource ${resource}`);
      result = this.bdd.and(result, this.equal(`resource:${resource}`, state.resources[resource]!));
    }
    for (const flag of this.flags) {
      const value = Object.hasOwn(state.flags, flag) ? state.flags[flag] : false;
      if (typeof value !== "boolean") throw new Error(`Invalid modeled flag ${flag}`);
      result = this.bdd.and(result, this.equal(`flag:${flag}`, value ? 1 : 0));
    }
    if (this.bdd.and(result, this.validDomain) !== result) throw new Error("Invalid modeled lifecycle or domain");
    return result;
  }

  project(state: GameState): SemanticState {
    const ending = state.receipt === undefined ? 0
      : this.endings.findIndex(([status, summary]) => status === state.receipt!.kind && summary === state.receipt!.summary) + 1;
    if (state.receipt !== undefined && ending === 0) throw new Error("Unknown modeled receipt");
    return Object.freeze({ scene: state.scene, status: state.status, ending,
      resources: Object.freeze(Object.fromEntries(this.resources.map(name => [name, state.resources[name]!]))),
      flags: Object.freeze(Object.fromEntries(this.flags.map(name => [name, Object.hasOwn(state.flags, name) && state.flags[name] === true]))),
    });
  }

  decode(assignment: readonly boolean[]): SemanticState {
    if (!Array.isArray(assignment) || assignment.length !== this.variableCount
      || Array.from(assignment).some(value => typeof value !== "boolean")) {
      throw new Error("Invalid symbolic assignment");
    }
    const value = (id: string) => this.field(id).current.reduce((result, variable, bit) => result + (assignment[variable] ? 2 ** bit : 0), 0);
    const scene = this.scenes[value("scene")], status = STATUSES[value("status")];
    if (scene === undefined || status === undefined) throw new Error("Invalid symbolic scene/status assignment");
    const state: SemanticState = Object.freeze({ scene, status, ending: value("ending"),
      resources: Object.freeze(Object.fromEntries(this.resources.map(name => [name, value(`resource:${name}`)]))),
      flags: Object.freeze(Object.fromEntries(this.flags.map(name => [name, value(`flag:${name}`) === 1]))),
    });
    this.encode(state);
    return state;
  }

  atScene(id: string): number {
    return this.bdd.and(this.validDomain, this.equal("scene", this.scenes.indexOf(id)));
  }

  image(source: number, choice?: SymbolicChoice): number {
    if (choice !== undefined) {
      if (this.bdd.and(source, choice.enabled) === 0) return 0;
      return this.bdd.rename(this.bdd.exists(this.bdd.and(source, choice.relation), this.currentVariables), this.toCurrent);
    }
    return this.choices.reduce((result, option) => this.bdd.or(result, this.image(source, option)), 0);
  }

  preimage(target: number, choice?: SymbolicChoice): number {
    const nextTarget = this.bdd.rename(target, this.toNext);
    const pre = (option: SymbolicChoice) => this.bdd.exists(this.bdd.and(nextTarget, option.relation), this.nextVariables);
    return choice === undefined ? this.choices.reduce((result, option) => this.bdd.or(result, pre(option)), 0) : pre(choice);
  }

  /** Find a real action prefix represented by forward distance frontiers. */
  witness(sourcePredicate: number, frontiers: readonly number[]): readonly string[] {
    let distance = -1, target = 0;
    for (const [index, frontier] of frontiers.entries()) {
      const hit = this.bdd.and(sourcePredicate, frontier);
      if (hit !== 0) { distance = index; target = this.encode(this.decode(this.bdd.satisfyingAssignment(hit)!)); break; }
    }
    if (distance < 0) throw new Error("No reachable symbolic witness source");
    const reversed: string[] = [];
    for (let step = distance; step > 0; step--) {
      let found = false;
      for (const choice of this.choices) {
        const previous = this.bdd.and(frontiers[step - 1]!, this.preimage(target, choice));
        if (previous === 0) continue;
        reversed.push(choice.id);
        target = this.encode(this.decode(this.bdd.satisfyingAssignment(previous)!));
        found = true; break;
      }
      if (!found) throw new Error("Symbolic witness predecessor is missing");
    }
    if (target !== this.initial) throw new Error("Symbolic witness does not start at the real initial projection");
    return Object.freeze(reversed.reverse());
  }
}

export interface SymbolicReachability {
  readonly exhaustive: true;
  readonly reachable: number;
  readonly completable: number;
  readonly deadEnds: number;
  readonly noCompletion: number;
  readonly reachableCount: bigint;
  readonly frontiers: readonly number[];
  readonly forwardRounds: number;
  readonly backwardRounds: number;
  readonly unreachableScenes: readonly string[];
  readonly unreachableChoices: readonly string[];
  readonly sceneWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly choiceWitnesses: Readonly<Record<string, readonly string[]>>;
  readonly endingWitnesses: Readonly<Record<string, readonly string[]>>;
}

/** An observer may throw to stop an incomplete diagnostic; no partial success is returned. */
export function symbolicReachability(
  model: SymbolicModel,
  roundLimit = 128,
  onProgress?: (phase: "forward" | "backward" | "scenes" | "choices", step: number) => void,
): SymbolicReachability {
  if (!Number.isSafeInteger(roundLimit) || roundLimit < 1) throw new Error("Invalid symbolic round limit");
  const bdd = model.bdd;
  const frontiers = [model.initial];
  let reachable = model.initial, frontier = model.initial, forwardRounds = 0;
  while (true) {
    if (++forwardRounds > roundLimit) throw new Error("Symbolic forward limit exceeded; coverage incomplete");
    onProgress?.("forward", forwardRounds);
    for (const choice of model.choices) {
      for (const [reason, predicate] of [["arithmetic-error", choice.arithmeticError], ["bound-exit", choice.boundExit]] as const) {
        const failed = bdd.and(frontier, predicate);
        if (failed !== 0) throw new SymbolicTransitionError(reason, choice.id, [...model.witness(failed, frontiers), choice.id]);
      }
    }
    const next = bdd.and(model.image(frontier), bdd.not(reachable));
    if (next === 0) break;
    reachable = bdd.or(reachable, next); frontier = next; frontiers.push(next);
  }
  let completable = bdd.and(reachable, model.completed), backwardRounds = 0;
  while (true) {
    if (++backwardRounds > roundLimit) throw new Error("Symbolic backward limit exceeded; coverage incomplete");
    onProgress?.("backward", backwardRounds);
    const more = bdd.and(bdd.and(model.preimage(completable), reachable), bdd.not(completable));
    if (more === 0) break;
    completable = bdd.or(completable, more);
  }
  let legal = 0;
  const sceneWitnesses: Record<string, readonly string[]> = Object.create(null);
  const choiceWitnesses: Record<string, readonly string[]> = Object.create(null);
  const endingWitnesses: Record<string, readonly string[]> = Object.create(null);
  const unreachableScenes: string[] = [];
  for (const [index, scene] of model.scenario.scenes.entries()) {
    onProgress?.("scenes", index);
    const predicate = model.atScene(scene.id);
    if (bdd.and(reachable, predicate) === 0) unreachableScenes.push(scene.id);
    else sceneWitnesses[scene.id] = model.witness(predicate, frontiers);
  }
  const unreachableChoices: string[] = [];
  for (const [index, choice] of model.choices.entries()) {
    onProgress?.("choices", index);
    legal = bdd.or(legal, choice.enabled);
    if (bdd.and(reachable, choice.enabled) === 0) { unreachableChoices.push(choice.id); continue; }
    const path = Object.freeze([...model.witness(choice.enabled, frontiers), choice.id]);
    choiceWitnesses[choice.id] = path;
    if (choice.terminal) endingWitnesses[choice.id] = path;
  }
  return Object.freeze({ exhaustive: true, reachable, completable,
    deadEnds: bdd.and(bdd.and(reachable, model.playing), bdd.not(legal)),
    noCompletion: bdd.and(bdd.and(reachable, model.playing), bdd.not(completable)),
    reachableCount: bdd.count(reachable, model.currentVariables), frontiers: Object.freeze(frontiers), forwardRounds, backwardRounds,
    unreachableScenes: Object.freeze(unreachableScenes), sceneWitnesses: Object.freeze(sceneWitnesses),
    unreachableChoices: Object.freeze(unreachableChoices), choiceWitnesses: Object.freeze(choiceWitnesses), endingWitnesses: Object.freeze(endingWitnesses),
  });
}
