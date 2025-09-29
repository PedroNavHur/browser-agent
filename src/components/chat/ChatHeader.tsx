"use client";

import { Bot } from "lucide-react";

type ChatHeaderProps = {
  isConvexConfigured: boolean;
};

export function ChatHeader({ isConvexConfigured }: ChatHeaderProps) {
  return (
    <div className="flex flex-col gap-4 text-center sm:text-left">
      <div className="rounded-b-3xl border border-base-300 bg-base-100/70 px-4 py-3 text-left shadow-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm">
            <Bot className="mb-0.5 h-6 w-6" aria-hidden /> The first real-time
            real state browser agent
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`badge ${isConvexConfigured ? "badge-success" : "badge-warning"}`}
            >
              {isConvexConfigured ? "Agent Ready" : "Agent Disconnected..."}
            </span>
            <span className="badge badge-warning">Beta</span>
          </div>
        </div>
      </div>
    </div>
  );
}
