# Browser hosting

Production: https://adventure-forge-9.vercel.app

Vercel project `adventure-forge-9` (`prj_UYbkjlrz9qAedkYG01HJ2d2t9NkY`) is linked to `michaelcrosato/adventure-forge-9`, production branch `main`, in the owner's Vercel team. The hosting implementation is `ba35ead`; its first Git-triggered production deployment is `dpl_4UR6dYYeWb7DSforKULM6bmCcLQc`. It reached Ready in 17 seconds. No paid service, database, API key or gameplay model calls are needed by this deployment.

The project runs Node 22. Vercel installs with `npm ci` and builds with `npm run verify`; a failed check stops that deployment. GitHub has an independent mechanical-verification workflow. Further pushes to `main` automatically build and update the production URL; branch previews do not replace production.

`api/index.ts` serves the browser and engine through the shared player handler. Each hosted request reconstructs a private journey from its checkpoint; server memory is not durable storage. The browser saves a checkpoint after each successful action in localStorage and sends it with the next operation. The engine replays its history and checks the build identity before using it. The visible game projection still excludes internal flags/history. Downloaded saves remain available separately through Save journey.

Progress belongs to the current browser/device. Clearing browser data removes the automatic copy; downloaded files remain yours. A game-content update can invalidate an older build-bound save. The page preserves that older checkpoint and allows downloading it before starting again; automatic migration between changed game rules is not implemented. A documentation-only redeployment should retain compatible checkpoints.

Verification: all 25 tests passed, including fresh-server checkpoint recovery, stateless parsed-body requests, tampering, stale revisions, and payload limits. Vercel's local production build passed. In the public production browser, the ten-action shared-water route completed with the correct receipt and ten-entry journal. Download → new journey → upload restored the completed state. Reload resumed it. At a 390-pixel mobile viewport the document width was 375 pixels, with no browser errors. The download automation initially timed out on an off-screen button; scrolling it into view and retrying succeeded.

A second GitHub push, `ad4d23b42e83f6e85cb414eb5084493bf2ce3a42`, automatically produced Ready production deployment `dpl_7cZWfGTbZyjBw9zGQUYL5gNZ3wjK` and updated the same production alias. The deployment API confirms GitHub source, repository ID `1357689277`, branch `main` and that exact commit. A checkpoint obtained from the first deployment loaded unchanged after the second. This verifies the requested GitHub update flow and compatible-save recovery across a documentation-only deployment.

Account tokens and local Vercel metadata are excluded from Git and uploads. Runtime gameplay has no access to the development subscription player. Use the connected Vercel project or authenticated CLI for deployment inspection; no hosting credentials belong in the repository.

## Archive expansion deployment

Push `ad92740f26a12204a541ad6ce01011116ca4b990` automatically produced Ready production deployment `dpl_J5rMtKvQQ2epAo12YXi1W1Le7Z5w` at `adventure-forge-9-j7e2x6f30-michaelcrosato-1122s-projects.vercel.app`, with the normal production aliases. The API confirms GitHub source, `main`, repository `1357689277` and the exact commit. Build-to-ready time was approximately 46.7 seconds. GitHub verification run `33940570955` also completed successfully; 45 tests and the local Vercel production build passed before publication.

On the public production URL, a 23-action journey selected the canalwright background, shared water, entered the Archive, took protected testimony, called an early hearing, adjourned twice, collected the missing counterseal, and published anonymously. Reloads resumed the Archive hall at revisions 16 and 18. The final receipt and journal both recorded 23 actions. Downloaded save and completed reload passed; the 390-pixel mobile viewport had 375-pixel document width and no browser errors. Inspected screenshot `/tmp/af9-stage5-live-mobile.png`; downloaded checkpoint `/tmp/af9-stage5-live-completed.save`.

The deployed checkpoint build ID is `af9-84718e72a31bb4c9047cd5d0`; the equivalent source-mode test build is `af9-1490bb60e9ff6ad4be06a0aa`. Packaging changes the hashed runtime file layout. These identities are intentionally not silently treated as interchangeable: downloaded hosted saves resume in the compatible hosted build, but cross-runtime source/compiled save transfer is not implemented. Content updates remain build-bound. Browser and CLI use the same authored rules and operations; their deployment identities must still match a save.

The documentation follow-up `c5437ff` also reached Ready (`dpl_4fmTmhQvyRAGqcaHkRGKUbJqAmFV`), with successful GitHub verification run `33940874706`. After that deployment, a POST observation request restored the previous production checkpoint at the completed reckoning, revision 23, and returned the checkpoint byte-for-byte unchanged. This independently checks compatible saves across the latest automatic documentation update.
