"use node";

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";

const REUSE_WINDOW_MS = 55_000;

export type SessionHandle = {
  docId?: Id<"browserbaseSessions">;
  sessionId?: string;
  reused: boolean;
};

type LogFn = (message: string) => void;

export async function acquireBrowserbaseSession(
  ctx: ActionCtx,
  log?: LogFn,
): Promise<SessionHandle> {
  const now = Date.now();
  const cutoff = now - REUSE_WINDOW_MS;

  while (true) {
    const candidate = await ctx.runQuery(api.sessionPool.getAvailableSession, {
      cutoff,
    });
    if (!candidate) {
      break;
    }

    if (candidate.stale) {
      await ctx.runMutation(api.sessionPool.deleteSession, {
        id: candidate._id,
      });
      continue;
    }

    await ctx.runMutation(api.sessionPool.markInUse, {
      id: candidate._id,
      lastUsedAt: now,
    });
    log?.(`Reusing Browserbase session ${candidate.sessionId}`);
    return {
      docId: candidate._id,
      sessionId: candidate.sessionId,
      reused: true,
    };
  }

  log?.("No reusable Browserbase session available; a new one will be created");
  return { reused: false };
}

export async function releaseBrowserbaseSession(
  ctx: ActionCtx,
  handle: SessionHandle,
  sessionId: string,
  log?: LogFn,
) {
  const now = Date.now();
  if (handle.docId) {
    await ctx.runMutation(api.sessionPool.markAvailable, {
      id: handle.docId,
      sessionId,
      lastUsedAt: now,
    });
  } else {
    const docId = await ctx.runMutation(api.sessionPool.insertAvailable, {
      sessionId,
      timestamp: now,
    });
    handle.docId = docId;
  }
  log?.(`Marked Browserbase session ${sessionId} available for reuse`);
}

export async function discardBrowserbaseSession(
  ctx: ActionCtx,
  handle: SessionHandle,
  log?: LogFn,
) {
  if (handle.docId) {
    await ctx.runMutation(api.sessionPool.deleteSession, { id: handle.docId });
    log?.(
      `Discarded Browserbase session record ${handle.sessionId ?? "unknown"}`,
    );
  }
}
