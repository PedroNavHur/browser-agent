import { z } from "zod";

export const extractionSchema = z.object({
  listings: z
    .array(
      z.object({
        title: z.string().min(1),
        price: z.string().min(1),
        imageUrl: z.string().url().optional(),
        address: z.string().min(1).optional(),
      }),
    )
    .max(50)
    .default([]),
});

export type ExtractedListing = z.infer<
  typeof extractionSchema
>["listings"][number];

export type NormalizedListing = {
  title: string;
  address?: string;
  price: number;
  priceRaw: string;
  beds?: number;
  imageUrl?: string;
  source: string;
};

export type RejectionReason = {
  type: "price" | "location" | "bedrooms";
  detail: string;
};

export type RejectedListing = {
  listing: NormalizedListing;
  reasons: RejectionReason[];
};

export const ALLOWED_IMAGE_HOSTS = new Set([
  "apartments.com",
  "images1.apartments.com",
  "images2.apartments.com",
  "images3.apartments.com",
  "images4.apartments.com",
  "aptcdn.com",
]);
