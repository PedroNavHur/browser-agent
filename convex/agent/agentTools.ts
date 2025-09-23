import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import { api } from "../_generated/api";
import type { SearchEstateResult, StagehandListing } from "./agentTypes";
import {
  computeSharedTags,
  normalizeLocation,
  stagehandToSearchEstate,
} from "./agentUtils";

export const searchEstateArgs = z.object({
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

export const searchEstate = createTool({
  description:
    "Search Buscalo's preview dataset for rentals that match the requested filters.",
  args: searchEstateArgs,
  handler: async (ctx, args): Promise<SearchEstateResult[]> => {
    const limit = args.limit ?? 3;
    const sharedTags = computeSharedTags(args);
    const { displayQuery, locationSlug } = normalizeLocation(args.query);
    const activeThreadId = ctx.threadId;
    const threadId = activeThreadId ?? "public";
    const runId = `${threadId}-${Date.now()}`;

    try {
      const stagehandResult = await ctx.runAction(
        api.stagehand.runApartmentsExtraction,
        {
          query: displayQuery,
          locationSlug,
          maxPrice: args.maxPrice,
          bedrooms: args.bedrooms,
          pets: args.pets,
          limit,
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
        await ctx.runMutation(api.logs.appendLogs, {
          threadId: activeThreadId,
          runId,
          messages: [
            `Agent run complete. Returning ${listings.length} listing${listings.length === 1 ? "" : "s"}.`,
          ],
        });
      }

      if (listings.length > 0) {
        const transformed = listings.map((listing) =>
          stagehandToSearchEstate(listing, sharedTags),
        );

        await ctx.runMutation(api.listings.recordListings, {
          threadId,
          listings: transformed.map((listing) => ({
            title: listing.title,
            address: listing.address,
            price: listing.price,
            phone: listing.phone,
            imageUrl: listing.imageUrl,
          })),
        });

        return transformed;
      }

      if (activeThreadId) {
        await ctx.runMutation(api.logs.appendLogs, {
          threadId: activeThreadId,
          runId,
          messages: [
            "No listings matched the filters. Let the user know nothing was found.",
          ],
        });
      }

      return [];
    } catch (error) {
      console.warn("Stagehand extraction failed", {
        error,
      });

      if (activeThreadId) {
        await ctx.runMutation(api.logs.appendLogs, {
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

export const displayListings = createTool({
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
        }),
      )
      .min(1)
      .describe("Listings to display in the UI"),
  }),
  handler: async (ctx, { listings }) => {
    const threadId = ctx.threadId ?? "public";
    await ctx.runMutation(api.listings.recordListings, {
      threadId,
      listings: listings.map((listing) => ({
        ...listing,
      })),
    });
    return `Stored ${listings.length} listing${listings.length === 1 ? "" : "s"} for display.`;
  },
});
