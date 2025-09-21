"use node";

import type { ActionCtx } from "../_generated/server";

import { api } from "../_generated/api";

type LogCtx = ActionCtx;

export type RunLogger = {
  runId: string;
  allLogs: string[];
  recordLog: (message: string) => void;
  startRunIfNeeded: (initialMessage?: string) => Promise<void>;
};

export function createRunLogger(
  ctx: LogCtx,
  options: { threadId?: string | null; runId?: string | null }
): RunLogger {
  const threadId = options.threadId ?? null;
  const runId = options.runId ?? `run-${Date.now()}`;
  const allLogs: string[] = [];
  let runStarted = false;

  const sendLog = async (messages: string[]) => {
    if (!threadId || messages.length === 0) {
      return;
    }
    await ctx.runMutation(api.logs.appendLogs, {
      threadId,
      runId,
      messages,
    });
  };

  const recordLog = (raw: string) => {
    const message = raw.trim();
    if (!message) {
      return;
    }
    allLogs.push(message);
    if (threadId) {
      void sendLog([message]).catch(() => undefined);
    }
  };

  const startRunIfNeeded = async (initialMessage?: string) => {
    if (!threadId || runStarted) {
      return;
    }
    runStarted = true;
    await ctx.runMutation(api.logs.startRun, {
      threadId,
      runId,
      initialMessage,
    });
    if (initialMessage) {
      allLogs.push(initialMessage.trim());
    }
  };

  return { runId, allLogs, recordLog, startRunIfNeeded };
}
