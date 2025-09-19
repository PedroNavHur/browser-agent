# AGENT.md — Buscalo (Maps & Listings Extractor)

> Voice-optional, browser-native agent that navigates JS‑heavy map/listing UIs, applies filters, loads items with infinite scroll, extracts structured listings, and returns screenshots + CSV/JSON. Built with **Next.js (Vercel) + Convex + Browserbase Stagehand + @convex-dev/agents**.

---

## 0) One‑liner & Demo Script

**One‑liner:** *“Habla y obtén listings reales de mapas web: filtra, explora, extrae y exporta.”*

**Hero demo:**

* User: “Find rentals in **Jersey City** under **\$2,000**, **studios only**, **pets allowed**. Export **100 listings** and show a heatmap.”
* Agent: Opens listings site → sets filters → scrolls to load results → extracts cards (title/price/beds/address/url/image\[lat/lng if possible]) → screenshots key steps → returns table + map heat overlay + CSV/JSON.

---

## 1) Architecture (high level)

```
[ Next.js (Vercel) ]
  UI: form (city, max price, beds, pets), live status panel, screenshots strip,
      results table, heat overlay, CSV/JSON download
      ↕ (Convex client: live queries)
[ Convex (DB + @convex-dev/agents) ]
  Tables: sessions, jobs, results, artifacts, execLogs
  Agent: MapExtractAgent (orchestrates Browserbase + Stagehand)
      ↕ (Browserbase session, Stagehand actions)
[ Browserbase + Stagehand (Playwright) ]
  Real browser automation: navigate, filter, pan/scroll, extract, screenshot
```

**Hard requirements satisfied:** Next.js on Vercel, Convex (state + agents), Browserbase Stagehand (execution), @convex-dev/agents (orchestration).

---

## 2) MVP Scope

* **Target:** one mainstream listings site with map+list UI (read‑only). Keep a **demo map app** as fallback.
* **Inputs:** city/area, max price, beds (studio/1/2…), pets (bool), limit (e.g., 100).
* **Actions:** navigate → set filters → pan/zoom → infinite scroll → extract grid → screenshots.
* **Outputs:** structured listings JSON + CSV; screenshots (before filters, after filters, after load, 1 detail page); heat overlay (if lat/lng available).
* **Guardrails:** no logins, no account creation, no checkout. Respect robots/use. Rate‑limit self.

---

## 3) Data Contracts

```ts
// core listing (normalized)
export type Listing = {
  site: "apartments" | "zillow" | "demo";
  title: string;
  priceRaw: string;        // e.g., "$1,895/mo"
  price?: number;          // 1895 (USD per month)
  beds?: number;           // 0 for studio
  baths?: number;
  address?: string;
  lat?: number;
  lng?: number;
  url: string;
  image?: string;
  tags?: string[];         // e.g., ["pets_ok", "new_listing"]
  extra?: Record<string, any>;
};

export type MapExtractJobInput = {
  query: string;                     // "Jersey City"
  maxPrice?: number;                 // 2000
  beds?: "studio" | 1 | 2 | 3 | 4;
  pets?: boolean;
  limit: number;                     // 100
  targetSites: ("apartments"|"demo")[];  // start with one
  sessionId: string;                 // UI session
};

export type MapExtractJob = {
  id: string;
  status: "queued"|"running"|"ok"|"error";
  query: string;
  filters: { maxPrice?: number; beds?: string|number; pets?: boolean };
  targetSites: string[];
  limit: number;
  createdAt: number;
  finishedAt?: number;
  error?: string;
  resultIds?: string[];              // ids into results table
};
```

---

