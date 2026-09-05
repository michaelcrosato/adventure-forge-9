import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { BUILD_ID, type Observation } from '../engine/index.js';
import { CodexPlayer, type CodexPlayerMetadata } from './codex.js';
import { EvidenceWriter, snapshotIdentity, sourceSnapshot } from './evidence.js';

export const COMPREHENSION_MODEL = 'gpt-5.6-luna';
export const COMPREHENSION_EFFORT = 'max';

const STRUCTURED_SCHEMA = {
  type: 'object',
  properties: {
    chosenChoiceId: { type: 'string' },
    sharedRepairAvailable: { type: 'boolean' },
    requirementsFullyExplained: { type: 'boolean' },
    missingRequirement: { type: 'string' },
    explanation: { type: 'string' },
  },
  required: [
    'chosenChoiceId',
    'sharedRepairAvailable',
    'requirementsFullyExplained',
    'missingRequirement',
    'explanation',
  ],
  additionalProperties: false,
} as const;

type ComprehensionStatus = 'completed' | 'interrupted' | 'isolation_failed';
type JsonRecord = Record<string, unknown>;
type TrustedGameState = { revision: number };
type TrustedEngine = {
  BUILD_ID: string;
  start(seed: number): TrustedGameState;
  choose(state: TrustedGameState, choiceId: string, expectedRevision: number): TrustedGameState;
  observe(state: TrustedGameState): Observation;
};

export interface ComprehensionCase {
  readonly label: string;
  readonly sourceId: string;
  readonly buildId: string;
  readonly seed: number;
  readonly actions: readonly string[];
  readonly source: Record<string, string>;
  readonly projection: Observation;
}

export interface ComprehensionOptions {
  readonly casePath: string;
  readonly evidenceRoot?: string;
  readonly root?: string;
  readonly trustedGameRoot?: string;
}

export interface ComprehensionResult {
  readonly status: ComprehensionStatus;
  readonly directory: string;
  readonly runId: string;
  readonly label: string;
  readonly threadId: string | null;
  readonly response?: string;
  readonly structuredResponse?: string;
  readonly reason?: string;
}

/**
 * Run a two-turn, public-projection comprehension check. The supplied case is
 * an immutable data fixture: its source text is hashed and archived, but is
 * never imported, transpiled, or otherwise executed.
 */
