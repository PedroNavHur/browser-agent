"use node";

import type { ActionCtx } from "../_generated/server";
import { backfillImages } from "./imageBackfill";
import {
  buildFilterInstructions,
  buildSearchUrl,
  filterListingsByConstraints,
  sanitizeSlug,
} from "./filteringUtils";
import { createRunLogger } from "./logging";
import { normalizeListings } from "./listingNormalization";
import { extractionSchema } from "./types";
import {
  buildExtractionInstruction,
  computeResultLimit,
  createStagehandClient,
  resolveStagehandEnv,
} from "./stagehandConfig";
import { prepareResultsView } from "./pagePreparation";

export type ExtractionArgs = {
  query?: string | null;
  locationSlug?: string | null;
  maxPrice?: number | null;
  bedrooms?: string | number | null;
  pets?: boolean | null;
  limit?: number | null;
  threadId?: string | null;
  runId?: string | null;
};

export type ExtractionResult = {
  liveViewUrl: string;
  sessionId?: string;
  debugUrl?: string;
  listings: ReturnType<typeof normalizeListings>;
  extractedCount: number;
  filteredCount: number;
  rejectedCount: number;
  logs: string[];
};

export async function performApartmentsExtraction(
  ctx: ActionCtx,
  args: ExtractionArgs
): Promise<ExtractionResult> {
  const env = resolveStagehandEnv();
  const logger = createRunLogger(ctx, {
    threadId: args.threadId ?? undefined,
    runId: args.runId ?? undefined,
  });
  const resultLimit = computeResultLimit(args.limit);
  const stagehand = createStagehandClient(env, logger.recordLog);
  const filterInstructions = buildFilterInstructions(args);
  const extractionInstruction = buildExtractionInstruction(resultLimit);

  let liveViewUrl: string | undefined;
  let sessionId: string | undefined;
  let debugUrl: string | undefined;

  try {
    await logger.startRunIfNeeded("Starting Browserbase session...");
    const initResult = await stagehand.init();
    liveViewUrl = initResult.sessionUrl ?? initResult.debugUrl;
    sessionId = initResult.sessionId;
    debugUrl = initResult.debugUrl;
    if (sessionId) {
      logger.recordLog(`Session ID: ${sessionId}`);
    }

    const page = stagehand.page;
    const slug =
      sanitizeSlug(args.locationSlug) ||
      sanitizeSlug(args.query) ||
      "jersey-city-nj";
    const slugUrl = buildSearchUrl(slug, args.maxPrice ?? undefined);

    await prepareResultsView(
      page,
      slugUrl,
      filterInstructions,
      resultLimit,
      logger.recordLog
    );

    const extracted = await page.extract({
      instruction: extractionInstruction,
      schema: extractionSchema,
    });
    logger.recordLog("Extracted listing cards from the page");

    const normalized = normalizeListings(extracted.listings ?? []);

    if (normalized.some(listing => !listing.imageUrl)) {
      logger.recordLog("Attempting to backfill missing image URLs from the DOM");
      await backfillImages(page, normalized, logger.recordLog);
    }

    for (const listing of normalized) {
      if (!listing.imageUrl) {
        logger.recordLog(`Listing missing image: ${listing.title}`);
      }
    }

    const { filtered, rejected } = filterListingsByConstraints(normalized, args);
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
    logger.recordLog(
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
      logs: logger.allLogs,
    };
  } finally {
    await stagehand.close().catch(() => undefined);
  }
}
