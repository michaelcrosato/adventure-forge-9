# AdventureForge: System Architecture & Execution Plan
**The Unbounded Action Engine — Skyrim Scale, Baldur's Gate 3 Depth**

## 1. Executive Summary & Thesis
AdventureForge is an action-first, deeply reactive open-world RPG powered by an autonomous, self-optimizing multi-agent development engine. 
* **The Physics Invariant:** The authoritative game runtime is 100% deterministic pure code without runtime LLM interference (`step(state, action, seed_cursor) -> state'`). 
* **The Content Engine:** Offline AI subagents act as authors, crawlers, blind playtesters, and remediation engineers to continuously generate, verify, and refine an expansive world graph.
* **The Play Experience:** High-velocity, Hemingway-baseline action prose (1–3 punchy sentences), unbounded scene possibility spaces (dynamic affordance queries supporting 2 to 200+ actions without arbitrary caps), deep multi-axis character customization, and persistent, stateful world memory.

---

## 2. Core Architecture & Invariants

```
+-----------------------------------------------------------------------------------+
|                               ADVENTUREFORGE SYSTEM                               |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                   AUTHORITATIVE DETERMINISTIC KERNEL                        |  |
|  |  - Pure State Machine: step(state, action, seed_cursor) -> (state', events) |  |
|  |  - Closed Condition & Effect DSL (Zero runtime LLM hallucination)          |  |
|  |  - Canonical State Hash & Replay Fingerprint Verification                   |  |
|  |  - Affordance Synthesizer: Base U Inventory U Trait U Environment           |  |
|  +-----------------------------------------------------------------------------+  |
|                                         ^                                         |
|                                         | Legal Actions / Observers               |
|                                         v                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                         WORLD GRAPH & TOPOLOGY                              |  |
|  |  - Provinces -> Hubs -> Points of Interest (POIs) -> Scene Nodes            |  |
|  |  - Single Contiguous Namespace (No instanced throwaways)                    |  |
|  |  - Persistent World Flags, NPC Stances, Faction Matrices, Regional Memory   |  |
|  +-----------------------------------------------------------------------------+  |
|                                         ^                                         |
|                                         | Validated Data                          |
|                                         v                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                         MECHANICAL VERIFICATION BAR                         |  |
|  |  - I1: Pure Determinism Replay Suite                                        |  |
|  |  - I4: Counterfactual Character Sheet Witness Divergence Proofs             |  |
|  |  - G2: Plain-Speech & Hemingway Linter (Max 18 words/sentence, Grade 6-8)   |  |
|  |  - G6: Large Choice Scaling Test (100+ legal actions in single scene)       |  |
|  |  - Non-LLM Reachability Crawler & Deadlock Solver (BFS/DFS)                 |  |
|  +-----------------------------------------------------------------------------+  |
|                                         ^                                         |
|                                         | Governs & Audits                        |
|                                         v                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                      AUTONOMOUS ORCHESTRATOR & FLYWHEEL                     |  |
|  |  - Manager Agent (Technical Director, Quality Arbiter, Workflow Mutator)   |  |
|  |  - Cost-Efficient Subagent Fleet (Primary benchmark: Gemini Flash)         |  |
|  |  - Blind Playtester Personas (Speedrunner, Brute, Infiltrator, Scholar)     |  |
|  |  - Closed-Loop Remediation & Automated Issue Triage                         |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 2.1 The Hard Invariants
1. **I1. Deterministic Authority:** Given identical build ID, initial character sheet, explicit seed cursor, and canonical action stream, execution yields bit-for-bit identical state hashes and event receipts.
2. **I2. Content is Data; Rules are Code:** World, dialogue trees, combat rules, items, and affordances are declarative data validated by schemas. Rules are immutable engine transitions.
3. **I3. Engine-Enumerated Legal Actions:** The engine enumerates every valid verb at state $S$. Surfaces (CLI, Web, MCP) render these choices. Choosing an action is the only mechanism that advances game state.
4. **I4. Claims are Proofs:** Every shipped quest, area, and counterfactual branch has a checked witness trace replayable via mechanical validator.
5. **I5. Mechanical Verification Bar:** `python -m adventure_forge.verify` executes headless without external API or LLM dependencies.
6. **I6. Information Firewall:** Playtesters interface strictly via the player observation contract (`id`, `observation`, `actions`, `status`). They have zero access to source files, hidden flags, or solution traces.
7. **I7. Non-LLM Mechanical Driver:** Loop execution and commits are governed by reproducible scripts and objective gate results.
8. **I8. Bounded Observation Budget:** Text observations are concise and structured; large action spaces are grouped, categorized, or paged without truncation.

---

## 3. Game Design Specifications

### 3.1 Deep Character Customization (G1 / G3)
Characters possess a composite trait vector spanning at least six orthogonal axes:
- **Ancestry:** Origins with biological/cultural predispositions (e.g. Ashenborn, Deep-Dweller, High-Kin, Plainsman).
- **Background:** Social trade and starting history (e.g. Outcast Scribe, Mercenary Veteran, Cutpurse, Hedge Alchemist).
- **Attributes & Skills:** Quantitative proficiencies (Strength, Agility, Endurance, Cunning, Arcana, Intimidation).
- **Innate Traits:** Defining behavioral traits (e.g. Night-Eyed, Pyromaniac, Iron-Gutted, Skeptical).
- **Flaws & Vulnerabilities:** Mechanical and social debuffs (e.g. Marked Outlaw, Hemophobic, Missing Eye, Oath-Bound).
- **Social Stance & Reputation:** Granular standing with factions, regions, and guilds.

### 3.2 High-Velocity Action Prose (G2 / G5)
- **Hemingway Baseline:** 1 to 3 short sentences per room or event description.
- **Linter Enforced:** Sentences capped at 18 words, active voice preferred, grade 6–8 Flesch-Kincaid reading level.
- **Action-to-Text Dominance:** Available actions and environmental affordances dominate the player screen. UI action labels are 1 to 3 words (`[Kick brazier]`, `[Pick grate]`, `[Bribe sentry]`).

### 3.3 Single Continuous World Topology (G3 / G4)
- **Scale:** Architecture targeting 500+ interconnected nodes across multiple provinces, major hubs, and micro-dungeon POIs (each containing 10–30 interconnected nodes).
- **5 Region-Defining Unique Mechanics:**
  1. *The Iron Crags:* Verticality, climbing gear, ledge collapses, and fall hazards.
  2. *The Lower Warrens:* Social stealth, disguise kits, faction markers, and curfew enforcement.
  3. *The Scorchwaste:* Ambient heat, hydration, survival crafting, and dynamic shade.
  4. *The High Court of Veras:* Legal evidence, testimony contradictions, and social decorum.
  5. *The Sunken Hollows:* Water buoyancy, diving depth, torch preservation, and eldritch resonance.
- **Unbounded Scene Affordances (G6):** Scene choices are dynamically computed from environmental entities, inventory items, and character abilities, supporting 2 to 200+ valid actions.

---

## 4. Repository & Directory Structure

```
adventure-forge-7/
├── pyproject.toml                     # Package definition and dependencies
├── README.md                          # Project overview and instructions
├── INITIAL_PLAN.md                    # This architecture and execution plan
├── archive/                           # Archived original specification documents
│   ├── g38.txt
│   ├── c56adventure-forge-thesis-design-brief.md
│   ├── m20260903.txt
│   └── x46ADVENTURE_KERNEL_DESIGN_BRIEF.md
├── adventure_forge/
│   ├── __init__.py
│   ├── core/                          # Pure deterministic game engine
│   │   ├── __init__.py
│   │   ├── engine.py                  # step(state, action, seed_cursor) -> state'
│   │   ├── state.py                   # Immutable GameState, Character, WorldState
│   │   ├── character.py               # 6-axis character data model & traits
│   │   ├── actions.py                 # Action definition, synthesis, validation
│   │   ├── conditions.py              # Condition DSL evaluator
│   │   ├── effects.py                 # Effect DSL evaluator
│   │   └── rng.py                     # Deterministic PRNG seed cursor
│   ├── content/                       # Declarative world data
│   │   ├── __init__.py
│   │   ├── schema.py                  # Content schemas
│   │   ├── loader.py                  # Validating loader for regions & scenes
│   │   └── data/                      # Shipped provinces, POIs, and scenes
│   ├── linter/                        # Prose & Style Guide Linter (G2)
│   │   ├── __init__.py
│   │   └── prose_linter.py            # Sentence length, readability, active voice
│   ├── verification/                  # Mechanical verification suite (I1-I8)
│   │   ├── __init__.py
│   │   ├── verify.py                  # CLI entry point: python -m adventure_forge.verify
│   │   ├── determinism.py             # Trace replayer and fingerprint matcher
│   │   ├── crawler.py                 # Non-LLM BFS/DFS reachability and softlock solver
│   │   ├── counterfactual.py          # Character divergence witness runner
│   │   └── stress.py                  # 100+ action scene scalability verifier
│   ├── player/                        # Player interfaces (I6 Firewall)
│   │   ├── __init__.py
│   │   ├── cli.py                     # Interactive terminal player (plain speech)
│   │   └── mcp_server.py              # Standardized MCP player surface for AI agents
│   └── flywheel/                      # Autonomous Flywheel & Self-Healing Loop
│       ├── __init__.py
│       ├── orchestrator.py            # Manager orchestration logic & task assigner
│       ├── playtester.py              # Blind playtester fleet (divergent personas)
│       ├── triage.py                  # Automated defect reproducer & issue creator
│       └── loop.py                    # Autonomous cycle runner (zu-loop / flywheel)
└── tests/                             # Pytest suite mirror
    ├── test_determinism.py
    ├── test_character_reactivity.py
    ├── test_prose_linter.py
    ├── test_crawler_reachability.py
    └── test_choice_unboundedness.py
