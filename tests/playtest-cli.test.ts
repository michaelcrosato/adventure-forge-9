import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parsePlaytestArguments } from '../src/playtest/run.js';

test('playtest arguments retain supported options and the default seed', () => {
  assert.deepEqual(parsePlaytestArguments([]), {
    help: false, options: { seed: 1, model: undefined, effort: undefined, evidenceRoot: undefined },
  });
  assert.deepEqual(parsePlaytestArguments(['--seed=3', '--model', 'gpt-5.6-luna', '--effort', 'max', '--evidence-root', '/tmp/example']), {
    help: false, options: { seed: 3, model: 'gpt-5.6-luna', effort: 'max', evidenceRoot: '/tmp/example' },
  });
  const separatedSeed = parsePlaytestArguments(['--seed', '3']);
  assert.equal(separatedSeed.help, false);
  if (!separatedSeed.help) assert.equal(separatedSeed.options.seed, 3);
  assert.deepEqual(parsePlaytestArguments(['-h']), { help: true });
  assert.deepEqual(parsePlaytestArguments(['--help']), { help: true });
});

test('playtest rejects unsupported, missing, empty and invalid options before dispatch', () => {
  for (const args of [
    ['--max-turns', '60'], ['--unknown'], ['stray'], ['--seed'], ['--model'],
    ['--effort'], ['--evidence-root'], ['--seed', ''], ['--seed', '1.5'],
    ['--seed', '9007199254740992'], ['--model', ''], ['--effort', ' '],
    ['--evidence-root', ''], ['--help', '--unknown'],
  ]) assert.throws(() => parsePlaytestArguments(args), JSON.stringify(args));
});

test('CLI help and invalid arguments create no evidence and start no child process', () => {
  const directory = mkdtempSync(join(tmpdir(), 'af9-playtest-cli-'));
  const evidence = join(directory, 'evidence');
  const attemptedChild = join(directory, 'child-attempted');
  const guard = join(directory, 'guard.mjs');
  // Even if argument handling regresses, a test may never start a real player.
  writeFileSync(guard, `
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
const recordAttempt = fs.writeFileSync;
const forbidden = name => () => {
  recordAttempt(${JSON.stringify(attemptedChild)}, name);
  throw new Error('Test forbids startup side effect: ' + name);
};
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
  childProcess[name] = forbidden(name);
}
// Also contain accidental default evidence writes and direct network startup.
for (const name of ['mkdirSync', 'writeFileSync', 'appendFileSync']) fs[name] = forbidden(name);
globalThis.fetch = forbidden('fetch');
net.Socket.prototype.connect = forbidden('socket connect');
syncBuiltinESMExports();
`);
  try {
    const entry = fileURLToPath(new URL('../src/playtest/run.ts', import.meta.url));
    for (const [args, expectedStatus] of [
      [['--help'], 0], [['-h'], 0], [['--unknown'], 1], [['--seed'], 1],
    ] as const) {
      const child = spawnSync(process.execPath, ['--import', 'tsx', '--import', guard, entry,
        '--evidence-root', evidence, ...args], {
        encoding: 'utf8', timeout: 10_000,
      });
      assert.equal(child.error, undefined);
      assert.equal(child.status, expectedStatus, child.stderr);
      assert.match(child.stdout + child.stderr, /Usage: npm run playtest/);
      assert.equal(existsSync(evidence), false, 'argument inspection must not create a run');
      assert.equal(existsSync(attemptedChild), false, 'argument inspection must not launch a subprocess');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
