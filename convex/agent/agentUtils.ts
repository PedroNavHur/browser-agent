import type { SearchEstateResult, StagehandListing } from "./agentTypes";

export function computeSharedTags(args: {
  pets?: boolean;
  bedrooms?: "studio" | number;
}): string[] {
  const { pets, bedrooms } = args;
  return [
    ...(pets ? ["pets_ok"] : []),
    ...(bedrooms === "studio" || bedrooms === 0 ? ["studio"] : []),
    ...(typeof bedrooms === "number" && bedrooms > 0 ? [`${bedrooms}br`] : []),
  ];
}

export function stagehandToSearchEstate(
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
    summary: `${listing.title} — ${priceLabel} • ${location}${
      bedLabel ? ` • ${bedLabel}` : ""
    }`,
    tags,
    phone: listing.phone,
    imageUrl: listing.imageUrl,
  };
}

export function normalizeLocation(input: string | undefined): {
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

  const cleaned = trimmed
    .replace(/[^a-z0-9\s,-]/g, " ")
    .replace(/[\s,-]+/g, " ")
    .trim();

  if (cleaned.length === 0) {
    return fallback;
  }

  const slug = cleaned
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length === 0) {
    return fallback;
  }

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z]{2}$/.test(slug)) {
    return {
      displayQuery: slugToDisplay(slug),
      locationSlug: slug,
    };
  }

  return {
    displayQuery: toTitleCase(cleaned),
    locationSlug: slug,
  };
}

function slugToDisplay(slug: string): string {
  const parts = slug.split("-");
  if (parts.length < 2) {
    return toTitleCase(slug.replace(/-/g, " "));
  }
  const state = parts[parts.length - 1];
  if (/^[a-z]{2}$/.test(state)) {
    const city = parts.slice(0, -1).join(" ");
    return `${toTitleCase(city)}, ${state.toUpperCase()}`;
  }
  return toTitleCase(slug.replace(/-/g, " "));
}

function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
