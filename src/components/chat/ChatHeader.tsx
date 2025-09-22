"use client";

type ChatHeaderProps = {
  isConvexConfigured: boolean;
};

export function ChatHeader({ isConvexConfigured }: ChatHeaderProps) {
  return (
    <div className="flex flex-col gap-4 text-center sm:text-left">
      <div className="rounded-box border border-base-300 bg-base-100/70 px-4 py-3 text-left shadow-sm lg:rounded-3xl">
        <div className="flex items-center justify-between">
          <span className="badge badge-secondary badge-outline">
            Buscalo · The First Real-Time Real Estate Browser Agent
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
