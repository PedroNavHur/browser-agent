"use client";

import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/convexApi";

type AgentActivityLogProps = {
  threadId?: string;
  isRunning: boolean;
};

export function AgentActivityLog({
  threadId,
  isRunning,
}: AgentActivityLogProps) {
  const logs = useQuery(
    api.logs.listLogsByThread,
    threadId ? { threadId } : "skip",
  );

  const items = useMemo(() => logs ?? [], [logs]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || items.length === 0) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [items.length]);

  const statusLabel = isRunning
    ? "Running"
    : items.length > 0
      ? "Completed"
      : "Idle";

  const statusTone = isRunning ? "badge-primary" : "badge-neutral";

  return (
    <section className="card bg-base-100 shadow-sm lg:rounded-3xl">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title font-semibold text-sm uppercase tracking-wide">
            Agent Activity
          </h2>
          <span className={`badge badge-sm ${statusTone}`}>{statusLabel}</span>
        </div>

        <div
          ref={scrollContainerRef}
          className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto rounded-box border border-base-300/70 bg-base-200/60 p-3 text-sm"
        >
          {threadId ? (
            items.length > 0 ? (
              items.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 rounded-lg bg-base-100/80 p-2 shadow-sm"
                >
                  <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-primary/70" />
                  <div>
                    <p className="leading-snug">{log.message}</p>
                    <p className="text-xs opacity-60">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm opacity-60">
                Logs will appear here as soon as the agent runs.
              </p>
            )
          ) : (
            <p className="text-sm opacity-60">
              Send your first request to see the agent's live activity.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
