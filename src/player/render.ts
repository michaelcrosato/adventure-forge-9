import type { Observation } from "../engine/index.js";

/**
 * Copy the public projection field by field.
 *
 * Keeping this boundary in one place makes it difficult for an adapter to
 * accidentally serialize the engine's private state when the engine grows.
 */
export function publicObservation(observation: Observation): Observation {
  const receipt = observation.receipt
    ? {
        kind: observation.receipt.kind,
        summary: observation.receipt.summary,
        revision: observation.receipt.revision,
        stateHash: observation.receipt.stateHash,
      }
    : undefined;

  return {
    revision: observation.revision,
    sceneId: observation.sceneId,
    title: observation.title,
    text: [...observation.text],
    facts: [...observation.facts],
    journal: observation.journal.map(entry => ({ choice: entry.choice, from: entry.from, to: entry.to })),
    resources: { ...observation.resources },
    choices: observation.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      description: choice.description,
    })),
    status: observation.status,
    ...(receipt === undefined ? {} : { receipt }),
  };
}

function labelResource(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusLabel(status: Observation["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Format an observation for a plain terminal without exposing engine state. */
export function renderTerminalObservation(observation: Observation): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(observation.title);
  lines.push("─".repeat(Math.max(24, Math.min(72, observation.title.length + 12))));

  for (const paragraph of observation.text) {
    lines.push(paragraph);
    lines.push("");
  }

  if (observation.facts.length > 0) {
    lines.push("Known:");
    for (const fact of observation.facts) {
      lines.push(`  • ${fact}`);
    }
    lines.push("");
  }

  const resources = Object.entries(observation.resources);
  if (resources.length > 0) {
    lines.push(
      `Resources: ${resources
        .map(([name, value]) => `${labelResource(name)} ${value}`)
        .join("  ·  ")}`,
    );
    lines.push("");
  }

  if (observation.journal.length > 0) {
    lines.push('Recent decisions (use :journal for all):');
    for (const entry of observation.journal.slice(-3)) lines.push(`  • ${entry.choice} → ${entry.to}`);
    lines.push('');
  }

  lines.push(`Status: ${statusLabel(observation.status)}  ·  Decisions: ${observation.journal.length}`);

  if (observation.receipt) {
    lines.push(`Receipt: ${observation.receipt.summary}`);
    lines.push("");
  }

  if (observation.status === "playing" && observation.choices.length > 0) {
    lines.push("Choices:");
    observation.choices.forEach((choice, index) => {
      lines.push(`  ${index + 1}. ${choice.label} (${choice.id})`);
      lines.push(`     ${choice.description}`);
    });
  } else if (observation.status === "playing") {
    lines.push("No choices are available. Use :quit to leave the journey.");
  }

  return lines.join("\n");
}
