"use node";

import type { ExtractedListing, NormalizedListing } from "./types";

export function normalizeListings(
  listings: ExtractedListing[],
): NormalizedListing[] {
  return listings.map((listing) => {
    const imageUrl = sanitizeExternalImage(listing.imageUrl);

    return {
      title: listing.title.trim(),
      address: listing.address?.trim(),
      price: parsePrice(listing.price),
      priceRaw: listing.price,
      beds: parseBedroomCount(`${listing.title} ${listing.address ?? ""}`),
      imageUrl,
      source: "apartments.com",
    };
  });
}

export function sanitizeExternalImage(
  imageUrl?: string | null,
): string | undefined {
  if (!imageUrl) {
    return undefined;
  }
  return sanitizeImageUrl(normalizeUrl(imageUrl));
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

  return imageUrl;
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
