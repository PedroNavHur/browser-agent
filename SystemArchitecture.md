# Buscalo System Architecture

## 1. High-Level Overview

Buscalo is a browser-native listings extractor built on a modular stack:

- **Next.js (App Router)** – UI, API routes (`/api/tts`, `/api/transcribe`), client-side audio UX.
- **Convex** – state, live updates, and agent orchestration.
- **Browserbase + Stagehand** – fully automated browser sessions that navigate map/listing UIs.
- **OpenAI** – TTS for agent replies, speech-to-text for voice commands.

![](./docs/architecture/high-level.png) <!-- Placeholder for future diagram -->

## 2. Frontend Flow (Next.js)

```
pages (app/)
└── api/
    ├── tts/route.ts          # POST text → OpenAI Speech → MP3
    └── transcribe/route.ts   # POST audio blob → OpenAI STT

components/
└── ChatWindow.tsx
    ├── ChatMessageList.tsx + AgentSpeechButton.tsx
    └── ChatComposer.tsx + VoiceInputButton.tsx
```

- **ChatWindow** drives the session: submits text/voice to Convex, renders agent replies.
- **VoiceInputButton** records audio (MediaRecorder) → `/api/transcribe` → transcript.
- **AgentSpeechButton** caches agent TTS (MP3) from `/api/tts` for playback.

### Client API Routes
- `POST /api/tts` → `OpenAI audio/speech` (model configurable via `OPENAI_TTS_MODEL`).
- `POST /api/transcribe` → tries `OPENAI_STT_MODEL` → falls back to Whisper (`whisper-1`).

## 3. Convex Architecture

```
convex/
├── agent.ts             # Buscalo agent + sendMessage action
├── schema.ts            # listings, favorites, execLogs, browserbaseSessions
├── sessionPool.ts       # query/mutation helpers for session reuse
└── stagehand/
    ├── extractionWorkflow.ts # orchestrates Stagehand runs
    ├── sessionManager.ts     # pulls/returns session IDs
    ├── stagehandConfig.ts    # Stagehand client factory
    ├── listingNormalization.ts, filteringUtils.ts, imageBackfill.ts
    └── types.ts
```

- `sendMessage` (Convex action) delegates to the Buscalo agent (`@convex-dev/agent`).
- `browserbaseSessions` table tracks reusable Browserbase session IDs.
- `sessionPool.ts` exposes mutations/queries for action-safe pooling operations.
- `extractionWorkflow.ts` handles run lifecycle, retries, logging, normalization, screenshot/save.

### Data Tables
- **listings**: agent results per thread.
- **favorites**: saved user listings.
- **execLogs**: streaming logs for UI activity panel.
- **browserbaseSessions**: `{ sessionId, status, createdAt, lastUsedAt }` for reuse window.

## 4. Stagehand Execution

`performApartmentsExtraction` steps:
1. Acquire a Browserbase session (`sessionManager`).
2. Launch Stagehand (API mode) with optional existing session ID.
3. Apply filters, scroll listings, extract cards, backfill images.
4. Store results (`results` table), artifacts, and logs (Convex).
5. Release session for reuse or discard on failure; retry once.

Normalization utilities (`listingNormalization.ts`, `filteringUtils.ts`) keep the workflow lean and testable.

## 5. Voice & Audio Flow

1. User taps mic → `VoiceInputButton` toggles recording.
2. On stop, audio blob → `/api/transcribe` → OpenAI → transcript.
3. Transcript fed into `sendMessage` action → agent run.
4. Agent reply displayed; user can play MP3 via `AgentSpeechButton` (fetches `/api/tts`).

## 6. Key Integrations

- **Browserbase**: Session pooling reduces cost (≥1 min billing). Sessions tracked via Convex table.
- **OpenAI**: Both TTS and STT endpoints. Configurable via env vars (`OPENAI_API_KEY`, `OPENAI_TTS_MODEL`, `OPENAI_STT_MODEL`).
- **Lucide**: Iconography for UI controls.

## 7. Deployment & Configuration

Environment variables (partial):

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Required for TTS + STT |
| `OPENAI_TTS_MODEL` | Optional speech model override |
| `OPENAI_STT_MODEL` | Optional transcription model override |
| `BROWSERBASE_API_KEY` | Stagehand browser automation |
| `BROWSERBASE_PROJECT_ID` | Browserbase project scope |
| `CONVEX_DEPLOYMENT` | Convex deployment URL |

## 8. Future Improvements

- Add architecture diagrams under `docs/architecture/`.
- Expand session pooling metrics, e.g., mean reuse duration.
- Improve STT fallback policy (e.g., linear PCM conversion if needed).
- Add automated tests for VoiceInputButton (mock MediaRecorder).

## 9. Diagram References (Sketch Templates)

Below are rough textual outlines you can recreate on your iPad:

### 9.1 High-Level Flow
```
[User] -- (voice/text) --> [Next.js UI]
    |                          |
    |          fetch           V
    |--------------------> [/api/transcribe (STT)] --+--> [OpenAI STT]
    |                                               |
    |<----------------------------------------------+
    |
    +--> [/api/tts (TTS)] --> [OpenAI Speech] --> (MP3) --> [Audio Player]

[Next.js UI] --(Convex action)--> [Convex Agent] --> [Stagehand Workflow] --> [Browserbase]
```

### 9.2 Convex + Stagehand Modules
```
[sendMessage action]
   |
   +--> Buscalo Agent
           |
           +--> sessionManager (acquire)
           +--> extractionWorkflow
                   |
                   +--> Stagehand client
                   +--> listingNormalization
                   +--> imageBackfill
                   +--> sessionManager (release)
           +--> sessionPool queries/mutations
```

### 9.3 Browser Session Lifecycle
```
[sessionPool.getAvailableSession]
   |
   V
[browserbaseSessions table]
   |
   +-- if reusable --> markInUse --> Stagehand run --> markAvailable
   +-- else discard --> request new session via Browserbase API --> insertAvailable
```

### 9.4 Audio UX
```
[VoiceInputButton]
   - tap start -> MediaRecorder start -> state: recording
   - tap stop  -> ensure duration -> upload blob -> STT response -> send to agent
[AgentSpeechButton]
   - fetch /api/tts when first tapped -> cache MP3 -> play/pause controls
```
