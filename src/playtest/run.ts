import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { start, observe, choose, end, stateHash, BUILD_ID } from '../engine/index.js';
import { CodexPlayer } from './codex.js';
import { EvidenceWriter, sourceSnapshot, snapshotIdentity, type RunStatus } from './evidence.js';
import { PLAYER_INSTRUCTION, FREE_INTERVIEW, STRUCTURED_INTERVIEW, CHOICE_SCHEMA, INTERVIEW_SCHEMA, parseInterview } from './prompts.js';
import { validateRun } from './validate.js';

export async function runPlaytest(options: { root?: string; seed?: number; model?: string; effort?: string; maxTurns?: number; evidenceRoot?: string } = {}) {
  const root = options.root ?? process.cwd();
  const writer = new EvidenceWriter(root, options.evidenceRoot);
  const seed = options.seed ?? 1;
  const maxTurns = options.maxTurns ?? 60;
  const model = options.model ?? 'gpt-5.6-luna';
  const effort = options.effort ?? 'max';
  const source = sourceSnapshot(root);
  const sourceId = snapshotIdentity(source);
  let status: RunStatus = 'interrupted';
  let player: CodexPlayer | undefined;
  let state = start(seed);
  let phase = 'initialization';
  const started = Date.now();
  let details: Record<string, unknown> = {};
  writer.write('source.json', source);
  const commit = (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch { return null; } })();
  writer.write('setup.json', { kind: 'blind-subscription', seed, model, effort, maxTurns, buildId: BUILD_ID, sourceId, commit,
    nodeVersion: process.version, initialStateHash: stateHash(state), playerInstruction: PLAYER_INSTRUCTION,
    interviewQuestions: FREE_INTERVIEW, structuredInterview: STRUCTURED_INTERVIEW,
    note: 'Source snapshot, not commit alone, identifies the exact running candidate. Hashes provide local integrity evidence.' });
  console.log(`Run ${writer.runId}\nEvidence: ${writer.directory}`);
  try {
    player = new CodexPlayer({ model, effort, onEvent: (kind, data) => writer.append(kind, data) });
    const capability = await player.initialize();
    writer.write('provider.json', capability);
    writer.append('player_initialized', { threadId: player.threadId });
    phase = 'play';
    for (let turn = 0; state.status === 'playing'; turn++) {
      if (turn >= maxTurns) throw new Error('Runner turn limit reached; not a voluntary exit');
      const observation = observe(state);
      writer.append('observation', { threadId: player.threadId, observation, stateHash: stateHash(state) });
      const prompt = (turn === 0 ? PLAYER_INSTRUCTION + '\n\n' : '') + JSON.stringify(observation);
      const raw = await player.respond(prompt, CHOICE_SCHEMA);
      writer.append('player_response', { phase, threadId: player.threadId, raw });
      const decision: unknown = JSON.parse(raw);
      if (!decision || typeof decision !== 'object' || typeof (decision as Record<string, unknown>).choiceId !== 'string') throw new Error('Malformed player choice');
      const choiceId = (decision as { choiceId: string }).choiceId;
      const previousHash = stateHash(state);
      const expectedRevision = state.revision;
      state = choiceId === '__end__' ? end(state, expectedRevision) : choose(state, choiceId, expectedRevision);
      writer.append('action', { choiceId, expectedRevision, previousHash, stateHash: stateHash(state) });
      console.log(`Turn ${turn + 1}: ${choiceId} → ${state.status}`);
    }
    const final = observe(state);
    writer.append('observation', { threadId: player.threadId, observation: final, stateHash: stateHash(state) });
    writer.write('exit.json', { threadId: player.threadId, receipt: final.receipt });
    phase = 'free_interview';
    const freeResponse = await player.respond(JSON.stringify(final) + '\n\n' + FREE_INTERVIEW);
    writer.append('player_response', { phase, threadId: player.threadId, raw: freeResponse });
    if (!freeResponse.trim()) throw new Error('Empty free-form interview');
    phase = 'structured_interview';
    let structuredResponse = await player.respond(STRUCTURED_INTERVIEW, INTERVIEW_SCHEMA);
    writer.append('player_response', { phase, threadId: player.threadId, raw: structuredResponse });
    let interview;
    try { interview = parseInterview(structuredResponse); }
    catch {
      writer.append('interview_recovery', { reason: 'Malformed structured fields; one neutral format clarification' });
      structuredResponse = await player.respond('Your previous answer did not match the requested JSON fields. Please use the requested format, retaining your own judgments.\n' + STRUCTURED_INTERVIEW, INTERVIEW_SCHEMA);
      writer.append('player_response', { phase, threadId: player.threadId, raw: structuredResponse, recovery: true });
      interview = parseInterview(structuredResponse);
    }
    writer.write('interview.json', { threadId: player.threadId, receipt: final.receipt, freeResponse, structuredResponse, extracted: interview });
    if (snapshotIdentity(sourceSnapshot(root)) !== sourceId) throw new Error('Source changed during the run; candidate was not frozen');
    status = 'completed';
    details = { threadId: player.threadId, outcome: state.status, stateHash: stateHash(state), buildId: BUILD_ID, sourceId };
  } catch (error) {
    status = phase.includes('interview') ? 'incomplete_interview' : 'interrupted';
    const reason = error instanceof Error ? error.message : String(error);
    if (/isolation|capability|boundary/i.test(reason)) status = 'isolation_failed';
    details = { phase, reason, threadId: player?.threadId ?? null, gameStatus: state.status, stateHash: stateHash(state), buildId: BUILD_ID, sourceId };
    writer.append('failure', details);
    console.error(`Run ${status}: ${reason}`);
  } finally {
    try { await player?.close(); } catch (error) { writer.append('cleanup_failure', { message: String(error) }); }
    writer.seal(status, { ...details, elapsedMs: Date.now() - started });
  }
  const validation = validateRun(writer.directory);
  console.log(JSON.stringify({ status, directory: writer.directory, validation }, null, 2));
  return { status, directory: writer.directory, validation };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const seedText = option('--seed');
  if (seedText !== undefined && !Number.isSafeInteger(Number(seedText))) throw new Error('Seed must be a safe integer');
  runPlaytest({ root: process.cwd(), seed: seedText === undefined ? 1 : Number(seedText), model: option('--model'), effort: option('--effort'), evidenceRoot: option('--evidence-root') })
    .then(result => { if (result.status !== 'completed') process.exitCode = 1; })
    .catch(error => { console.error(error); process.exitCode = 1; });
}