export async function runComprehension(options: ComprehensionOptions): Promise<ComprehensionResult> {
  const root = resolve(options.root ?? process.cwd());
  const casePath = resolve(options.casePath);
  const fixture = readCase(casePath);
  const trustedRoot = resolve(options.trustedGameRoot ?? root);
  const { engine: trustedEngine, source: trustedSource } = await loadTrustedEngine(trustedRoot, fixture);
  replayCase(fixture, trustedEngine);
  const harnessSource = sourceSnapshot(root);
  const harnessSourceId = snapshotIdentity(harnessSource);
  const evidenceRoot = options.evidenceRoot === undefined ? undefined : resolve(options.evidenceRoot);
  const writer = new EvidenceWriter(root, evidenceRoot);
  const started = Date.now();
  const freePrompt = buildFreePrompt(fixture.projection);
  const structuredPrompt = buildStructuredPrompt(fixture.projection);
  let player: CodexPlayer | undefined;
  let metadata: CodexPlayerMetadata | undefined;
  let freeResponse: string | undefined;
  let structuredResponse: string | undefined;
  let status: ComprehensionStatus = 'interrupted';
  let reason: string | undefined;
  let phase = 'initialization';

  writer.write('case.json', fixture);
  writer.write('source.json', fixture.source);
  writer.write('trusted-source.json', trustedSource);
  writer.write('harness-source.json', harnessSource);
  writer.write('setup.json', {
    kind: 'specialist_comprehension',
    freshThreadRequired: true,
    gameplay: false,
    label: fixture.label,
    caseSourceId: fixture.sourceId,
    caseBuildId: fixture.buildId,
    trustedGameBuildId: trustedEngine.BUILD_ID,
    trustedGameRoot: trustedRoot,
    harnessSourceId,
    harnessBuildId: BUILD_ID,
    seed: fixture.seed,
    actions: fixture.actions,
    projection: fixture.projection,
    model: COMPREHENSION_MODEL,
    effort: COMPREHENSION_EFFORT,
    promptPolicy: 'Public projection only; do not reveal a target answer or expected requirement.',
  });

  const onEvent = (kind: string, data: unknown) => writer.append(kind, data);
  try {
    player = new CodexPlayer({ model: COMPREHENSION_MODEL, effort: COMPREHENSION_EFFORT, onEvent });
    metadata = await player.initialize();
    writer.write('provider.json', metadata);
    writer.append('comprehension_initialized', {
      threadId: player.threadId,
      model: metadata.model,
      effort: metadata.effort,
      authMode: metadata.authMode,
      isolationVerified: metadata.isolation.verified,
    });

    phase = 'free_response';
    writer.append('comprehension_request', { phase, threadId: player.threadId, prompt: freePrompt });
    freeResponse = await player.respond(freePrompt);
    writer.append('comprehension_response', { phase, threadId: player.threadId, raw: freeResponse });

    phase = 'structured_response';
    writer.append('comprehension_request', {
      phase,
      threadId: player.threadId,
      prompt: structuredPrompt,
      outputSchema: STRUCTURED_SCHEMA,
    });
    structuredResponse = await player.respond(structuredPrompt, STRUCTURED_SCHEMA);
    writer.append('comprehension_response', { phase, threadId: player.threadId, raw: structuredResponse });
    validateStructuredResponse(structuredResponse, fixture.projection);
    status = 'completed';
  } catch (error) {
    reason = safeReason(error);
    status = /isolation|capability|boundary|auth|model/i.test(reason) ? 'isolation_failed' : 'interrupted';
    writer.append('comprehension_failure', { phase, reason });
  } finally {
    try {
      await player?.close();
    } catch (error) {
      writer.append('cleanup_failure', { message: safeReason(error) });
      if (status === 'completed') {
        status = 'interrupted';
        reason ??= 'Comprehension cleanup failed';
      }
    }
    try {
      const finalHarnessSourceId = snapshotIdentity(sourceSnapshot(root));
      if (finalHarnessSourceId !== harnessSourceId) {
        status = 'isolation_failed';
        reason = 'Harness source changed during comprehension check';
        writer.append('comprehension_failure', { phase: 'source_freeze', reason });
      }
      const finalTrustedSource = sourceSnapshot(trustedRoot);
      if (snapshotIdentity(finalTrustedSource) !== fixture.sourceId || !isDeepStrictEqual(finalTrustedSource, fixture.source)) {
        status = 'isolation_failed';
        reason = 'Trusted game source changed during comprehension check';
        writer.append('comprehension_failure', { phase: 'trusted_source_freeze', reason });
      }
    } catch {
      status = 'isolation_failed';
      reason = 'Unable to verify source freeze';
      writer.append('comprehension_failure', { phase: 'source_freeze', reason });
    }
    writer.write('responses.json', {
      threadId: player?.threadId ?? null,
      freeResponse: freeResponse ?? null,
      structuredResponse: structuredResponse ?? null,
    });
  }

  const details = {
    kind: 'specialist_comprehension',
    label: fixture.label,
    gameplay: false,
    threadId: player?.threadId ?? null,
    caseSourceId: fixture.sourceId,
    trustedGameBuildId: trustedEngine.BUILD_ID,
    trustedGameRoot: trustedRoot,
    harnessSourceId,
    phase,
    ...(reason === undefined ? {} : { reason }),
  };
  writer.seal(status, { ...details, elapsedMs: Date.now() - started });
  return {
    status,
    directory: writer.directory,
    runId: writer.runId,
    label: fixture.label,
    threadId: player?.threadId ?? null,
    ...(freeResponse === undefined ? {} : { response: freeResponse }),
    ...(structuredResponse === undefined ? {} : { structuredResponse }),
    ...(reason === undefined ? {} : { reason }),
  };
}