```

---

## 5. Execution Roadmap

### Phase 1: Core Engine & Verification Baseline
1. Initialize package configuration (`pyproject.toml`) and environment setup.
2. Build pure deterministic engine (`core/`):
   - Immutable state models with state hashing (SHA-256 canonical fingerprints).
   - Linear congruent / Xoroshiro deterministic PRNG cursor.
   - Closed condition & effect DSL.
   - Dynamic affordance synthesis (combining room verbs, items, traits, systemics).
3. Build Prose Linter (`linter/prose_linter.py`):
   - Automated checks for max 18 words/sentence, grade 6-8 reading score, punchy active voice.
4. Build Verification Bar (`verification/verify.py`):
   - Mechanical test runner executing determinism checks, witness replays, and crawler proofs.
5. Create First Shipped Regions & Counterfactual Witness:
   - Iron Crags (Verticality) and Lower Warrens (Social stealth).
   - Witness pair proving that two distinct character sheets receive different actions and dialogue in the same node.
   - Stress test scene with 100+ legal actions without truncation.
6. Commit, test, and push to GitHub.

### Phase 2: Autonomous Flywheel & Blind Playtester Fleet
1. Implement the Player Surface (`player/cli.py` and `player/mcp_server.py`) enforcing the I6 information firewall.
2. Build the Autonomous Flywheel (`flywheel/`):
   - Persona-driven blind playtester bots (Speedrunner, Brute, Saboteur, Infiltrator).
   - Automated session logger, trace recorder, and reproducer.
   - Self-audit and loop optimization script (`zu-loop` / `tools/flywheel.py`).
3. Deploy cost-efficient subagent delegation (Gemini Flash as primary benchmark for speed and high iteration velocity).
4. Run 10+ unattended flywheel cycles, proving continuous discovery, remediation, and verification.

### Phase 3: World Expansion (Skyrim Geographic Breadth & BG3 Systemic Depth)
1. Author additional regions with distinct mechanics:
   - Scorchwaste (Heat & Survival Crafting).
   - High Court of Veras (Evidence & Legal Debate).
   - Sunken Hollows (Water Buoyancy & Eldritch Resonance).
2. Expand to 500+ interconnected locations with hierarchical Province -> Hub -> POI structure.
3. Verify global graph reachability, determinism, and zero-softlock invariants across all character classes.
4. Finalize contest deliverables and submission reports.
