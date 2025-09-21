"use node";

import type { LogLine } from "@browserbasehq/stagehand";
import { Stagehand } from "@browserbasehq/stagehand";

export type StagehandEnv = {
  apiKey: string;
  projectId: string;
  openAiKey: string;
};

export function resolveStagehandEnv(): StagehandEnv {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  const openAiKey = process.env.OPENAI_API_KEY ?? process.env.CONVEX_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing BROWSERBASE_API_KEY environment variable.");
  }
  if (!projectId) {
    throw new Error("Missing BROWSERBASE_PROJECT_ID environment variable.");
  }
  if (!openAiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY (or CONVEX_OPENAI_API_KEY) environment variable."
    );
  }

  return { apiKey, projectId, openAiKey };
}

export function computeResultLimit(limit?: number | null): number {
  const numeric =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(1, Math.floor(limit))
      : 50;
  return Math.min(50, Math.max(25, numeric));
}

export function createStagehandClient(
  env: StagehandEnv,
  recordLog: (message: string) => void
): Stagehand {
  return new Stagehand({
    env: "BROWSERBASE",
    apiKey: env.apiKey,
    projectId: env.projectId,
    verbose: 1,
    waitForCaptchaSolves: true,
    enableCaching: false,
    modelName: process.env.STAGEHAND_MODEL ?? "gpt-4.1-mini",
    modelClientOptions: {
      apiKey: env.openAiKey,
      baseURL: process.env.OPENAI_BASE_URL,
    },
    disablePino: true,
    logger: (logLine: LogLine) => {
      const level = typeof logLine.level === "number" ? logLine.level : 1;
      if (level > 1) return;
      const category = logLine.category ?? "general";
      const message =
        typeof logLine.message === "string"
          ? logLine.message
          : JSON.stringify(logLine.message);
      const formatted =
        category && category !== "general"
          ? `Agent ${category}: ${message}`
          : `Agent ${message}`;
      console.log(`stagehand:${category} ${message}`);
      recordLog(formatted);
    },
  });
}

export function buildExtractionInstruction(resultLimit: number): string {
  return (
    `Extract the rental listing cards currently visible on the page (aim for up to ${resultLimit}). ` +
    "For each, provide only the title, displayed monthly price text, and the primary image URL (if available)."
  );
}
