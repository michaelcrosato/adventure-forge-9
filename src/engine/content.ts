import { FACT_LABELS, RAW_SCENARIO, type ChoiceData, type ConditionData, type EffectData, type ScenarioData, type SceneData, type TextLineData } from "../content/scenario.js";

export type Condition = ConditionData;
export type Effect = EffectData;
export type Scene = SceneData;
export type Choice = ChoiceData;
export type Scenario = ScenarioData;

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

class ContentValidationError extends Error {
  public readonly code = "CONTENT_VALIDATION";

  public constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}

function fail(path: string, message: string): never {
  throw new ContentValidationError(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) fail(path, `unknown property ${JSON.stringify(key)}`);
  }
}

function required(value: Record<string, unknown>, key: string, path: string): unknown {
  if (!(key in value)) fail(path, `missing property ${JSON.stringify(key)}`);
  return value[key];
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) fail(path, "must be a non-empty string");
  return value;
}

function idValue(value: unknown, path: string): string {
  const result = stringValue(value, path);
  if (!ID_PATTERN.test(result)) fail(path, "must use lowercase letters, digits, and hyphens");
  return result;
}

function finiteInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) fail(path, "must be a safe integer");
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  const result = finiteInteger(value, path);
  if (result < 0) fail(path, "must be non-negative");
  return result;
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "must be a boolean");
  return value;
}

function stringArray(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) fail(path, "must be an array");
  const seen = new Set<string>();
  return value.map((entry, index) => {
    const result = stringValue(entry, `${path}[${index}]`);
    if (seen.has(result)) fail(`${path}[${index}]`, "must be unique");
    seen.add(result);
    return result;
  });
}

function condition(value: unknown, path: string): Condition {
  if (!isRecord(value)) fail(path, "must be an object");
  const type = stringValue(required(value, "type", path), `${path}.type`);
  if (type === "flag") {
    exactKeys(value, ["type", "flag", "value"], path);
    return {
      type,
      flag: idValue(required(value, "flag", path), `${path}.flag`),
      value: booleanValue(required(value, "value", path), `${path}.value`),
    };
  }
  if (type === "resourceAtLeast") {
    exactKeys(value, ["type", "resource", "value"], path);
    return {
      type,
      resource: idValue(required(value, "resource", path), `${path}.resource`),
      value: nonNegativeInteger(required(value, "value", path), `${path}.value`),
    };
  }
  fail(`${path}.type`, `unknown condition type ${JSON.stringify(type)}`);
}

function conditions(value: unknown, path: string): readonly Condition[] {
  if (!Array.isArray(value)) fail(path, "must be an array");
  return value.map((entry, index) => condition(entry, `${path}[${index}]`));
}

function effect(value: unknown, path: string): Effect {
  if (!isRecord(value)) fail(path, "must be an object");
  const type = stringValue(required(value, "type", path), `${path}.type`);
  if (type === "setFlag") {
    exactKeys(value, ["type", "flag", "value"], path);
    return {
      type,
      flag: idValue(required(value, "flag", path), `${path}.flag`),
      value: booleanValue(required(value, "value", path), `${path}.value`),
    };
  }
  if (type === "setResource") {
    exactKeys(value, ["type", "resource", "value"], path);
    return {
      type,
      resource: idValue(required(value, "resource", path), `${path}.resource`),
      value: nonNegativeInteger(required(value, "value", path), `${path}.value`),
    };
  }
  if (type === "adjustResource") {
    exactKeys(value, ["type", "resource", "delta"], path);
    return {
      type,
      resource: idValue(required(value, "resource", path), `${path}.resource`),
      delta: finiteInteger(required(value, "delta", path), `${path}.delta`),
    };
  }
  if (type === "addFact") {
    exactKeys(value, ["type", "fact"], path);
    return {
      type,
      fact: stringValue(required(value, "fact", path), `${path}.fact`),
    };
  }
  if (type === "goTo") {
    exactKeys(value, ["type", "scene"], path);
    return {
      type,
      scene: idValue(required(value, "scene", path), `${path}.scene`),
    };
  }
  fail(`${path}.type`, `unknown effect type ${JSON.stringify(type)}`);
}

function textLine(value: unknown, path: string): TextLineData {
  if (!isRecord(value)) fail(path, "must be an object");
  exactKeys(value, ["text", "when"], path);
  const when = value.when === undefined ? undefined : conditions(value.when, `${path}.when`);
  return {
    text: stringValue(required(value, "text", path), `${path}.text`),
    ...(when === undefined ? {} : { when }),
  };
}

function scene(value: unknown, path: string): Scene {
  if (!isRecord(value)) fail(path, "must be an object");
  exactKeys(value, ["id", "title", "text"], path);
  const textValue = required(value, "text", path);
  if (!Array.isArray(textValue) || textValue.length === 0) fail(`${path}.text`, "must be a non-empty array");
  return {
    id: idValue(required(value, "id", path), `${path}.id`),
    title: stringValue(required(value, "title", path), `${path}.title`),
    text: textValue.map((entry, index) => textLine(entry, `${path}.text[${index}]`)),
  };
}

