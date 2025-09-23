"use node";

import type { Stagehand } from "@browserbasehq/stagehand";

import { sanitizeExternalImage } from "./listingNormalization";
import type { NormalizedListing } from "./types";

export async function backfillImages(
  page: Stagehand["page"],
  listings: NormalizedListing[],
  recordLog: (message: string) => void,
) {
  const lookupTitles = listings
    .filter((listing) => !listing.imageUrl)
    .map((listing) => listing.title);

  if (lookupTitles.length === 0) {
    return;
  }

  try {
    const resolvedImages = await page.evaluate((titles: string[]) => {
      const results: Record<string, string | null> = {};
      const cards = Array.from(
        document.querySelectorAll(
          '[data-test="placard"], [data-test="property-card"], article, [role="listitem"]',
        ),
      ) as HTMLElement[];
      for (const title of titles) {
        const lowered = title.toLowerCase();
        const container = cards.find((card) =>
          (card.textContent ?? "").toLowerCase().includes(lowered),
        );
        if (!container) {
          results[title] = null;
          continue;
        }
        const img = container.querySelector("img");
        if (img) {
          const direct = img.getAttribute("src");
          const dataSrc =
            (img as HTMLImageElement).dataset?.src ??
            (img as HTMLImageElement).dataset?.original;
          results[title] = direct ?? dataSrc ?? null;
        } else {
          results[title] = null;
        }
      }
      return results;
    }, lookupTitles);

    for (const listing of listings) {
      if (!listing.imageUrl) {
        const resolved = sanitizeExternalImage(resolvedImages[listing.title]);
        if (resolved) {
          listing.imageUrl = resolved;
          recordLog(`Backfilled image for ${listing.title}`);
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
