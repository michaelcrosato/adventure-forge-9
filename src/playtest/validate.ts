import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { start, choose, end, stateHash, observe, BUILD_ID } from '../engine/index.js';
import { sourceSnapshot, verifyEvidence, snapshotIdentity } from './evidence.js';
import { parseInterview } from './prompts.js';

type JsonRecord = Record<string, unknown>;

export type RecordedRunValidation = ReturnType<typeof validateRun> & {
  recordedBuildId: string;
  currentBuildId: string;
  trustedRoot: string;
  recordedSourceId: string;
  trustedSourceId: string;
  sourceMatch: true;
  sourceExecution: 'none';
};

/** Integrity is checked for every attempt; successful experience evidence has stronger requirements. */
export function validateRun(directory: string) {
  const { manifest, events } = verifyEvidence(directory);
  const json = (name: string) => JSON.parse(readFileSync(join(directory, name), 'utf8'));
  const setup = json('setup.json');
  if (snapshotIdentity(json('source.json')) !== setup.sourceId) throw new Error('Source identity mismatch');
  if (setup.buildId !== BUILD_ID) return { integrity: true, replay: 'requires recorded build', liveAccepted: false };
  let state = start(setup.seed);
  if (stateHash(state) !== setup.initialStateHash) throw new Error('Initial state mismatch');
  let threadId: string | undefined;
  let closed = false;
  let freeInterview = false;
  let structuredInterview = false;
  let pendingChoice: string | undefined;
  for (const event of events) {
    const data = event.data as Record<string, any>;
    if (event.kind === 'player_initialized') {
      if (threadId || typeof data.threadId !== 'string' || !data.threadId) throw new Error('Duplicate or invalid player conversation');
      threadId = data.threadId;
    }
    if (event.kind === 'observation') {
      if (data.threadId !== threadId || data.stateHash !== stateHash(state) || !isDeepStrictEqual(data.observation, observe(state))) throw new Error('Observation replay mismatch');
      if (state.status !== 'playing') closed = true;
    }
    if (event.kind === 'action') {
      if (closed) throw new Error('Gameplay after exit');
      if (data.choiceId !== pendingChoice) throw new Error('Action differs from original player response');
      pendingChoice = undefined;
      if (data.previousHash !== stateHash(state)) throw new Error('Action pre-state mismatch');
      state = data.choiceId === '__end__' ? end(state, data.expectedRevision) : choose(state, data.choiceId, data.expectedRevision);
      if (data.stateHash !== stateHash(state)) throw new Error('Action replay mismatch');
    }
    if (event.kind === 'player_response') {
      if (data.threadId !== threadId) throw new Error('Interview/player session mismatch');
      if (data.phase === 'play') {
        try { pendingChoice = JSON.parse(data.raw).choiceId; }
        catch { pendingChoice = undefined; }
      }
      if (data.phase === 'free_interview') {
        if (!closed || !data.raw.trim()) throw new Error('Interview before exit or empty');
        freeInterview = true;
      }
      if (data.phase === 'structured_interview') {
        if (!freeInterview) throw new Error('Missing original free-form interview');
        try { parseInterview(data.raw); structuredInterview = true; } catch { /* Original malformed recovery remains evidence. */ }
      }
    }
  }
  if (manifest.status === 'completed') {
    if (!threadId || !closed || !freeInterview || !structuredInterview) throw new Error('Incomplete live record reported as completed');
    const provider = json('provider.json');
    if (provider.isolation?.verified !== true || provider.authMode !== 'chatgpt') throw new Error('Unverified player boundary or non-subscription authentication');
    const interview = json('interview.json');
    const receipt = observe(state).receipt;
    if (interview.threadId !== threadId || !isDeepStrictEqual(interview.receipt, receipt) || !isDeepStrictEqual(json('exit.json'), { threadId, receipt })) throw new Error('Exit/interview receipt mismatch');
    const originals = events.filter(x => x.kind === 'player_response').map(x => x.data as Record<string, any>);
    if (!originals.some(x => x.phase === 'free_interview' && x.raw === interview.freeResponse)
      || !originals.some(x => x.phase === 'structured_interview' && x.raw === interview.structuredResponse)
      || !isDeepStrictEqual(parseInterview(interview.structuredResponse), interview.extracted)) throw new Error('Interview extraction diverges from original');
  }
  return { integrity: true, replay: true, liveAccepted: manifest.status === 'completed' && setup.kind === 'blind-subscription', actions: state.revision };
}

/**
 * Verify an archive against a separately trusted checkout without executing
 * any code from its recorded source snapshot. This is the safe bridge for an
 * old build: the caller checks out the recorded, trusted revision separately,
 * then runs this command from that checkout. A source snapshot is evidence,
 * not a signature, and an archive that is internally consistent can still be
 * forged; the exact checkout match is therefore required before replay.
 *
 * When the recorded build ID is current, the existing trusted validator is
 * allowed to replay the mechanics. For an old build this function reports the
 * matching checkout and the explicit recorded-build requirement; it never
 * imports, transpiles, or runs source text from the archive.
 */
export function validateRecordedRun(directory: string, trustedRoot: string): RecordedRunValidation {
  const normalizedDirectory = directory;
  const normalizedTrustedRoot = trustedRoot;
  // Establish the archive's own hash-chain and file-hash integrity before
  // inspecting any recorded metadata used for the trusted-checkout gate.
  verifyEvidence(normalizedDirectory);
  const source = readJson(join(normalizedDirectory, 'source.json'));
  const setup = readJson(join(normalizedDirectory, 'setup.json'));
  if (!isSourceSnapshot(source)) throw new Error('Recorded source snapshot has an unsafe or invalid shape');
  if (typeof setup.sourceId !== 'string' || typeof setup.buildId !== 'string') {
    throw new Error('Recorded setup is missing sourceId or buildId');
  }

  const recordedSourceId = snapshotIdentity(source);
  if (recordedSourceId !== setup.sourceId) throw new Error('Recorded source identity does not match setup');
  const trustedSource = sourceSnapshot(normalizedTrustedRoot);
  const trustedSourceId = snapshotIdentity(trustedSource);
  if (recordedSourceId !== trustedSourceId) {
    throw new Error('Recorded source does not match the trusted checkout; refusing to execute archived source');
  }

  const validation = validateRun(normalizedDirectory);
  const replay = setup.buildId === BUILD_ID
    ? validation.replay
    : 'requires recorded build; source matches trusted checkout';
  return {
    ...validation,
    replay,
    recordedBuildId: setup.buildId,
    currentBuildId: BUILD_ID,
    trustedRoot: normalizedTrustedRoot,
    recordedSourceId,
    trustedSourceId,
    sourceMatch: true,
    sourceExecution: 'none',
  } as RecordedRunValidation;
}

function readJson(path: string): JsonRecord {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    throw new Error(`Invalid recorded JSON: ${path}`);
  }
  if (!isRecord(value)) throw new Error(`Recorded JSON must be an object: ${path}`);
  return value;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSourceSnapshot(value: JsonRecord): value is Record<string, string> {
  return Object.entries(value).every(([path, content]) => {
    if (path.includes('\0') || path.startsWith('/') || path.split('/').some(part => part === '..')) return false;
    if (!(path.startsWith('src/') || path === 'package.json' || path === 'package-lock.json' || path === 'tsconfig.json')) return false;
    return typeof content === 'string';
  });
}
