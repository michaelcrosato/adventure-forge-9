# Adventure Forge 9

A deterministic text RPG in one persistent world, built through authored stories, blind subscription playtests, and honest player interviews.

The full target is the exploration breadth of Skyrim and the local choice depth of Baldur's Gate 3. The current game is a small Lowsail–Red Sluice expedition: repair and share the water, accept council control, or evacuate the market. Preparation, medicine, supplies and obligations change the return. It is not yet a large world.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run verify
npm run play
```

For the browser:

```sh
npm run dev
```

Open `http://127.0.0.1:3009`. Browser and terminal use the same legal choices and deterministic engine. The engine handles endings, resources, and remembered consequences.

## Subscription playtesting

The default model is `gpt-5.6-luna` with maximum reasoning. The adapter uses Codex's supported managed ChatGPT sign-in, never an extracted token or an API-key fallback. Live acceptance requires the effective player-only boundary to be verified; setup instructions and current capability evidence are maintained in `docs/SUBSCRIPTION.md`.

```sh
npm run probe
npm run playtest -- --seed 1
npm run evidence -- list
npm run evidence -- verify /absolute/path/to/run
npm run evidence -- export /absolute/path/to/run /absolute/path/to/run.tar.gz
```

Evidence lives under `~/.local/share/adventure-forge-9/runs`, outside the source tree. Each attempt preserves a source snapshot, original observations and responses, actions, exit status, and interviews. Failed attempts stay visible. An append-only event chain and file hashes detect local changes; they do not attest remote model weights.

Mechanical verification never calls a model. A passing mechanical check is separate from a live test, and a live test alone is separate from evidence of improvement.

For an older build, follow [the trusted-checkout replay procedure](docs/REPLAY.md). Archived source is never automatically executed.

## Project records

- [Initial plan](INITIAL_PLAN.md): consolidated scope, architecture, acceptance, and expansion sequence.
- [Current status](docs/STATUS.md): evidence and next executable work.
- [Agent benchmark](docs/AGENT_BENCHMARK.md): Luna/max as the first development baseline.
- Original briefs: preserved in Git commit `15ada58`, removed from the active tree.

The subscription pipeline has an accepted live game/interview. The town expedition is undergoing live testing, followed by two feedback-led improvement cycles and authored world expansion. The full scale and depth goal stays active throughout.
