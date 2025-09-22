import { openai } from "@ai-sdk/openai";
import { Agent, type AgentComponent, createThread } from "@convex-dev/agent";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { action } from "./_generated/server";
import { displayListings, searchEstate } from "./agentTools";

const agentComponent = (components as { agent: AgentComponent }).agent;

export const buscaloAgent = new Agent(agentComponent, {
  name: "Buscalo",
  languageModel: openai.chat("gpt-5-mini"),
  instructions: [
    "You are Buscalo, a browser automation specialist focused on real-estate map listings.",
    "Explain what you can do today, what is on the roadmap, and how the Browserbase + Stagehand stack powers the workflow.",
    "When features are not yet implemented, be transparent and suggest next steps.",
    "Use the searchEstate tool to fetch live listings via Stagehand and call displayListings to sync them into the UI tables.",
    "When calling searchEstate, always pass the location as a lowercase '[city]-[state]' slug with a two-letter US state; if the user only provides a city, infer the most likely state before building the slug (e.g. 'manhattan-ny', 'jersey-city-nj').",
    "If the user asks for a feature outside your current capabilities, politely decline and recommend alternative next steps.",
    "When a location is ambiguous or missing state information, ask the user to clarify the exact city and state before proceeding.",
    "Keep answers concise (3-4 sentences) and focus on actionable guidance for the user.",
  ].join(" "),
  tools: { searchEstate, displayListings },
  maxSteps: 4,
});

export const sendMessage = action({
  args: {
    text: v.string(),
    threadId: v.optional(v.string()),
  },
  returns: v.object({
    reply: v.string(),
    threadId: v.string(),
  }),
  handler: async (ctx, { text, threadId }) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new Error("Message cannot be empty.");
    }

    const activeThreadId =
      threadId ?? ((await createThread(ctx, agentComponent)) as string);
    const result = await buscaloAgent.generateText(
      ctx,
      { threadId: activeThreadId },
      { prompt: trimmed }
    );

    return {
      reply: result.text,
      threadId: activeThreadId,
    };
  },
});
