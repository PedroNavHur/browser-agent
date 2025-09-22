# Handoff Notes

The repository currently includes restructuring work for the Convex agent that may be reverted,
so please double-check the git history before proceeding. Here’s the snapshot of key changes and
areas of interest:

## 1. Branch Status
- `git status`: working tree is dirty. Agent-related files were reorganized but may need reverting
  (see `convex/agent/` folder and re-export stubs in `convex/agent*.ts`).
- `_generated/api.d.ts` still references interim import paths from the refactor; if reverting, run
  `npx convex dev` to regenerate.

## 2. Core Functionality
- **Next.js** UI with landing page (`src/app/page.tsx`) and studio (`/studio/page.tsx`).
- **Voice flow**: `/api/transcribe` (OpenAI Whisper fallback) and `VoiceInputButton` handling toggled
  recording → transcription; `AgentSpeechButton` uses `/api/tts` for TTS.
- **Agent orchestration**: `convex/agent/index.ts` (formerly `agent.ts`) defines Buscalo agent with
  instructions about feature limits and location clarification.
- **Session pooling**: `browserbaseSessions` table + helper functions in `sessionPool.ts` and
  stagehand workflow to reuse Browserbase sessions.

## 3. Known Issues / TODOs
- Image domains: `next.config.ts` enumerates `images{1..10}.apartments.com` etc. Works for typical
  apartments.com assets.
- Diagrams pending: placeholders in `SystemArchitecture.md` and textual references for your tablet
  sketches.
- The attempted agent folder restructure may need cleanup or revert. Check the git diff before
  continuing development.

## 4. Helpful Commands
- `pnpm run typecheck`
- `npx convex dev` (regenerate `_generated` files if structure changes)
- `pnpm dev` for Next.js development server.

## 5. Notable Files After Restructure
- `convex/agent/index.ts` – main agent definition & `sendMessage` action.
- `convex/agent/tools.ts`, `agent/utils.ts`, `agent/types.ts`, `agent/logging.ts` – split to
  modularize the agent helpers.
- Root re-export proxies: `convex/agent.ts`, `agentTools.ts`, etc. to preserve existing imports.

If the refactor is undesirable, revert the above files and delete `convex/agent/` to return to the
previous layout. Ensure `_generated/api.d.ts` is regenerated to avoid stale references.
