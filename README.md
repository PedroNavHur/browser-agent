# Buscalo — Browser Agent MVP

Voice-optional, browser-native agent that navigates JS-heavy real-estate listings, applies filters, captures screenshots, and exports structured results. Built with **Next.js**, **DaisyUI**, **Convex**, **Browserbase Stagehand**, and **@convex-dev/agents**.

## 1. Prerequisites

- **Node.js 20+** and **pnpm** (preferred) or npm/yarn/bun
- **Convex CLI** (`npm install -g convex`) with access to a Convex deployment
- Browserbase access with Stagehand enabled (API key + project id)
- OpenAI (or compatible) API key for Stagehand actions

## 2. Environment Variables

Create a `.env.local` for local development and configure the same variables in your deployment platform (e.g., Vercel project settings).

| Variable | Required | Description | Scope |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | ✅ | Convex deployment URL (from `npx convex dev` or dashboard). | Client + Server |
| `CONVEX_DEPLOYMENT` | ✅ | Convex deployment name (e.g., `prod`, `dev`). Used by Convex CLI/actions. | Server |
| `BROWSERBASE_API_KEY` | ✅ | Browserbase API key with Stagehand access. | Server |
| `BROWSERBASE_PROJECT_ID` | ✅ | Browserbase project id to associate sessions. | Server |
| `OPENAI_API_KEY` | ✅ | Used by Stagehand for LLM-powered actions/extraction. | Server |

Optional / planned extras:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_STAGEHAND_DEMO_MODE` | Feature flag for demo/fallback flows (boolean string). |
| `BROWSERBASE_REGION` | Override default Browserbase region if needed. |

> **Tip:** Never commit `.env.local` — it’s already in `.gitignore`.

## 3. Local Development

1. Install dependencies
   ```bash
   pnpm install
   ```
2. Start Convex in another terminal (generates types and runs local backend)
   ```bash
   npx convex dev
   ```
3. Start the Next.js app (Turbopack)
   ```bash
   pnpm dev
   ```
4. Visit [http://localhost:3000](http://localhost:3000) and chat with Buscalo. Without Convex configured you’ll see a warning banner.

## 4. Deployment (Vercel + Convex)

1. **Push the repository** to GitHub/GitLab.
2. **Deploy Convex backend**
   ```bash
   convex deploy
   ```
   Grab the deployment details (`CONVEX_DEPLOYMENT`, production URL).
3. **Create a Vercel project** from the repo.
4. **Set environment variables** in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `CONVEX_DEPLOYMENT`
   - `BROWSERBASE_API_KEY`
   - `BROWSERBASE_PROJECT_ID`
   - `OPENAI_API_KEY`
5. **Redeploy** (or trigger Deploy Hook). Vercel will rebuild using the new env vars.
6. **Confirm Browserbase access**: ensure the API key/project id can create Stagehand sessions.

## 5. Testing & Linting

- Format and lint with Biome (generated code ignored):
  ```bash
  pnpm format
  pnpm lint
  ```
- Add application-specific tests as extraction flows mature.

## 6. Next Milestones

- Replace the mock Convex `sendMessage` action with real job orchestration.
- Stream job status, screenshots, and listing exports into the chat UI.
- Harden Browserbase workflows (retries, fallbacks, demo map).

---

_Read `AGENTS.md` for a detailed architecture and roadmap._
