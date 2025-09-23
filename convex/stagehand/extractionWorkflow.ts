"use node";

import type { ActionCtx } from "../_generated/server";
import {
  buildFilterInstructions,
  buildSearchUrl,
  filterListingsByConstraints,
  sanitizeSlug,
} from "./filteringUtils";
import { backfillImages } from "./imageBackfill";
import { normalizeListings } from "./listingNormalization";
import { createRunLogger } from "./logging";
import { prepareResultsView } from "./pagePreparation";
import {
  acquireBrowserbaseSession,
  discardBrowserbaseSession,
  releaseBrowserbaseSession,
} from "./sessionManager";
import {
  buildExtractionInstruction,
  computeResultLimit,
  createStagehandClient,
  resolveStagehandEnv,
} from "./stagehandConfig";
import { extractionSchema } from "./types";

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
  args: ExtractionArgs,
): Promise<ExtractionResult> {
  const env = resolveStagehandEnv();
  const logger = createRunLogger(ctx, {
    threadId: args.threadId ?? undefined,
    runId: args.runId ?? undefined,
  });
  const resultLimit = computeResultLimit(args.limit);
  const { bedrooms, pets } = args;
  const filterInstructions = buildFilterInstructions({ bedrooms, pets });
  const extractionInstruction = buildExtractionInstruction(resultLimit);
  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const sessionHandle = await acquireBrowserbaseSession(
      ctx,
      logger.recordLog,
    );
    const stagehand = createStagehandClient(
      env,
      logger.recordLog,
      sessionHandle.sessionId,
    );

    try {
      await logger.startRunIfNeeded("Starting Browserbase session...");
      const initResult = await stagehand.init();
      const activeSessionId = initResult.sessionId ?? sessionHandle.sessionId;
      const liveViewUrl = initResult.sessionUrl ?? initResult.debugUrl ?? "";
      const debugUrl = initResult.debugUrl;
      if (!activeSessionId) {
        throw new Error("Stagehand did not return a browser session id");
      }
      if (activeSessionId) {
        logger.recordLog(`Session ID: ${activeSessionId}`);
        sessionHandle.sessionId = activeSessionId;
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
        logger.recordLog,
      );

      const extracted = await page.extract({
        instruction: extractionInstruction,
        schema: extractionSchema,
      });
      logger.recordLog("Extracted listing cards from the page");

      for (const listing of extracted.listings ?? []) {
        if (listing.imageUrl) {
          logger.recordLog(`Extracted image URL: ${listing.imageUrl}`);
        } else {
          logger.recordLog(`No image URL extracted for: ${listing.title}`);
        }
      }

      const normalized = normalizeListings(extracted.listings ?? []);

      if (normalized.some((listing) => !listing.imageUrl)) {
        logger.recordLog(
          "Attempting to backfill missing image URLs from the DOM",
        );
        await backfillImages(page, normalized, logger.recordLog);
      }

      for (const listing of normalized) {
        if (!listing.imageUrl) {
          logger.recordLog(`Listing missing image: ${listing.title}`);
        }
      }

      const { filtered, rejected } = filterListingsByConstraints(
        normalized,
        args,
      );
      if (rejected.length > 0) {
        console.log(
          "stagehand:filtered_out",
          rejected.map((entry) => ({
            title: entry.listing.title,
            price: entry.listing.price,
            address: entry.listing.address,
            reasons: entry.reasons.map(
              (reason) => `${reason.type}: ${reason.detail}`,
            ),
          })),
        );
      }

      const constrained = filtered.slice(0, resultLimit);
      console.log(
        "stagehand:normalized_listings",
        normalized.length,
        constrained.length,
        constrained.map((listing) => ({
          title: listing.title,
          price: listing.price,
        })),
      );
      logger.recordLog(
        `Normalized ${normalized.length} listings, returning ${constrained.length}`,
      );

      await releaseBrowserbaseSession(
        ctx,
        sessionHandle,
        activeSessionId,
        logger.recordLog,
      );

      return {
        liveViewUrl,
        sessionId: activeSessionId,
        debugUrl,
        listings: constrained,
        extractedCount: normalized.length,
        filteredCount: constrained.length,
        rejectedCount: rejected.length,
        logs: logger.allLogs,
      };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retrying = attempt + 1 < maxAttempts;
      logger.recordLog(
        `Stagehand extraction error${retrying ? ", retrying with a new session" : ""}: ${message}`,
      );
      await discardBrowserbaseSession(ctx, sessionHandle, logger.recordLog);
      try {
        await stagehand.close();
      } catch {
        // ignore close failures on discard
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Stagehand extraction failed"));
}
