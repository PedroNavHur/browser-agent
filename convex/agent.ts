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

    try {
      const stagehandResult = await _ctx.runAction(
        api.stagehand.runApartmentsExtraction,
        {
          query: args.query,
          maxPrice: args.maxPrice,
          bedrooms: args.bedrooms,
          pets: args.pets,
        },
      );

      const listings = stagehandResult.listings.slice(0, limit);
      console.log(
        "searchEstate:stagehand_result",
        listings.length,
        listings.map((listing) => ({ title: listing.title, price: listing.price })),
      );
      if (listings.length > 0) {
        const transformed = listings.map((listing) =>
          stagehandToSearchEstate(listing, sharedTags),
        );

        const threadId = _ctx.threadId ?? "public";
        await _ctx.runMutation(api.listings.recordListings, {
          threadId,
          listings: transformed.map((listing) => ({
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
    } catch (error) {
      console.warn("Stagehand extraction failed, falling back to mock data", {
        error,
      });
    }

    return generateMockListings(args, limit);
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
  const priceLabel = listing.priceRaw || `$${listing.price.toLocaleString("en-US")}`;
  const location = listing.address ?? "Address not provided";
  const tags = [
    ...sharedTags,
    listing.source,
    ...(listing.phone ? ["has_phone"] : []),
  ];

  return {
    title: listing.title,
    price: listing.price,
    address: location,
    url: listing.url,
    summary: `${listing.title} — ${priceLabel} • ${location}`,
    tags,
    phone: listing.phone,
    imageUrl: listing.imageUrl,
  };
}

export const buscaloAgent = new Agent(agentComponent, {
  name: "Buscalo",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: [
    "You are Buscalo, a browser automation specialist focused on real-estate map listings.",
    "Explain what you can do today, what is on the roadmap, and how the Browserbase + Stagehand stack powers the workflow.",
    "When features are not yet implemented, be transparent and suggest next steps.",
    "Use the searchEstate tool to simulate listings and call displayListings to sync them into the UI tables.",
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
