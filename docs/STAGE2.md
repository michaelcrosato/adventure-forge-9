# Full small-game candidate

Lowsail sends the player to Red Sluice and receives the result. Four inhabitants have different interests: Ilyra needs clean water and treatment for the fever ward; Nessa wants a shared repair; Tovan wants council control; Bram wants families on high ground.

The game has 11 authored scenes and 44 choices including departures and deaths. Three resolution families have resource-dependent variants. Silverleaf can purge the intake, treat the fever ward, or help an injured evacuee. Scouting changes whether every family can cross without medicine. A borrowed kit can repair the sluice or brace an evacuation landing. Prior clinic preparation can buy an exemption from council rationing.

Mechanical verification: 20 passing tests; 2,429 reachable semantic states and 2,428 legal transitions at seed 1. All scenes and choices are reachable, all transitions preserve nonnegative resources and immutable inputs, and every unfinished state retains a route to a completed resolution. The traversal collapses equivalent mechanical states and does not prove every possible journal ordering or future content vocabulary. This scenario has no random outcome branch. Maximum legal choices: 6. Maximum scene/facts/choice projection: 254 words, excluding the cumulative journal and metadata.

All three main resolution witnesses, save/replay/tamper rejection, public journal persistence, council-detour recovery, and a scouting counterfactual pass. Browser shared-water play completed in ten decisions. Reload resumed the same scene with two journal entries; downloading, starting anew, and loading the save restored the completed scene and all ten entries. “Show all” exposed all ten decisions. A 390px viewport had a 375px document width; no browser errors or framework overlays were observed. The final focus change was separately checked so a new decision brings its scene heading into view. Terminal play completed the same shared-water witness. Local screenshots are under `/tmp/af9-stage2-*.png`.

This is implemented and mechanically checked. Its first fresh blind game/interview is pending. No measured improvement or large-world claim follows from these checks.
