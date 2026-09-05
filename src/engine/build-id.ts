import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

function findProjectRoot(start: string): string {
  let current = start;
  while (true) {
    if (existsSync(join(current, "package-lock.json")) || existsSync(join(current, "package.json"))) return current;
    const parent = dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

function filesIn(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesIn(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Build identity is derived in Node from the authored source snapshot and
 * dependency lockfile. The server and terminal import the same value, while
 * saves remain bound to the exact behavior that produced them.
 */
export function createBuildId(): string {
  const sourceDirectory = dirname(fileURLToPath(import.meta.url));
  const root = findProjectRoot(sourceDirectory);
  const sourceEngineDirectory = join(root, "src", "engine");
  const sourceContentDirectory = join(root, "src", "content");
  const compiledEngineDirectory = join(root, "dist", "src", "engine");
  const compiledContentDirectory = join(root, "dist", "src", "content");
  const runningCompiled = sourceDirectory === compiledEngineDirectory;
  const runtimeMode = runningCompiled ? "dist" : "source";
  const tracked = [
    join(root, "package.json"),
    join(root, "package-lock.json"),
    join(root, "tsconfig.json"),
    ...filesIn(sourceEngineDirectory),
    ...filesIn(sourceContentDirectory),
    ...(runningCompiled ? [...filesIn(compiledEngineDirectory), ...filesIn(compiledContentDirectory)] : []),
  ]
    .filter((path) => existsSync(path) && statSync(path).isFile())
    .sort((left, right) => codePointCompare(relative(root, left), relative(root, right)));
  const digest = createHash("sha256");
  digest.update(`runtime-mode:${runtimeMode}`);
  digest.update("\0");
  for (const path of tracked) {
    digest.update(relative(root, path));
    digest.update("\0");
    digest.update(readFileSync(path));
    digest.update("\0");
  }
  return `af9-${digest.digest("hex").slice(0, 24)}`;
}

export const BUILD_ID = createBuildId();
