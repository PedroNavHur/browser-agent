import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startRun = mutation({
  args: {
    threadId: v.string(),
    runId: v.string(),
    initialMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, runId, initialMessage }) => {
    const existing = await ctx.db
      .query("execLogs")
      .withIndex("by_thread_time", (q) => q.eq("threadId", threadId))
      .collect();

    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    if (initialMessage) {
      await ctx.db.insert("execLogs", {
        threadId,
        runId,
        message: initialMessage,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

export const appendLogs = mutation({
  args: {
    threadId: v.string(),
    runId: v.string(),
    messages: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, runId, messages }) => {
    if (messages.length === 0) {
      return null;
    }

    let ts = Date.now();
    for (const message of messages) {
      await ctx.db.insert("execLogs", {
        threadId,
        runId,
        message,
        createdAt: ts,
      });
      ts += 1;
    }

    return null;
  },
});

export const listLogsByThread = query({
  args: {
    threadId: v.string(),
  },
  returns: v.array(
    v.object({
      id: v.id("execLogs"),
      message: v.string(),
      runId: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, { threadId }) => {
    const docs = await ctx.db
      .query("execLogs")
      .withIndex("by_thread_time", (q) => q.eq("threadId", threadId))
      .collect();

    return docs
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((doc) => ({
        id: doc._id,
        message: doc.message,
        runId: doc.runId,
        createdAt: doc.createdAt,
      }));
  },
});
