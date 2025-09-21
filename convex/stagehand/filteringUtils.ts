"use node";

import type { NormalizedListing, RejectedListing } from "./types";

export function filterListingsByConstraints(
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
    const reasons: RejectedListing["reasons"] = [];

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

export function buildFilterInstructions({
  maxPrice,
  bedrooms,
  pets,
}: {
  maxPrice?: number | null;
  bedrooms?: string | number | null;
  pets?: boolean | null;
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

export function buildSearchUrl(slug: string, maxPrice?: number): string {
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

export function sanitizeSlug(input?: string | null): string {
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
