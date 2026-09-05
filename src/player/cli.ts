import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { choose, end, observe, start } from "../engine/index.js";
import type { Observation } from "../engine/index.js";
import { loadFromPath, saveToPath } from "./storage.js";
import { renderTerminalObservation } from "./render.js";

type PlayerState = ReturnType<typeof start>;

export interface CliOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  seed?: number;
  initialState?: PlayerState;
  saveCwd?: string;
}

function write(output: NodeJS.WritableStream, message: string): void {
  output.write(message);
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "The operation could not be completed.";
}

function choiceIdForInput(line: string, observation: Observation): string | undefined {
  const input = line.trim();
  if (/^\d+$/.test(input)) {
    const index = Number(input) - 1;
    return observation.choices[index]?.id;
  }
  return observation.choices.find((choice) => choice.id === input)?.id;
}

async function finish(
  state: PlayerState,
  expectedRevision: number,
  output: NodeJS.WritableStream,
): Promise<PlayerState> {
  try {
    const finished = end(state, expectedRevision);
    write(output, `${renderTerminalObservation(observe(finished))}\n`);
    return finished;
  } catch {
    write(output, "\nUnable to end this crossing because the view is out of date.\n");
    return state;
  }
}

/** Run the human terminal adapter. EOF is treated as a deliberate departure. */
export async function runCli(options: CliOptions = {}): Promise<PlayerState> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  let state = options.initialState ?? start(options.seed ?? 1);
  let observation = observe(state);
  let leftThroughCommand = false;

  write(output, "\nTHE SPLIT TIDE · A Veyra Basin crossing\n");
  write(output, `${renderTerminalObservation(observation)}\n`);

  const readline = createInterface({ input, output });
  try {
    for await (const rawLine of readline) {
      const line = rawLine.trim();

      if (line === ":quit") {
        if (observation.status === "playing") {
          state = await finish(state, observation.revision, output);
        }
        leftThroughCommand = true;
        break;
      }

      const saveMatch = /^:save(?:\s+(.+))?$/i.exec(line);
      if (saveMatch) {
        const target = saveMatch[1]?.trim();
        if (!target) {
          write(output, "Save where? Use :save path/to/crossing.save\n");
          continue;
        }
        try {
          const savedAt = await saveToPath(target, state, options.saveCwd);
          write(output, `Save written to ${savedAt}. Existing files are never overwritten.\n`);
        } catch (error) {
          write(output, `Save refused: ${safeErrorMessage(error)}\n`);
        }
        continue;
      }

      const loadMatch = /^:load(?:\s+(.+))?$/i.exec(line);
      if (loadMatch) {
        const target = loadMatch[1]?.trim();
        if (!target) {
          write(output, "Load what? Use :load path/to/crossing.save\n");
          continue;
        }
        try {
          state = await loadFromPath(target, options.saveCwd);
          observation = observe(state);
          write(output, `${renderTerminalObservation(observation)}\n`);
        } catch (error) {
          write(output, `Load refused: ${safeErrorMessage(error)}\n`);
        }
        continue;
      }

      if (observation.status !== "playing") {
        write(output, "This crossing has ended. Use :load or start a new game.\n");
        continue;
      }

      const id = choiceIdForInput(line, observation);
      if (!id) {
        write(output, "Choose a listed number or choice ID. Commands: :save, :load, :quit\n");
        continue;
      }

      try {
        state = choose(state, id, observation.revision);
        observation = observe(state);
        write(output, `${renderTerminalObservation(observation)}\n`);
        if (observation.status !== "playing") {
          leftThroughCommand = true;
          break;
        }
      } catch {
        write(output, "That choice is no longer available. Choose one of the listed options.\n");
        observation = observe(state);
        write(output, `${renderTerminalObservation(observation)}\n`);
      }
    }
  } finally {
    readline.close();
  }

  if (!leftThroughCommand && observation.status === "playing") {
    state = await finish(state, observation.revision, output);
  }

  return state;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && pathToFileURL(entry).href === import.meta.url);
}

if (isMainModule()) {
  runCli().catch((error: unknown) => {
    process.stderr.write(`Unable to start the crossing: ${safeErrorMessage(error)}\n`);
    process.exitCode = 1;
  });
}
