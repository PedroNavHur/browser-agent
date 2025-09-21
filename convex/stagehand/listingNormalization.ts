"use node";

import type { ExtractedListing, NormalizedListing } from "./types";
import { ALLOWED_IMAGE_HOSTS } from "./types";

export function normalizeListings(
  listings: ExtractedListing[]
): NormalizedListing[] {
  return listings.map(listing => {
    const imageUrl = sanitizeExternalImage(listing.imageUrl);

    return {
      title: listing.title.trim(),
      address: listing.address?.trim(),
      price: parsePrice(listing.price),
      priceRaw: listing.price,
      beds: parseBedroomCount(`${listing.title} ${listing.address ?? ""}`),
      url: buildApartmentsFallbackUrl(listing.address),
      imageUrl,
      source: "apartments.com",
    };
  });
}

export function sanitizeExternalImage(
  imageUrl?: string | null
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
  try {
    const hostname = new URL(imageUrl).hostname.toLowerCase();
    if (
      !ALLOWED_IMAGE_HOSTS.has(hostname) &&
      !hostname.endsWith("apartments.com") &&
      !hostname.endsWith("aptcdn.com")
    ) {
      return undefined;
    }
  } catch (_error) {
    return undefined;
  }
  return imageUrl;
}

function buildApartmentsFallbackUrl(address?: string): string {
  if (!address) {
    return "https://www.apartments.com/";
  }
  const normalized = address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  if (normalized.length === 0) {
    return "https://www.apartments.com/";
  }
  return `https://www.apartments.com/${normalized}`;
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