function buildFreePrompt(projection: Observation): string {
  return [
    'This is a specialist comprehension check, not gameplay and not a normal player session.',
    'Do not take actions, call tools, inspect files, reveal secrets, or contact external hosts.',
    'Use only the public scene projection below.',
    'Explain the available ways forward, identify any apparent mismatch between the visible text, resources, and listed choices, and choose one listed option by its exact choice ID.',
    'Do not invent choices or hidden requirements. Report your own reading honestly; this check does not provide a correct answer or an acceptance target.',
    '',
    'PUBLIC SCENE PROJECTION:',
    JSON.stringify(projection),
  ].join('\n');
}

function buildStructuredPrompt(projection: Observation): string {
  return [
    'This remains a specialist comprehension check, not gameplay. Do not take an action or use any capability.',
    'Based only on the public projection and your own first response, return JSON matching the supplied schema with these fields: chosenChoiceId (string), sharedRepairAvailable (boolean), requirementsFullyExplained (boolean), missingRequirement (string), and explanation (string).',
    'Choose a listed choice ID and set every field from your own reading, without trying to match a target answer. If no requirement seems missing, use an empty missingRequirement string.',
    'Do not infer hidden state or consult any source beyond the projection below.',
    '',
    'PUBLIC SCENE PROJECTION:',
    JSON.stringify(projection),
  ].join('\n');
}

async function loadTrustedEngine(root: string, fixture: ComprehensionCase): Promise<{ engine: TrustedEngine; source: Record<string, string> }> {
  const source = sourceSnapshot(root);
  if (snapshotIdentity(source) !== fixture.sourceId || !isDeepStrictEqual(source, fixture.source)) {
    throw new Error('Trusted game root source does not exactly match the comprehension case');
  }
  const entry = join(root, 'src', 'engine', 'index.ts');
  if (!existsSync(entry)) throw new Error('Trusted game root has no source engine entry');
  const engine = await import(pathToFileURL(entry).href) as unknown as TrustedEngine;
  if (engine.BUILD_ID !== fixture.buildId) throw new Error('Trusted game root build does not match the comprehension case');
  return { engine, source };
}

function readCase(path: string): ComprehensionCase {
  if (!existsSync(path)) throw new Error('Comprehension case file does not exist');
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    throw new Error('Comprehension case is not valid JSON');
  }
  const record = asRecord(value);
  const label = requiredString(record.label, 'case.label');
  const sourceId = requiredString(record.sourceId, 'case.sourceId');
  const buildId = requiredString(record.buildId, 'case.buildId');
  const seed = record.seed;
  if (typeof seed !== 'number' || !Number.isSafeInteger(seed)) throw new Error('case.seed must be a safe integer');
  if (!Array.isArray(record.actions) || !record.actions.every(action => typeof action === 'string' && action.length > 0)) {
    throw new Error('case.actions must contain non-empty choice IDs');
  }
  const sourceRecord = asRecord(record.source);
  if (!Object.entries(sourceRecord).every(([name, content]) => typeof name === 'string' && typeof content === 'string')) {
    throw new Error('case.source must map paths to source text');
  }
  const source = sourceRecord as Record<string, string>;
  if (snapshotIdentity(source) !== sourceId) throw new Error('case.sourceId does not match case.source');
  const projection = parseProjection(record.projection);
  if (projection.choices.length === 0) throw new Error('case.projection must display at least one choice');
  return {
    label,
    sourceId,
    buildId,
    seed,
    actions: [...record.actions] as string[],
    source,
    projection,
  };
}

