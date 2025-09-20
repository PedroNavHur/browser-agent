"use client";

type ChatHeaderProps = {
  isConvexConfigured: boolean;
};

export function ChatHeader({ isConvexConfigured }: ChatHeaderProps) {
  return (
    <div className="flex flex-col gap-4 text-center sm:text-left">
      <header className="flex flex-col gap-2 text-center">
        <span className="badge badge-secondary badge-outline mx-auto w-fit">
          Buscalo · Browser Agent
        </span>
        <h1 className="text-3xl font-bold sm:text-4xl">Talk with Buscalo</h1>
        <p className="text-base-content/80">
          Describe your real-estate mission and we’ll prep the agent to navigate
          maps, apply filters, and extract real listings.
        </p>
      </header>
      <div className="flex items-center justify-between rounded-box border border-base-300 bg-base-100/70 px-4 py-3 text-left shadow-sm">
        <h2 className="text-lg font-semibold">Pilot chat</h2>
        <span
          className={`badge ${isConvexConfigured ? "badge-success" : "badge-warning"}`}
        >
          {isConvexConfigured ? "Convex ready" : "Configure Convex"}
        </span>
      </div>
    </div>
  );
}
