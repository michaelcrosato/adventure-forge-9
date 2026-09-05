import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { digest } from './evidence.js';
import { validateRecordedRun, validateRun } from './validate.js';

const [command = 'list', path, destination] = process.argv.slice(2);
const defaultRoot = join(homedir(), '.local/share/adventure-forge-9/runs');
if (command === 'list') {
  const root = path ?? defaultRoot;
  const rows = existsSync(root) ? readdirSync(root, { withFileTypes: true }).filter(x => x.isDirectory()).sort((a, b) => a.name < b.name ? -1 : 1).map(entry => {
    const manifest = join(root, entry.name, 'manifest.json');
    if (!existsSync(manifest)) return { run: entry.name, status: 'unsealed_attempt', note: 'Check process; no success claimed' };
    try { const record = JSON.parse(readFileSync(manifest, 'utf8')); return { run: entry.name, status: record.status, details: record.details }; }
    catch { return { run: entry.name, status: 'unreadable_manifest' }; }
  }) : [];
  const completed = rows.filter(x => x.status === 'completed').length;
  console.log(JSON.stringify({ attempted: rows.length, completed, note: 'Counts include all attempts. Completed does not imply validation on the current build.', runs: rows }, null, 2));
} else if (command === 'verify' && path) {
  console.log(JSON.stringify(validateRun(resolve(path)), null, 2));
} else if (command === 'verify-recorded' && path) {
  const trustedRoot = destination ? resolve(destination) : process.cwd();
  console.log(JSON.stringify(validateRecordedRun(resolve(path), trustedRoot), null, 2));
} else if (command === 'export' && path && destination) {
  const source = resolve(path);
  const target = resolve(destination);
  const validation = validateRun(source);
  if (existsSync(target) || existsSync(target + '.sha256')) throw new Error('Export destination already exists');
  mkdirSync(dirname(target), { recursive: true });
  execFileSync('tar', ['-czf', target, '-C', dirname(source), '--', basename(source)]);
  writeFileSync(target + '.sha256', `${digest(readFileSync(target))}  ${basename(target)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ export: target, checksum: target + '.sha256', validation }, null, 2));
} else {
  console.error('Usage: npm run evidence -- list [root] | verify <run-directory> | verify-recorded <run-directory> [trusted-checkout] | export <run-directory> <archive.tar.gz>');
  process.exitCode = 1;
}