function outcome(value: unknown, path: string): NonNullable<ChoiceData["outcome"]> {
  if (!isRecord(value)) fail(path, "must be an object");
  exactKeys(value, ["status", "summary"], path);
  const status = stringValue(required(value, "status", path), `${path}.status`);
  if (status !== "completed" && status !== "departed" && status !== "dead") {
    fail(`${path}.status`, `unknown terminal status ${JSON.stringify(status)}`);
  }
  return {
    status,
    summary: stringValue(required(value, "summary", path), `${path}.summary`),
  };
}

function choice(value: unknown, path: string): Choice {
  if (!isRecord(value)) fail(path, "must be an object");
  exactKeys(value, ["id", "scene", "label", "description", "when", "effects", "outcome"], path);
  const when = value.when === undefined ? undefined : conditions(value.when, `${path}.when`);
  const effectsValue = required(value, "effects", path);
  if (!Array.isArray(effectsValue)) fail(`${path}.effects`, "must be an array");
  const effects = effectsValue.map((entry, index) => effect(entry, `${path}.effects[${index}]`));
  const parsedOutcome = value.outcome === undefined ? undefined : outcome(value.outcome, `${path}.outcome`);
  return {
    id: idValue(required(value, "id", path), `${path}.id`),
    scene: idValue(required(value, "scene", path), `${path}.scene`),
    label: stringValue(required(value, "label", path), `${path}.label`),
    description: stringValue(required(value, "description", path), `${path}.description`),
    ...(when === undefined ? {} : { when }),
    effects,
    ...(parsedOutcome === undefined ? {} : { outcome: parsedOutcome }),
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function validateScenario(value: unknown): Scenario {
  if (!isRecord(value)) fail("scenario", "must be an object");
  exactKeys(value, ["version", "initialScene", "initialResources", "initialFacts", "scenes", "choices"], "scenario");
  if (required(value, "version", "scenario") !== 1) fail("scenario.version", "must be 1");

  const initialResourcesValue = required(value, "initialResources", "scenario");
  if (!isRecord(initialResourcesValue)) fail("scenario.initialResources", "must be an object");
  const initialResources: Record<string, number> = {};
  for (const [key, resourceValue] of Object.entries(initialResourcesValue)) {
    const resource = idValue(key, `scenario.initialResources.${key}`);
    initialResources[resource] = nonNegativeInteger(resourceValue, `scenario.initialResources.${key}`);
  }
  if (Object.keys(initialResources).length === 0) fail("scenario.initialResources", "must contain a resource");

  const initialFacts = stringArray(required(value, "initialFacts", "scenario"), "scenario.initialFacts");
  const scenesValue = required(value, "scenes", "scenario");
  if (!Array.isArray(scenesValue) || scenesValue.length === 0) fail("scenario.scenes", "must be a non-empty array");
  const scenes = scenesValue.map((entry, index) => scene(entry, `scenario.scenes[${index}]`));
  const sceneIds = new Set<string>();
  for (const [index, sceneValue] of scenes.entries()) {
    if (sceneIds.has(sceneValue.id)) fail(`scenario.scenes[${index}].id`, "must be unique");
    sceneIds.add(sceneValue.id);
  }
  const initialScene = idValue(required(value, "initialScene", "scenario"), "scenario.initialScene");
  if (!sceneIds.has(initialScene)) fail("scenario.initialScene", `unknown scene ${JSON.stringify(initialScene)}`);

  const choicesValue = required(value, "choices", "scenario");
  if (!Array.isArray(choicesValue) || choicesValue.length === 0) fail("scenario.choices", "must be a non-empty array");
  const choices = choicesValue.map((entry, index) => choice(entry, `scenario.choices[${index}]`));
  const choiceIds = new Set<string>();
  const flags = new Set<string>();
  const facts = new Set(initialFacts);
  for (const [index, choiceValue] of choices.entries()) {
    if (choiceIds.has(choiceValue.id)) fail(`scenario.choices[${index}].id`, "must be unique");
    choiceIds.add(choiceValue.id);
    if (!sceneIds.has(choiceValue.scene)) fail(`scenario.choices[${index}].scene`, `unknown scene ${JSON.stringify(choiceValue.scene)}`);
    let goToCount = 0;
    // Check effect sequences symbolically from an unknown scene balance. A
    // resourceAtLeast condition supplies a lower bound; setResource resets the
    // balance. This catches two subtractive effects that cannot both succeed
    // without assuming that every scene starts with initialResources.
    const conditionFloors = new Map<string, number>();
    for (const conditionValue of choiceValue.when ?? []) {
      if (conditionValue.type === "resourceAtLeast") {
        conditionFloors.set(conditionValue.resource, Math.max(conditionFloors.get(conditionValue.resource) ?? 0, conditionValue.value));
      }
    }
    const relativeBalances: Record<string, number> = {};
    const hasSetBalance: Record<string, boolean> = {};
    for (const effectValue of choiceValue.effects) {
      if (effectValue.type === "setFlag") flags.add(effectValue.flag);
      if (effectValue.type === "addFact") facts.add(effectValue.fact);
      if (effectValue.type === "setResource" || effectValue.type === "adjustResource") {
        if (!(effectValue.resource in initialResources)) {
          fail(`scenario.choices[${index}].effects`, `unknown resource ${JSON.stringify(effectValue.resource)}`);
        }
      }
      if (effectValue.type === "goTo") {
        goToCount += 1;
        if (!sceneIds.has(effectValue.scene)) fail(`scenario.choices[${index}].effects`, `unknown scene ${JSON.stringify(effectValue.scene)}`);
      }
      if (effectValue.type === "setResource") {
        relativeBalances[effectValue.resource] = effectValue.value;
        hasSetBalance[effectValue.resource] = true;
      }
      if (effectValue.type === "adjustResource") {
        const result = (relativeBalances[effectValue.resource] ?? 0) + effectValue.delta;
        if (!Number.isSafeInteger(result)) {
          fail(`scenario.choices[${index}].effects`, `resource ${JSON.stringify(effectValue.resource)} exceeds safe integer bounds`);
        }
        relativeBalances[effectValue.resource] = result;
        if (result < 0 && (hasSetBalance[effectValue.resource] === true || (conditionFloors.get(effectValue.resource) ?? 0) < -result)) {
          fail(
            `scenario.choices[${index}].effects`,
            `resource ${JSON.stringify(effectValue.resource)} could become negative; add a sufficient resourceAtLeast condition or setResource first`,
          );
        }
      }
    }
    if (choiceValue.outcome === undefined && goToCount !== 1) {
      fail(`scenario.choices[${index}]`, "a non-terminal choice must have exactly one goTo effect");
    }
    if (choiceValue.outcome !== undefined && goToCount !== 0) {
      fail(`scenario.choices[${index}]`, "a terminal choice cannot have a goTo effect");
    }
  }
  for (const [index, choiceValue] of choices.entries()) {
    for (const conditionValue of choiceValue.when ?? []) {
      if (conditionValue.type === "resourceAtLeast" && !(conditionValue.resource in initialResources)) {
        fail(`scenario.choices[${index}].when`, `unknown resource ${JSON.stringify(conditionValue.resource)}`);
      }
      if (conditionValue.type === "flag" && !flags.has(conditionValue.flag)) {
        fail(`scenario.choices[${index}].when`, `unknown flag ${JSON.stringify(conditionValue.flag)}`);
      }
    }
  }
  for (const [sceneIndex, sceneValue] of scenes.entries()) {
    for (const [lineIndex, line] of sceneValue.text.entries()) {
      for (const conditionValue of line.when ?? []) {
        if (conditionValue.type === "resourceAtLeast" && !(conditionValue.resource in initialResources)) {
          fail(`scenario.scenes[${sceneIndex}].text[${lineIndex}].when`, `unknown resource ${JSON.stringify(conditionValue.resource)}`);
        }
        if (conditionValue.type === "flag" && !flags.has(conditionValue.flag)) {
          fail(`scenario.scenes[${sceneIndex}].text[${lineIndex}].when`, `unknown flag ${JSON.stringify(conditionValue.flag)}`);
        }
      }
    }
  }
  const choicesByScene = new Set(choices.map((choiceValue) => choiceValue.scene));
  for (const [index, sceneValue] of scenes.entries()) {
    if (!choicesByScene.has(sceneValue.id)) fail(`scenario.scenes[${index}]`, "must have at least one choice");
  }

  const parsed: Scenario = {
    version: 1,
    initialScene,
    initialResources: { ...initialResources },
    initialFacts: [...initialFacts],
    scenes: scenes.map((sceneValue) => ({
      id: sceneValue.id,
      title: sceneValue.title,
      text: sceneValue.text.map((line) => ({
        text: line.text,
        ...(line.when === undefined ? {} : { when: line.when.map((conditionValue) => ({ ...conditionValue })) }),
      })),
    })),
    choices: choices.map((choiceValue) => ({
      id: choiceValue.id,
      scene: choiceValue.scene,
      label: choiceValue.label,
      description: choiceValue.description,
      ...(choiceValue.when === undefined ? {} : { when: choiceValue.when.map((conditionValue) => ({ ...conditionValue })) }),
      effects: choiceValue.effects.map((effectValue) => ({ ...effectValue })),
      ...(choiceValue.outcome === undefined ? {} : { outcome: { ...choiceValue.outcome } }),
    })),
  };
  // Ensure that every fact reachable through data remains a plain authored value.
  if ([...facts].some((fact) => typeof fact !== "string" || fact.length === 0)) fail("scenario", "facts must be non-empty strings");
  for (const fact of facts) {
    if (!(fact in FACT_LABELS)) fail("scenario", `missing player-facing label for fact ${JSON.stringify(fact)}`);
  }
  return deepFreeze(parsed);
}

export const SCENARIO = validateScenario(RAW_SCENARIO);
export { ContentValidationError, validateScenario };
