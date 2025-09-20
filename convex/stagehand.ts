"use node";

import { Stagehand } from "@browserbasehq/stagehand";
import type { LogLine } from "@browserbasehq/stagehand";
import { v } from "convex/values";
import { z } from "zod";
import { action } from "./_generated/server";

const extractionSchema = z.object({
  listings: z
    .array(
      z.object({
        title: z.string().min(1),
        address: z.string().min(1).optional(),
        price: z.string().min(1),
        phone: z.string().optional(),
        imageUrl: z.string().url().optional(),
        url: z.string().min(1),
      })
    )
    .max(5)
    .default([]),
});

type ExtractedListing = z.infer<typeof extractionSchema>["listings"][number];

type NormalizedListing = {
  title: string;
  address?: string;
  price: number;
  priceRaw: string;
  url: string;
  imageUrl?: string;
  phone?: string;
  source: string;
};

export const runApartmentsExtraction = action({
  args: {
    query: v.optional(v.string()),
    maxPrice: v.optional(v.number()),
    bedrooms: v.optional(v.union(v.literal("studio"), v.number())),
    pets: v.optional(v.boolean()),
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
        url: v.string(),
        imageUrl: v.optional(v.string()),
        phone: v.optional(v.string()),
        source: v.string(),
      })
    ),
  }),
  handler: async (_ctx, args) => {
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
    const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
    const convexOpenAiKey = process.env.OPENAI_API_KEY ?? process.env.CONVEX_OPENAI_API_KEY;

    if (!browserbaseApiKey) {
      throw new Error("Missing BROWSERBASE_API_KEY environment variable.");
    }
    if (!browserbaseProjectId) {
      throw new Error("Missing BROWSERBASE_PROJECT_ID environment variable.");
    }
    if (!convexOpenAiKey) {
      throw new Error(
        "Missing OPENAI_API_KEY (or CONVEX_OPENAI_API_KEY) environment variable.",
      );
    }

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
          console.log(`stagehand:${category} ${message}`);
        }
      },
    });

    const filtersDescription = buildFilterPrompt(args);
    const instruction =
      "Extract up to five rental listing cards that are currently visible on the page. " +
      "For each, provide the title, address, displayed monthly price text, contact phone if available, " +
      "primary image URL, and the detail page URL.";

    let liveViewUrl: string | undefined;
    let sessionId: string | undefined;
    let debugUrl: string | undefined;

    try {
      const initResult = await stagehand.init();
      liveViewUrl = initResult.sessionUrl ?? initResult.debugUrl;
      sessionId = initResult.sessionId;
      debugUrl = initResult.debugUrl;

      const page = stagehand.page;

      await page.goto("https://www.apartments.com/");

      const searchQuery = args.query ?? "Jersey City, NJ";
      await page.act(
        `Search for rentals in ${searchQuery} on this page and submit the search form if necessary, ` +
          "then wait for the results to load."
      );

      if (filtersDescription) {
        await page.act(
          `Apply the following filters using the page controls: ${filtersDescription}. ` +
            "Ensure the results list refreshes afterwards."
        );
      }

      await page.act(
        "Scroll through the results until at least five unique listing cards are visible, then stop scrolling."
      );

      const extracted = await page.extract({
        instruction,
        schema: extractionSchema,
      });

      const normalized = normalizeListings(extracted.listings ?? []);
      console.log(
        "stagehand:normalized_listings",
        normalized.length,
        normalized.map((listing) => ({
          title: listing.title,
          price: listing.price,
          url: listing.url,
        })),
      );

      return {
        liveViewUrl: liveViewUrl ?? "",
        sessionId,
        debugUrl,
        listings: normalized,
      };
    } finally {
      await stagehand.close().catch(() => undefined);
    }
  },
});

function buildFilterPrompt({
  maxPrice,
  bedrooms,
  pets,
}: {
  maxPrice?: number;
  bedrooms?: string | number;
  pets?: boolean;
}): string {
  const filters: string[] = [];

  if (typeof maxPrice === "number") {
    filters.push(`set the maximum monthly rent to $${Math.round(maxPrice)}`);
  }

  if (bedrooms === "studio" || bedrooms === 0) {
    filters.push("filter for studio apartments");
  } else if (typeof bedrooms === "number") {
    filters.push(`filter for ${bedrooms} bedroom units`);
  }

  if (pets === true) {
    filters.push("enable the pets allowed filter");
  }

  return filters.join(" and ");
}

function normalizeListings(listings: ExtractedListing[]): NormalizedListing[] {
  return listings.slice(0, 5).map(listing => {
    const priceRaw = listing.price;
    const price = parsePrice(priceRaw);
    const normalizedUrl = normalizeUrl(listing.url);
    const imageUrl = listing.imageUrl
      ? normalizeUrl(listing.imageUrl)
      : undefined;

    return {
      title: listing.title.trim(),
      address: listing.address?.trim(),
      price,
      priceRaw,
      url: normalizedUrl,
      imageUrl,
      phone: listing.phone?.trim(),
      source: "apartments.com",
    };
  });
}

function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(cleaned);
  if (Number.isFinite(parsed)) {
    return Math.round(parsed);
  }
  return 0;
}

function normalizeUrl(url: string): string {
  try {
    return new URL(url, "https://www.apartments.com").toString();
  } catch (_error) {
    return url;
  }
}
