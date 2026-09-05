import type { Condition, Scene } from "./content.js";

export interface ConservedFields {
  readonly resources: readonly string[];
  readonly flags: readonly string[];
}

export interface ProjectionValues {
  readonly resources: Readonly<Record<string, number>>;
  readonly flags: Readonly<Record<string, boolean>>;
}

export interface ParameterizedTextLine {
  readonly text: string;
  /** Exact predicates on immutable parameters; active conditions are resolved. */
  readonly when: readonly Condition[];
}

function resourceValue(state: ProjectionValues, name: string): number {
  const value = Object.hasOwn(state.resources, name) ? state.resources[name] : undefined;
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Conserved projection requires a valid resource binding: ${name}`);
  }
  return value;
}

function flagValue(state: ProjectionValues, name: string): boolean {
  if (!Object.hasOwn(state.flags, name)) return false;
  const value = state.flags[name];
  if (typeof value !== "boolean") throw new Error(`Invalid flag binding: ${name}`);
  return value;
}

function assertKnownCondition(condition: Condition): void {
  switch (condition.type) {
    case "flag":
    case "resourceAtLeast":
    case "resourceAtMost":
      return;
    default:
      throw new Error("Conserved projection cannot interpret an unknown condition");
  }
}

function matches(condition: Condition, state: ProjectionValues): boolean {
  switch (condition.type) {
    case "flag": return flagValue(state, condition.flag) === condition.value;
    case "resourceAtLeast": return resourceValue(state, condition.resource) >= condition.value;
    case "resourceAtMost": return resourceValue(state, condition.resource) <= condition.value;
    default: throw new Error("Conserved projection cannot interpret an unknown condition");
  }
}

/** Capture exact bindings. This does not prove that these fields are conserved. */
export function bindParameters(state: ProjectionValues, fields: ConservedFields): ProjectionValues {
  return Object.freeze({
    resources: Object.freeze(Object.fromEntries(fields.resources.map(name => [name, resourceValue(state, name)]))),
    flags: Object.freeze(Object.fromEntries(fields.flags.map(name => [name, flagValue(state, name)]))),
  });
}

/** Check a proposed frame condition against a concrete engine transition. */
export function assertParametersPreserved(
  before: ProjectionValues,
  after: ProjectionValues,
  fields: ConservedFields,
): void {
  for (const name of fields.resources) {
    if (resourceValue(before, name) !== resourceValue(after, name)) {
      throw new Error(`Conserved resource changed: ${name}`);
    }
  }
  for (const name of fields.flags) {
    if (flagValue(before, name) !== flagValue(after, name)) {
      throw new Error(`Conserved flag changed: ${name}`);
    }
  }
}

/**
 * Resolve concrete conditions while preserving predicates on declared
 * parameters. The future-influence proof must establish those declarations
 * separately; this helper does not change the active audit's state identity.
 */
export function parameterizeText(
  scene: Scene,
  state: ProjectionValues,
  fields: ConservedFields,
): readonly ParameterizedTextLine[] {
  const resources = new Set(fields.resources);
  const flags = new Set(fields.flags);
  const result: ParameterizedTextLine[] = [];
  for (const line of scene.text) {
    const conditions = line.when ?? [];
    // Check the entire line before evaluating any false active predicate.
    for (const condition of conditions) assertKnownCondition(condition);
    const residual: Condition[] = [];
    let visible = true;
    for (const condition of conditions) {
      const parameter = condition.type === "flag" ? flags.has(condition.flag) : resources.has(condition.resource);
      if (parameter) residual.push(Object.freeze({ ...condition }));
      else if (!matches(condition, state)) visible = false;
    }
    if (visible) result.push(Object.freeze({ text: line.text, when: Object.freeze(residual) }));
  }
  return Object.freeze(result);
}

/** Substitute one family's own exact bindings to recover its displayed text. */
export function instantiateText(
  template: readonly ParameterizedTextLine[],
  bindings: ProjectionValues,
): readonly string[] {
  const result: string[] = [];
  for (const line of template) {
    for (const condition of line.when) {
      assertKnownCondition(condition);
      if (condition.type === "flag" && !Object.hasOwn(bindings.flags, condition.flag)) {
        throw new Error(`Missing conserved flag binding: ${condition.flag}`);
      }
    }
    if (line.when.every(condition => matches(condition, bindings))) result.push(line.text);
  }
  return result;
}
