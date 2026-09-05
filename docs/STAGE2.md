# Full small-game candidate

Lowsail sends the player to Red Sluice and receives the result. Four inhabitants have different interests: Ilyra needs clean water and treatment for the fever ward; Nessa wants a shared repair; Tovan wants council control; Bram wants families on high ground.

The game has 11 authored scenes and 44 choices including departures and deaths. Three resolution families have resource-dependent variants. Silverleaf can purge the intake, treat the fever ward, or help an injured evacuee. Scouting changes whether every family can cross without medicine. A borrowed kit can repair the sluice or brace an evacuation landing. Prior clinic preparation can buy an exemption from council rationing.

Mechanical verification: 20 passing tests; 2,429 reachable semantic states and 2,428 legal transitions at seed 1. All scenes and choices are reachable, all transitions preserve nonnegative resources and immutable inputs, and every unfinished state retains a route to a completed resolution. The traversal collapses equivalent mechanical states and does not prove every possible journal ordering or future content vocabulary. This scenario has no random outcome branch. Maximum legal choices: 6. Maximum scene/facts/choice projection: 254 words, excluding the cumulative journal and metadata.

All three main resolution witnesses, save/replay/tamper rejection, public journal persistence, council-detour recovery, and a scouting counterfactual pass. Browser shared-water play completed in ten decisions. Reload resumed the same scene with two journal entries; downloading, starting anew, and loading the save restored the completed scene and all ten entries. “Show all” exposed all ten decisions. A 390px viewport had a 375px document width; no browser errors or framework overlays were observed. The final focus change was separately checked so a new decision brings its scene heading into view. Terminal play completed the same shared-water witness. Local screenshots are under `/tmp/af9-stage2-*.png`.

The first fresh blind game/interview passed on commit `0cd0f52`: run `2026-09-05T01-10-01-388Z-64fb9fe6`, build `af9-ba60fc2350d4a7b8a4486f39`, source identity `50228bdd1423a0f1baea312a6e5cf717ba0315797f74ce17ca4d9115b17a0ce1`. It completed the ten-action shared-water route and its same-session interview; integrity and replay passed. Clarity 5/5, enjoyment 5/5, no defects reported, stated willingness to replay. The player reported slight ambiguity in the canal/scouting supply tradeoff. Elapsed runner time was 50.284 seconds. One attempted Stage 2 game, one accepted. [GitHub CI passed](https://github.com/michaelcrosato/adventure-forge-9/actions/runs/33935325427).

Original free-form interview:

> 1. I was trying to restore Lowsail’s water and keep my promise to the clinic.
> 2. Repairing and sharing the flow mattered most because it helped the whole town rather than giving control to the council.
> 3. I was not unable to proceed. The canal choice was slightly ambiguous because scouting helped evacuation but used the supply needed for repairs.
> 4. The best moment was delivering clean water and medicine to the fever ward.
> 5. The worst moment was crossing the washout without scouts and accepting extra risk.
> 6. I would start another run to explore the council-control and evacuation outcomes.

The original structured confusion field was: “The canal-road choice had a slightly ambiguous tradeoff between scouting for evacuation and preserving the supply needed for repair.” Source and original events/interview are preserved outside the repository. Export: `~/.local/share/adventure-forge-9/exports/stage2-first-blind.tar.gz` plus its SHA-256 sidecar. This single experience supports accepting the small-game milestone; it does not establish measured improvement or large-world breadth.
