import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const listingObject = v.object({
  title: v.string(),
  address: v.string(),
  price: v.number(),
  phone: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
});

export const recordListings = mutation({
  args: {
    threadId: v.string(),
    listings: v.array(listingObject),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, listings }) => {
    const now = Date.now();

    for (const listing of listings) {
      const existing = await ctx.db
        .query("listings")
        .withIndex("by_thread_title_address", (q) =>
          q
            .eq("threadId", threadId)
            .eq("title", listing.title)
            .eq("address", listing.address),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          title: listing.title,
          address: listing.address,
          price: listing.price,
          phone: listing.phone,
          imageUrl: listing.imageUrl,
        });
        continue;
      }

      await ctx.db.insert("listings", {
        threadId,
        title: listing.title,
        address: listing.address,
        price: listing.price,
        phone: listing.phone,
        imageUrl: listing.imageUrl,
        createdAt: now,
      });
    }

    return null;
  },
});

export const listListings = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("listings"),
      title: v.string(),
      address: v.string(),
      price: v.number(),
      phone: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query("listings").order("desc").collect();
    return docs.map((doc) => ({
      id: doc._id,
      title: doc.title,
      address: doc.address,
      price: doc.price,
      phone: doc.phone,
      imageUrl: doc.imageUrl,
      createdAt: doc.createdAt,
    }));
  },
});

export const listFavorites = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("favorites"),
      title: v.string(),
      address: v.string(),
      price: v.number(),
      phone: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      favoritedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query("favorites").order("desc").collect();
    return docs.map((doc) => ({
      id: doc._id,
      title: doc.title,
      address: doc.address,
      price: doc.price,
      phone: doc.phone,
      imageUrl: doc.imageUrl,
      favoritedAt: doc.favoritedAt,
    }));
  },
});

export const favoriteListing = mutation({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.null(),
  handler: async (ctx, { listingId }) => {
    const listing = await ctx.db.get(listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_thread_title_address", (q) =>
        q
          .eq("threadId", listing.threadId)
          .eq("title", listing.title)
          .eq("address", listing.address),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("favorites", {
        threadId: listing.threadId,
        title: listing.title,
        address: listing.address,
        price: listing.price,
        phone: listing.phone,
        imageUrl: listing.imageUrl,
        favoritedAt: Date.now(),
      });
    }

    await ctx.db.delete(listingId);
    return null;
  },
});

export const removeListing = mutation({
  args: {
    listingId: v.id("listings"),
  },
  returns: v.null(),
  handler: async (ctx, { listingId }) => {
    await ctx.db.delete(listingId);
    return null;
  },
});

export const removeFavorite = mutation({
  args: {
    favoriteId: v.id("favorites"),
  },
  returns: v.null(),
  handler: async (ctx, { favoriteId }) => {
    await ctx.db.delete(favoriteId);
    return null;
  },
});