## 4) Convex Schema (draft)

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    createdAt: v.number(),
    lastSeenAt: v.number(),
  }),

  jobs: defineTable({
    sessionId: v.id("sessions"),
    type: v.literal("map_extract"),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("ok"), v.literal("error")),
    query: v.string(),
    filters: v.object({
      maxPrice: v.optional(v.number()),
      beds: v.optional(v.union(v.literal("studio"), v.number())),
      pets: v.optional(v.boolean()),
    }),
    targetSites: v.array(v.string()),
    limit: v.number(),
    createdAt: v.number(),
    finishedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    resultIds: v.optional(v.array(v.id("results"))),
  }).index("by_status", ["status"]),

  results: defineTable({
    jobId: v.id("jobs"),
    site: v.string(),
    items: v.array(v.any()), // Listing[]
    createdAt: v.number(),
  }).index("by_job", ["jobId"]),

  artifacts: defineTable({
    jobId: v.id("jobs"),
    type: v.string(), // screenshot|json|csv|trace
    storageId: v.string(), // Convex storage id
    meta: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_job", ["jobId"]),

  execLogs: defineTable({
    jobId: v.id("jobs"),
    site: v.string(),
    step: v.string(), // navigate|filter|scroll|extract
    ts: v.number(),
    status: v.string(), // ok|retry|error
    note: v.optional(v.string()),
    artifactId: v.optional(v.id("artifacts")),
  }).index("by_job", ["jobId"]),
});
```

---

## 5) Agent Orchestration — @convex-dev/agents

**Agent:** `MapExtractAgent`

**Responsibilities:**

* Poll next `jobs.status="queued"`
* For each `site`:

  * Attach/create Browserbase session
  * Navigate → set filters → scroll until `limit`
  * Extract listings via Stagehand `extract` (with schema)
  * Normalize + persist `results`
  * Capture screenshots → `artifacts`
* Update `jobs.status` and `finishedAt`

**Skeleton (pseudo):**

```ts
import { createAgent } from "@convex-dev/agents";

export const MapExtractAgent = createAgent({
  name: "MapExtractAgent",
  onWake: async (ctx) => {
    const job = await nextQueuedJob(ctx);
    if (!job) return;
    await ctx.db.patch(job._id, { status: "running" });

    const resIds: Id<"results">[] = [];
    for (const site of job.targetSites) {
      const { items, shots } = await runSiteWorkflow(ctx, { site, job });
      const resId = await ctx.db.insert("results", {
        jobId: job._id, site, items, createdAt: Date.now()
      });
      resIds.push(resId);
      for (const s of shots) {
        const storageId = await ctx.storage.store(s.blob);
        await ctx.db.insert("artifacts", {
          jobId: job._id, type: "screenshot", storageId,
          meta: { site, step: s.step }, createdAt: Date.now()
        });
      }
    }

    await ctx.db.patch(job._id, {
      status: "ok",
      finishedAt: Date.now(),
      resultIds: resIds,
    });
  }
});
```

---

## 6) Stagehand Execution (per site)

**Extraction schema (LLM‑validated):**

```ts
const listingSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      title: { type: "string" },
      priceRaw: { type: "string" },
      url: { type: "string" },
      image: { type: "string", nullable: true },
      beds: { type: "number", nullable: true },
      baths: { type: "number", nullable: true },
      address: { type: "string", nullable: true },
      lat: { type: "number", nullable: true },
      lng: { type: "number", nullable: true },
      tags: { type: "array", items: { type: "string" }, nullable: true },
    },
    required: ["title","priceRaw","url"]
  }
};
```

**Workflow outline:**

1. `page.goto(siteUrl)`
2. Apply filters:

   * `page.act("Search for ${job.query}")`
   * `page.act("Set max price to $${job.filters.maxPrice}")`
   * `page.act("Filter for ${bedsLabel} and ${petsLabel}")`
   * Fallbacks: `getByPlaceholder(/search/i)`, `getByRole('button',{name:/price|beds|pets/i})`
3. Load items:

   * Find list container and loop scroll until `uniqueCount >= job.limit` or no growth
   * Wait for `networkidle` or loading spinners to disappear
4. Extract:

   * `page.extract("Extract listing cards...", { schema: listingSchema })`
   * Normalize & de‑dupe
5. Screenshots: before filters, after filters, after load, first detail

**Normalization helpers:**

* `parsePrice("$1,895/mo") → 1895`
* Parse `beds/baths` tokens; ensure absolute URLs; tag `pets_ok` if filter visible.

---

## 7) Next.js UI

**Pages**

```
app/
  page.tsx                  # Landing + form
  extract/[jobId]/page.tsx  # Live control room (status, screenshots, map+table)
