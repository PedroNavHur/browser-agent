import { v } from "convex/values";
import { action } from "./_generated/server";

export const sendMessage = action({
  args: {
    text: v.string(),
  },
  returns: v.object({
    reply: v.string(),
    trackingId: v.string(),
  }),
  handler: async (_, args) => {
    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new Error("Message cannot be empty.");
    }

    const trackingId = `mock-${Date.now()}`;
    const reply = [
      "🧭 Buscalo is spinning up its map automation stack.",
      "",
      "We'll soon navigate real listing sites with Browserbase + Stagehand,",
      `but for now here's an echo of your request: "${trimmed}".`,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      reply,
      trackingId,
    };
  },
});
