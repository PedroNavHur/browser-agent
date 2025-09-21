import { openai } from "@ai-sdk/openai";
import {
  Agent,
  type AgentComponent,
  createThread,
  createTool,
} from "@convex-dev/agent";
import { v } from "convex/values";
import { z } from "zod";
import { api, components } from "./_generated/api";
import { action } from "./_generated/server";

const agentComponent = (components as { agent: AgentComponent }).agent;

type SearchEstateResult = {
  title: string;
  price: number;
  address: string;
  url: string;
  summary: string;
  tags: string[];
  phone?: string;
  imageUrl?: string;
};

type StagehandListing = {
  title: string;
  address?: string;
  price: number;
  priceRaw: string;
  beds?: number;
  url: string;
  imageUrl?: string;
  phone?: string;
  source: string;
};

const searchEstateArgs = z.object({
  query: z.string().min(1).describe("City or neighborhood to search"),
  maxPrice: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Upper bound for monthly rent in USD"),
  bedrooms: z
    .union([z.literal("studio"), z.number().int().min(0)])
    .optional()
    .describe("Bedroom count (use 'studio' for zero bedrooms)"),
  pets: z.boolean().optional().describe("Whether listings must allow pets"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .optional()
    .describe("Maximum listings to return (defaults to 3)"),
});

const searchEstate = createTool({
  description:
    "Search Buscalo's preview dataset for rentals that match the requested filters.",
  args: searchEstateArgs,
  handler: async (_ctx, args): Promise<SearchEstateResult[]> => {
    const limit = args.limit ?? 3;
    const sharedTags = computeSharedTags(args);
    const { displayQuery, locationSlug } = normalizeLocation(args.query);
    const activeThreadId = _ctx.threadId;
    const threadId = activeThreadId ?? "public";
    const runId = `${threadId}-${Date.now()}`;
    try {
      const stagehandResult = await _ctx.runAction(
        api.stagehand.runApartmentsExtraction,
        {
          query: displayQuery,
          locationSlug,
          maxPrice: args.maxPrice,
          bedrooms: args.bedrooms,
          pets: args.pets,
          limit: limit,
          threadId: activeThreadId ?? undefined,
          runId,
        },
      );

      const listings = (stagehandResult.listings ?? []).slice(
        0,
        limit,
      ) as StagehandListing[];
      console.log("searchEstate:stagehand_result", {
        extracted: stagehandResult.extractedCount,
        filtered: stagehandResult.filteredCount,
        rejected: stagehandResult.rejectedCount,
        returned: listings.length,
        sample: listings.map((listing) => ({
          title: listing.title,
          price: listing.price,
          beds: listing.beds,
        })),
      });
      if (activeThreadId) {
        await _ctx.runMutation(api.logs.appendLogs, {
          threadId: activeThreadId,
          runId,
          messages: [
            `Agent run complete. Returning ${listings.length} listing${listings.length === 1 ? "" : "s"}.`,
          ],
        });
      }
      if (listings.length > 0) {
        const transformed = listings.map((listing: StagehandListing) =>
          stagehandToSearchEstate(listing, sharedTags),
        );

        await _ctx.runMutation(api.listings.recordListings, {
          threadId,
          listings: transformed.map((listing: SearchEstateResult) => ({
            title: listing.title,
            address: listing.address,
            price: listing.price,
            phone: listing.phone,
            imageUrl: listing.imageUrl,
            url: listing.url,
          })),
        });

        return transformed;
      }

      if (activeThreadId) {
        await _ctx.runMutation(api.logs.appendLogs, {
          threadId: activeThreadId,
          runId,
          messages: [
            "No listings matched the filters. Let the user know nothing was found.",
          ],
        });
      }
      return [];
    } catch (error) {
      console.warn("Stagehand extraction failed, falling back to mock data", {
        error,
      });
      if (activeThreadId) {
        await _ctx.runMutation(api.logs.appendLogs, {
          threadId: activeThreadId,
          runId,
          messages: [
            `Stagehand extraction failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        });
      }
      return [];
    }
  },
});

const displayListings = createTool({
  description:
    "Persist a batch of listings so the Buscalo console can render them for the user.",
  args: z.object({
    listings: z
      .array(
        z.object({
          title: z.string(),
          address: z.string(),
          price: z.number(),
          phone: z.string().optional(),
          imageUrl: z.string().url().optional(),
          url: z.string().url(),
        }),
      )
      .min(1)
      .describe("Listings to display in the UI"),
  }),
  handler: async (ctx, { listings }) => {
    const threadId = ctx.threadId ?? "public";
    await ctx.runMutation(api.listings.recordListings, {
      threadId,
      listings,
    });
    return `Stored ${listings.length} listing${listings.length === 1 ? "" : "s"} for display.`;
  },
});

function computeSharedTags(args: z.infer<typeof searchEstateArgs>): string[] {
  return [
    ...(args.pets ? ["pets_ok"] : []),
    ...(args.bedrooms === "studio" || args.bedrooms === 0 ? ["studio"] : []),
    ...(typeof args.bedrooms === "number" && args.bedrooms > 0
      ? [`${args.bedrooms}br`]
      : []),
  ];
}

function generateMockListings(
  args: z.infer<typeof searchEstateArgs>,
  limit: number,
): SearchEstateResult[] {
  const normalizedQuery = args.query.trim();
  const basePrice = args.maxPrice ?? 2600;
  const sharedTags = computeSharedTags(args);

  return Array.from({ length: limit }, (_, index) => {
    const price = Math.max(950, basePrice - index * 125);
    const listingNumber = index + 1;
    return {
      title: `${normalizedQuery} Preview ${listingNumber}`,
      price,
      address: `${normalizedQuery} • Highlight ${listingNumber}`,
      url: `https://demo.buscalo.dev/listings/${encodeURIComponent(
        normalizedQuery.toLowerCase(),
      )}/${listingNumber}`,
      summary: `Preview listing in ${normalizedQuery} with rent around $${price.toLocaleString(
        "en-US",
      )} per month.`,
      tags: [...sharedTags, `priority_${listingNumber}`],
      phone: `+1 (555) ${String(4200 + index).padStart(4, "0")}`,
      imageUrl: `https://images.buscalo.dev/preview/${encodeURIComponent(
        normalizedQuery.toLowerCase(),
      )}/${listingNumber}.jpg`,
    };
  });
}

function stagehandToSearchEstate(
  listing: StagehandListing,
  sharedTags: string[],
): SearchEstateResult {
  const priceLabel =
    listing.priceRaw || `$${listing.price.toLocaleString("en-US")}`;
  const location = listing.address ?? "Address not provided";
  const bedLabel =
    listing.beds === undefined
      ? undefined
      : listing.beds === 0
        ? "Studio"
        : `${listing.beds} BR`;
  const tags = [
    ...sharedTags,
    listing.source,
    ...(listing.phone ? ["has_phone"] : []),
    ...(listing.beds === 0
      ? ["studio"]
      : typeof listing.beds === "number"
        ? [`${listing.beds}br`]
        : []),
  ];

  return {
    title: listing.title,
    price: listing.price,
    address: location,
    url: listing.url,
    summary: `${listing.title} — ${priceLabel} • ${location}${
      bedLabel ? ` • ${bedLabel}` : ""
    }`,
    tags,
    phone: listing.phone,
    imageUrl: listing.imageUrl,
  };
}

function normalizeLocation(input: string | undefined): {
  displayQuery: string;
  locationSlug: string;
} {
  const fallback = {
    displayQuery: "New York, NY",
    locationSlug: "new-york-ny",
  };
  if (!input) {
    return fallback;
  }

  const trimmed = input.trim().toLowerCase();
  if (trimmed.length === 0) {
    return fallback;
  }

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z]{2}$/.test(trimmed)) {
    return {
      displayQuery: slugToDisplay(trimmed),
      locationSlug: trimmed,
    };
  }

  const cleaned = trimmed
    .replace(/[\s,-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();

  if (cleaned.length === 0) {
    return fallback;
  }

  const parts = cleaned.split(/\s*,\s*/);
  let cityPart = parts[0] ?? "new york";
  let statePart = parts[1];

  if (!statePart) {
    const tokens = cityPart.split(/\s+/);
    const last = tokens[tokens.length - 1];
    const normalizedState = resolveState(last);
    if (normalizedState) {
      statePart = normalizedState;
      cityPart = tokens.slice(0, -1).join(" ") || cityPart;
    }
  } else {
    statePart = resolveState(statePart) ?? statePart;
  }

  if (!statePart) {
    statePart = inferPopularState(cityPart) ?? "ny";
  }

  const slugCity = cityPart.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-");
  const slugState = statePart.toLowerCase();
  const locationSlug = `${slugCity}-${slugState}`
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    displayQuery: `${toTitleCase(cityPart)}, ${slugState.toUpperCase()}`,
    locationSlug: locationSlug || fallback.locationSlug,
  };
}

function slugToDisplay(slug: string): string {
  const parts = slug.split("-");
  if (parts.length < 2) {
    return "New York, NY";
  }
  const state = parts.pop() as string;
  const city = parts.join(" ");
  return `${toTitleCase(city)}, ${state.toUpperCase()}`;
}

function resolveState(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const normalized = token.toLowerCase();
  if (/^[a-z]{2}$/.test(normalized)) {
    return normalized;
  }
  return STATE_ABBREVIATIONS[normalized];
}

function inferPopularState(city: string): string | undefined {
  const key = city.toLowerCase();
  return POPULAR_CITY_DEFAULTS[key];
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  "american samoa": "as",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  florida: "fl",
  georgia: "ga",
  guam: "gu",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "puerto rico": "pr",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  "virgin islands": "vi",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
};

const POPULAR_CITY_DEFAULTS: Record<string, string> = {
  manhattan: "ny",
  "new york": "ny",
  brooklyn: "ny",
  queens: "ny",
  bronx: "ny",
  chicago: "il",
  houston: "tx",
  phoenix: "az",
  philadelphia: "pa",
  dallas: "tx",
  "los angeles": "ca",
  miami: "fl",
  atlanta: "ga",
  seattle: "wa",
  boston: "ma",
  denver: "co",
  austin: "tx",
  orlando: "fl",
  tampa: "fl",
};

export const buscaloAgent = new Agent(agentComponent, {
  name: "Buscalo",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: [
    "You are Buscalo, a browser automation specialist focused on real-estate map listings.",
    "Explain what you can do today, what is on the roadmap, and how the Browserbase + Stagehand stack powers the workflow.",
    "When features are not yet implemented, be transparent and suggest next steps.",
    "Use the searchEstate tool to simulate listings and call displayListings to sync them into the UI tables.",
    "When calling searchEstate, you MUST pass the city as a lowercase slug with a two-letter state abbreviation (e.g. 'manhattan-ny', 'jersey-city-nj'). Do not include spaces, commas, or extra words; if the user omits the state, infer the most likely U.S. state for that city and use it in the slug.",
    "Keep answers concise (3-4 sentences) and focus on actionable guidance for the user.",
  ].join(" "),
  tools: { searchEstate, displayListings },
  maxSteps: 4,
});

export const sendMessage = action({
  args: {
    text: v.string(),
    threadId: v.optional(v.string()),
  },
  returns: v.object({
    reply: v.string(),
    threadId: v.string(),
  }),
  handler: async (ctx, { text, threadId }) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new Error("Message cannot be empty.");
    }

    const activeThreadId =
      threadId ?? ((await createThread(ctx, agentComponent)) as string);
    const result = await buscaloAgent.generateText(
      ctx,
      { threadId: activeThreadId },
      { prompt: trimmed },
    );

    return {
      reply: result.text,
      threadId: activeThreadId,
    };
  },
});