function replayCase(fixture: ComprehensionCase, engine: TrustedEngine): Observation {
  // Replay uses only the separately trusted checkout's engine. The case's recorded source is
  // deliberately not loaded, so a stale or malicious source snapshot cannot
  // become executable code in this process.
  if (fixture.buildId !== engine.BUILD_ID) throw new Error('Comprehension case build does not match the trusted game root');
  let state = engine.start(fixture.seed);
  try {
    for (const action of fixture.actions) state = engine.choose(state, action, state.revision);
  } catch {
    throw new Error('Comprehension case actions are not legal in the trusted game root');
  }
  const projection = engine.observe(state);
  if (!isDeepStrictEqual(projection, fixture.projection)) {
    throw new Error('Comprehension case projection does not match the trusted harness');
  }
  if (!projection.choices.some(choice => typeof choice.id === 'string' && choice.id.length > 0)) {
    throw new Error('Comprehension case has no legal displayed choice');
  }
  return projection;
}

function parseProjection(value: unknown): Observation {
  const projection = asRecord(value);
  if (!Number.isSafeInteger(projection.revision)
    || typeof projection.sceneId !== 'string'
    || typeof projection.title !== 'string'
    || !Array.isArray(projection.text)
    || !projection.text.every(line => typeof line === 'string')
    || !Array.isArray(projection.facts)
    || !projection.facts.every(fact => typeof fact === 'string')
    || !Array.isArray(projection.journal)
    || !Array.isArray(projection.choices)
    || !projection.choices.every(choice => {
      const item = asRecord(choice);
      return typeof item.id === 'string' && typeof item.label === 'string' && typeof item.description === 'string';
    })
    || !asRecord(projection.resources)
    || !Object.values(asRecord(projection.resources)).every(resource => typeof resource === 'number' && Number.isSafeInteger(resource))
    || !['playing', 'completed', 'departed', 'dead'].includes(String(projection.status))) {
    throw new Error('case.projection is not a valid public observation');
  }
  return projection as unknown as Observation;
}

function validateStructuredResponse(response: string, projection: Observation): void {
  let value: unknown;
  try {
    value = JSON.parse(response) as unknown;
  } catch {
    throw new Error('Structured comprehension response was not JSON');
  }
  const record = asRecord(value);
  if (typeof record.chosenChoiceId !== 'string'
    || typeof record.sharedRepairAvailable !== 'boolean'
    || typeof record.requirementsFullyExplained !== 'boolean'
    || typeof record.missingRequirement !== 'string'
    || typeof record.explanation !== 'string') {
    throw new Error('Structured comprehension response has invalid fields');
  }
  if (!projection.choices.some(choice => choice.id === record.chosenChoiceId)) {
    throw new Error('Structured comprehension response chose an unavailable option');
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${field} must be a non-empty string`);
  return value;
}

function safeReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/https?:\/\/\S+/gi, '<url>').slice(0, 240);
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && pathToFileURL(resolve(entry)).href === import.meta.url);
}

if (isMainModule()) {
  const args = process.argv.slice(2);
  const option = (name: string): string | undefined => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  const casePath = option('--case');
  if (!casePath) {
    console.error('Usage: npx tsx src/playtest/comprehension.ts --case <case.json> [--trusted-game-root <directory>] [--evidence-root <directory>]');
    process.exitCode = 1;
  } else {
    runComprehension({
      casePath,
      ...(option('--evidence-root') === undefined ? {} : { evidenceRoot: option('--evidence-root') }),
      ...(option('--trusted-game-root') === undefined ? {} : { trustedGameRoot: option('--trusted-game-root') }),
    })
      .then(result => {
        console.log(JSON.stringify(result, null, 2));
        if (result.status !== 'completed') process.exitCode = 1;
      })
      .catch(error => {
        console.error(safeReason(error));
        process.exitCode = 1;
      });
  }
}
