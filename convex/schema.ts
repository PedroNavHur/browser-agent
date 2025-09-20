import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  listings: defineTable({
    threadId: v.string(),
    title: v.string(),
    address: v.string(),
    price: v.number(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    url: v.string(),
    createdAt: v.number(),
  }).index("by_thread_url", ["threadId", "url"]),

  favorites: defineTable({
    threadId: v.string(),
    title: v.string(),
    address: v.string(),
    price: v.number(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    url: v.string(),
    favoritedAt: v.number(),
  }).index("by_thread_url", ["threadId", "url"]),
});
