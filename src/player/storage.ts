import { open, readFile } from "node:fs/promises";
import path from "node:path";
import { restore, save } from "../engine/index.js";

type SaveState = Parameters<typeof save>[0];

export class SavePathError extends Error {
  public readonly code = "unsafe_save_path";

  public constructor(message: string) {
    super(message);
    this.name = "SavePathError";
  }
}

/** Resolve and validate a user supplied CLI save path before opening it. */
export function resolveSavePath(input: string, cwd = process.cwd()): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new SavePathError("A save path is required.");
  }
  if (input.includes("\0")) {
    throw new SavePathError("A save path cannot contain a null byte.");
  }

  const target = path.resolve(cwd, input.trim());
  if (target === path.parse(target).root) {
    throw new SavePathError("A directory is required for a save file.");
  }
  return target;
}

/**
 * Write an opaque save without replacing an existing file.
 * The exclusive create flag also refuses symlinks and protects prior saves.
 */
export async function saveToPath(
  filePath: string,
  state: SaveState,
  cwd = process.cwd(),
): Promise<string> {
  const target = resolveSavePath(filePath, cwd);
  const serialized = save(state);
  const handle = await open(target, "wx", 0o600);
  try {
    await handle.writeFile(serialized, "utf8");
  } finally {
    await handle.close();
  }
  return target;
}

export async function loadFromPath(
  filePath: string,
  cwd = process.cwd(),
): Promise<SaveState> {
  const target = resolveSavePath(filePath, cwd);
  const serialized = await readFile(target, "utf8");
  return restore(serialized);
}
