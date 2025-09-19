"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl)
  : undefined;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => convexClient, []);

  if (!client) {
    return (
      <div className="bg-base-200 text-warning-content">
        <div className="container mx-auto max-w-2xl p-6">
          <div className="alert alert-warning">
            <span>
              Missing Convex deployment. Set <code>NEXT_PUBLIC_CONVEX_URL</code>{" "}
              to enable live agent interactions.
            </span>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
