# Browser hosting

Production: https://adventure-forge-9.vercel.app

Vercel project `adventure-forge-9` (`prj_UYbkjlrz9qAedkYG01HJ2d2t9NkY`) is linked to `michaelcrosato/adventure-forge-9`, production branch `main`, in the owner's Vercel team. The hosting implementation is `ba35ead`; its first Git-triggered production deployment is `dpl_4UR6dYYeWb7DSforKULM6bmCcLQc`. It reached Ready in 17 seconds. No paid service, database, API key or gameplay model calls are needed by this deployment.

The project runs Node 22. Vercel installs with `npm ci` and builds with `npm run verify`; a failed check stops that deployment. GitHub has an independent mechanical-verification workflow. Further pushes to `main` automatically build and update the production URL; branch previews do not replace production.

`api/index.ts` serves the browser and engine through the shared player handler. Each hosted request reconstructs a private journey from its checkpoint; server memory is not durable storage. The browser saves a checkpoint after each successful action in localStorage and sends it with the next operation. The engine replays its history and checks the build identity before using it. The visible game projection still excludes internal flags/history. Downloaded saves remain available separately through Save journey.

Progress belongs to the current browser/device. Clearing browser data removes the automatic copy; downloaded files remain yours. A game-content update can invalidate an older build-bound save. The page preserves that older checkpoint and allows downloading it before starting again; automatic migration between changed game rules is not implemented. A documentation-only redeployment should retain compatible checkpoints.

Verification before publication: all 25 tests passed, including fresh-server checkpoint recovery, stateless parsed-body requests, tampering, stale revisions, and payload limits. Local browser start/action/reload resumed the correct scene and journal without durable server state. Vercel's local production build passed. Live browser completion and repeat-push verification are being recorded in the next update to this document.

Account tokens and local Vercel metadata are excluded from Git and uploads. Runtime gameplay has no access to the development subscription player. Use the connected Vercel project or authenticated CLI for deployment inspection; no hosting credentials belong in the repository.