components/
  ExtractForm.tsx           # city, maxPrice, beds, pets, limit
  LiveStatus.tsx            # execLogs stream (Convex live query)
  ScreenshotStrip.tsx       # artifact thumbnails
  ResultsMap.tsx            # leaflet/maplibre heat overlay
  ResultsTable.tsx          # listings table with sort/filter
  ExportButtons.tsx         # CSV/JSON download
```

**Live data**: Convex live queries on `jobs`, `results`, `artifacts`, `execLogs` by `jobId`.

**UX highlights:** progress badges ("Filters applied", "Loaded 87/100"), map heat overlay, table sorting, screenshot lightbox.

---

## 8) Exports & Artifacts

* **JSON/CSV**: built server‑side in Convex, stored via Convex Storage; signed URLs for downloads.
* **Screenshots**: captured per step and errors; thumbnail gallery in UI.
* **Optional**: Playwright trace on failure (upload `trace.zip`).

---

## 9) Guardrails & Reliability

* Read‑only; no account or checkout flows.
* Respect rate limits; backoff + cap total scroll duration.
* If site blocks automation → fall back to **demo map app** (clearly labeled).
* Deduplicate listings; show count & reason if < limit.

---

## 10) Env Vars

```
BROWSERBASE_API_KEY=...
BROWSERBASE_PROJECT_ID=...
OPENAI_API_KEY=...              # provider used by Stagehand
CONVEX_DEPLOYMENT=...
```

---

## 11) Milestones & Checklist

**M1 — Skeleton**

* [ ] Convex schema
* [ ] `createMapExtractJob` mutation + live query
* [ ] MapExtractAgent scaffold (returns mock data)
* [ ] Next.js pages (form + control room)

**M2 — Real extraction**

* [ ] Browserbase+Stagehand wiring
* [ ] Site adapter (filters → scroll → extract)
* [ ] Screenshots & artifacts flowing

**M3 — Exports & Map**

* [ ] Normalize listings; CSV/JSON export
* [ ] Heat overlay; table polish

**M4 — Robustness**

* [ ] Retry/backoff; duplicate removal
* [ ] Fallback to demo map; nice error states

---

## 12) Stretch Ideas

* **Stitched panorama** of map zoom levels
* **Click trail overlay** (draw circles on screenshots where actions occurred)
* **Compare two neighborhoods** in one run (two bboxes → two overlays)
* **Voice input** (PTT mic → STT → job creation)

---

## 13) API Surface (Convex)

```ts
// mutations
createSession(): { sessionId }
createMapExtractJob(input: MapExtractJobInput): { jobId }

// queries
getJob(jobId): JobDoc
getResults(jobId): ResultDoc[]
getArtifacts(jobId): ArtifactDoc[]
getExecLogs(jobId): ExecLogDoc[]

// actions (internal)
runJob(jobId): void   // called by MapExtractAgent
buildCsv(resultId): { artifactId, downloadUrl }
```

---

## 14) Glossary

* **Stagehand**: AI‑augmented Playwright from Browserbase (act/observe/extract) for resilient automation.
* **Convex Agents**: long‑lived stateful workers inside Convex to orchestrate multi‑step processes.
* **Artifacts**: screenshots/CSV/JSON/traces saved in Convex Storage.

---

## 15) Notes for Reviewers (portfolio context)

* This demo proves capabilities you **can’t** do with search APIs alone: dynamic map UIs, filters, infinite scroll, canvas/virtualized lists.
* Transparent results: CSV + screenshots for every step.
* Clean separation of concerns (UI ↔ state/agents ↔ execution) for maintainability.

---

*Fin.*
