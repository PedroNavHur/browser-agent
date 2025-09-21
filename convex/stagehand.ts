"use node";

import type { LogLine } from "@browserbasehq/stagehand";
import { Stagehand } from "@browserbasehq/stagehand";
import { v } from "convex/values";
import { z } from "zod";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const extractionSchema = z.object({
  listings: z
    .array(
      z.object({
        title: z.string().min(1),
        price: z.string().min(1),
        imageUrl: z.string().url().optional(),
        address: z.string().min(1).optional(),
      })
    )
    .max(50)
    .default([]),
});

type ExtractedListing = z.infer<typeof extractionSchema>["listings"][number];

type NormalizedListing = {
  title: string;
  address?: string;
  price: number;
  priceRaw: string;
  beds?: number;
  url: string;
  imageUrl?: string;
  source: string;
};

type RejectionReason = {
  type: "price" | "location" | "bedrooms";
  detail: string;
};

type RejectedListing = {
  listing: NormalizedListing;
  reasons: RejectionReason[];
};

const ALLOWED_IMAGE_HOSTS = new Set([
  "apartments.com",
  "images1.apartments.com",
  "images2.apartments.com",
  "images3.apartments.com",
  "images4.apartments.com",
  "aptcdn.com",
]);

export const runApartmentsExtraction = action({
  args: {
    query: v.optional(v.string()),
    locationSlug: v.optional(v.string()),
    maxPrice: v.optional(v.number()),
    bedrooms: v.optional(v.union(v.literal("studio"), v.number())),
    pets: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    threadId: v.optional(v.string()),
    runId: v.optional(v.string()),
  },
  returns: v.object({
    liveViewUrl: v.string(),
    sessionId: v.optional(v.string()),
    debugUrl: v.optional(v.string()),
    listings: v.array(
      v.object({
        title: v.string(),
        address: v.optional(v.string()),
        price: v.number(),
        priceRaw: v.string(),
        beds: v.optional(v.number()),
        url: v.string(),
        imageUrl: v.optional(v.string()),
        source: v.string(),
      })
    ),
    extractedCount: v.number(),
    filteredCount: v.number(),
    rejectedCount: v.number(),
    logs: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
    const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
    const convexOpenAiKey =
      process.env.OPENAI_API_KEY ?? process.env.CONVEX_OPENAI_API_KEY;

    if (!browserbaseApiKey) {
      throw new Error("Missing BROWSERBASE_API_KEY environment variable.");
    }
    if (!browserbaseProjectId) {
      throw new Error("Missing BROWSERBASE_PROJECT_ID environment variable.");
    }
    if (!convexOpenAiKey) {
      throw new Error(
        "Missing OPENAI_API_KEY (or CONVEX_OPENAI_API_KEY) environment variable."
      );
    }

    const threadId = args.threadId ?? null;
    let runId = args.runId ?? `run-${Date.now()}`;
    const allLogs: string[] = [];
    let runStarted = false;

    const sendLog = async (messages: string[]) => {
      if (!threadId || messages.length === 0) {
        return;
      }
      await _ctx.runMutation(api.logs.appendLogs, {
        threadId,
        runId,
        messages,
      });
    };

    const recordLog = (raw: string) => {
      const message = raw.trim();
      if (!message) {
        return;
      }
      allLogs.push(message);
      if (threadId) {
        void sendLog([message]).catch(() => undefined);
      }
    };

    const startRunIfNeeded = async (initialMessage?: string) => {
      if (!threadId || runStarted) {
        return;
      }
      runStarted = true;
      await _ctx.runMutation(api.logs.startRun, {
        threadId,
        runId,
        initialMessage,
      });
      if (initialMessage) {
        allLogs.push(initialMessage.trim());
      }
    };

    const requestedLimit =
      typeof args.limit === "number" && Number.isFinite(args.limit)
        ? Math.max(1, Math.floor(args.limit))
        : null;
    const resultLimit = Math.min(50, Math.max(25, requestedLimit ?? 50));

    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: browserbaseApiKey,
      projectId: browserbaseProjectId,
      verbose: 1,
      waitForCaptchaSolves: true,
      enableCaching: false,
      modelName: process.env.STAGEHAND_MODEL ?? "gpt-4.1-mini",
      modelClientOptions: {
        apiKey: convexOpenAiKey,
        baseURL: process.env.OPENAI_BASE_URL,
      },
      disablePino: true,
      logger: (logLine: LogLine) => {
        const level = typeof logLine.level === "number" ? logLine.level : 1;
        if (level <= 1) {
          const category = logLine.category ?? "general";
          const message =
            typeof logLine.message === "string"
              ? logLine.message
              : JSON.stringify(logLine.message);
          const formatted = category && category !== "general"
            ? `Agent ${category}: ${message}`
            : `Agent ${message}`;
          console.log(`stagehand:${category} ${message}`);
          recordLog(formatted);
        }
      },
    });

    const filterInstructions = buildFilterInstructions(args);
const instruction =
      `Extract the rental listing cards currently visible on the page (aim for up to ${resultLimit}). ` +
      "For each, provide only the title, displayed monthly price text, and the primary image URL (if available).";

    let liveViewUrl: string | undefined;
    let sessionId: string | undefined;
    let debugUrl: string | undefined;

    try {
      await startRunIfNeeded("Starting Browserbase session...");
      const initResult = await stagehand.init();
      liveViewUrl = initResult.sessionUrl ?? initResult.debugUrl;
      sessionId = initResult.sessionId;
      debugUrl = initResult.debugUrl;
      if (sessionId) {
        recordLog(`Session ID: ${sessionId}`);
      }

      const page = stagehand.page;
      const slug =
        sanitizeSlug(args.locationSlug) ||
        sanitizeSlug(args.query) ||
        "jersey-city-nj";
      const slugUrl = buildSearchUrl(slug, args.maxPrice);

      console.log("stagehand:navigate", { url: slugUrl });
      recordLog(`Navigating to ${slugUrl}`);
      await page.goto(slugUrl);

      await page.act(
        "Close any popups or overlays so that the listings grid and map are both visible."
      );
      recordLog("Ensuring map and results are visible");

      for (const step of filterInstructions) {
        recordLog(step);
        await page.act(step);
      }

      await page.act(
        `Scroll the listings panel slowly through multiple screens, pausing after each movement so new property cards can load. Keep going until either the bottom is reached or roughly ${resultLimit} unique property cards have appeared, then scroll back near the top leaving several cards visible.`
      );
      recordLog("Scrolling through results to load more listings");

      const extracted = await page.extract({
        instruction,
        schema: extractionSchema,
      });
      recordLog("Extracted listing cards from the page");

      const normalized = normalizeListings(extracted.listings ?? []);

      if (normalized.some((listing) => !listing.imageUrl)) {
        recordLog("Attempting to backfill missing image URLs from the DOM");
        try {
          const lookupTitles = normalized
            .filter((listing) => !listing.imageUrl)
            .map((listing) => listing.title);
          const resolvedImages = await page.evaluate((titles) => {
            const results: Record<string, string | null> = {};
            const cards = Array.from(
              document.querySelectorAll('[data-test="placard"], [data-test="property-card"], article, [role="listitem"]'),
            ) as HTMLElement[];
            for (const title of titles) {
              const lowered = title.toLowerCase();
              const container = cards.find((card) =>
                (card.textContent ?? '').toLowerCase().includes(lowered),
              );
              if (!container) {
                results[title] = null;
                continue;
              }
              const img = container.querySelector('img');
              if (img) {
                const direct = img.getAttribute('src');
                const dataSrc = (img as HTMLImageElement).dataset?.src ?? (img as HTMLImageElement).dataset?.original;
                results[title] = direct ?? dataSrc ?? null;
              } else {
                results[title] = null;
              }
            }
            return results;
          }, lookupTitles);
          for (const listing of normalized) {
            if (!listing.imageUrl) {
              const resolved = resolvedImages[listing.title];
              if (resolved) {
                listing.imageUrl = sanitizeImageUrl(normalizeUrl(resolved));
                if (listing.imageUrl) {
                  recordLog(`Backfilled image for ${listing.title}`);
                }
              }
            }
          }
        } catch (error) {
          recordLog(
            `Image backfill failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
      for (const listing of normalized) {
        if (!listing.imageUrl) {
          recordLog(`Listing missing image: ${listing.title}`);
        }
      }
      const { filtered, rejected } = filterListingsByConstraints(
        normalized,
        args
      );
      if (rejected.length > 0) {
        console.log(
          "stagehand:filtered_out",
          rejected.map(entry => ({
            title: entry.listing.title,
            price: entry.listing.price,
            address: entry.listing.address,
            reasons: entry.reasons.map(reason => `${reason.type}: ${reason.detail}`),
          }))
        );
      }

      const constrained = filtered.slice(0, resultLimit);
      console.log(
        "stagehand:normalized_listings",
        normalized.length,
        constrained.length,
        constrained.map(listing => ({
          title: listing.title,
          price: listing.price,
        }))
      );
      recordLog(
        `Normalized ${normalized.length} listings, returning ${constrained.length}`
      );

      return {
        liveViewUrl: liveViewUrl ?? "",
        sessionId,
        debugUrl,
        listings: constrained,
        extractedCount: normalized.length,
        filteredCount: constrained.length,
        rejectedCount: rejected.length,
        logs: allLogs,
      };
    } finally {
      await stagehand.close().catch(() => undefined);
    }
  },
});

function buildFilterInstructions({
  maxPrice,
  bedrooms,
  pets,
}: {
  maxPrice?: number;
  bedrooms?: string | number;
  pets?: boolean;
}): string[] {
  const steps: string[] = [];

  if (bedrooms === "studio" || bedrooms === 0 || typeof bedrooms === "number") {
    let optionLabel = "Studio+";
    let descriptor = "studio (0 bedroom)";
    if (typeof bedrooms === "number" && bedrooms > 0) {
      optionLabel = `${bedrooms}+`;
      descriptor = `${bedrooms}-bedroom`;
    }
    steps.push(
      'Click the "Beds/Baths" filter button above the results so the beds selector popup stays open.'
    );
    steps.push(
      `Inside the Beds/Baths popup, select the "${optionLabel}" option so only ${descriptor} listings remain, then apply or close the beds filter and wait for the list to refresh.`
    );
  }

  if (pets === true) {
    steps.push(
      "Enable any pets-allowed filter so the results only include pet-friendly properties and wait for the list to update."
    );
  }

  return steps;
}

function normalizeListings(listings: ExtractedListing[]): NormalizedListing[] {
  return listings.map(listing => {
    const priceRaw = listing.price;
    const price = parsePrice(priceRaw);
    const imageUrl = listing.imageUrl
      ? sanitizeImageUrl(normalizeUrl(listing.imageUrl))
      : undefined;

    return {
      title: listing.title.trim(),
      address: listing.address?.trim(),
      price,
      priceRaw,
      beds: parseBedroomCount(`${listing.title} ${listing.address ?? ""}`),
      url: buildApartmentsFallbackUrl(listing.address),
      imageUrl,
      source: "apartments.com",
    };
  });
}

function parsePrice(priceText: string): number {
  const matches = priceText.match(/\d[\d,.]*/g);
  if (!matches || matches.length === 0) {
    return 0;
  }
  const primary = matches[0].replace(/[,]/g, "");
  const parsed = Number.parseFloat(primary);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.round(parsed);
}

function normalizeUrl(url: string): string {
  try {
    return new URL(url, "https://www.apartments.com").toString();
  } catch (_error) {
    return url;
  }
}

function sanitizeImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) {
    return undefined;
  }
  if (!/^https?:/i.test(imageUrl)) {
    return undefined;
  }
  const lower = imageUrl.toLowerCase();
  if (lower.includes("placeholder") || lower.includes("example.com")) {
    return undefined;
  }
  try {
    const hostname = new URL(imageUrl).hostname.toLowerCase();
    if (
      !ALLOWED_IMAGE_HOSTS.has(hostname) &&
      !hostname.endsWith("apartments.com") &&
      !hostname.endsWith("aptcdn.com")
    ) {
      return undefined;
    }
  } catch (_error) {
    return undefined;
  }
  return imageUrl;
}

function buildSearchUrl(slug: string, maxPrice?: number): string {
  const normalizedSlug = slug.length > 0 ? slug : "jersey-city-nj";
  let url = `https://www.apartments.com/${normalizedSlug}/`;
  if (typeof maxPrice === "number" && Number.isFinite(maxPrice)) {
    const rounded = Math.max(0, Math.floor(maxPrice / 100) * 100);
    if (rounded > 0) {
      url = `https://www.apartments.com/${normalizedSlug}/under-${rounded}/`;
    }
  }
  return url;
}

function sanitizeSlug(input?: string | null): string {
  if (!input) {
    return "";
  }
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s/-]+/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function buildApartmentsFallbackUrl(address?: string): string {
  if (!address) {
    return "https://www.apartments.com/";
  }
  const normalized = address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  if (normalized.length === 0) {
    return "https://www.apartments.com/";
  }
  return `https://www.apartments.com/${normalized}`;
}

function filterListingsByConstraints(
  listings: NormalizedListing[],
  filters: {
    query?: string | null;
    maxPrice?: number | null;
    bedrooms?: string | number | null;
  }
): {
  filtered: NormalizedListing[];
  rejected: RejectedListing[];
} {
  const filtered: NormalizedListing[] = [];
  const rejected: RejectedListing[] = [];

  for (const listing of listings) {
    const reasons: RejectionReason[] = [];

    if (
      typeof filters.maxPrice === "number" &&
      listing.price > 0 &&
      listing.price > filters.maxPrice
    ) {
      reasons.push({
        type: "price",
        detail: `Listing price $${listing.price.toLocaleString(
          "en-US"
        )} exceeds max $${filters.maxPrice.toLocaleString("en-US")}`,
      });
    }

    if (reasons.length === 0) {
      filtered.push(listing);
    } else {
      rejected.push({ listing, reasons });
    }
  }

  return { filtered, rejected };
}

function parseBedroomCount(text: string): number | undefined {
  const normalized = text.toLowerCase();
  if (normalized.includes("studio")) {
    return 0;
  }
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(?:bed|br|bedroom)/);
  if (match) {
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value)) {
      return Math.round(value);
    }
  }
  return undefined;
}
