"use node";

import { v } from "convex/values";

import { action } from "./_generated/server";
import { performApartmentsExtraction } from "./stagehand/extractionWorkflow";

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
  handler: async (ctx, args) => performApartmentsExtraction(ctx, args),
});
