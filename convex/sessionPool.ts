import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAvailableSession = query({
  args: { cutoff: v.number() },
  handler: async (ctx, { cutoff }) => {
    const candidate = await ctx.db
      .query("browserbaseSessions")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .order("desc")
      .first();
    if (!candidate) return null;
    const stale = candidate.lastUsedAt < cutoff;
    return {
      _id: candidate._id,
      sessionId: candidate.sessionId,
      lastUsedAt: candidate.lastUsedAt,
      stale,
    };
  },
});

export const deleteSession = mutation({
  args: { id: v.id("browserbaseSessions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const markInUse = mutation({
  args: {
    id: v.id("browserbaseSessions"),
    lastUsedAt: v.number(),
  },
  handler: async (ctx, { id, lastUsedAt }) => {
    await ctx.db.patch(id, {
      status: "in_use",
      lastUsedAt,
    });
  },
});

export const markAvailable = mutation({
  args: {
    id: v.id("browserbaseSessions"),
    sessionId: v.string(),
    lastUsedAt: v.number(),
  },
  handler: async (ctx, { id, sessionId, lastUsedAt }) => {
    await ctx.db.patch(id, {
      sessionId,
      status: "available",
      lastUsedAt,
    });
  },
});

export const insertAvailable = mutation({
  args: {
    sessionId: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, { sessionId, timestamp }) => {
    return await ctx.db.insert("browserbaseSessions", {
      sessionId,
      status: "available",
      createdAt: timestamp,
      lastUsedAt: timestamp,
    });
  },
});
