"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/convexApi";
import { convexClient } from "./convex-provider";

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  hint?: string;
};

const introMessages: ChatMessage[] = [
  {
    id: "intro-1",
    role: "agent",
    text: "Hi, I'm Buscalo — your map-savvy real estate scout.",
    hint: "Ask me to find rentals, apply filters, or prep an export.",
  },
  {
    id: "intro-2",
    role: "agent",
    text: "Tell me the city, budget, and must-haves and I'll get to work.",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(introMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  const isConvexConfigured = useMemo(() => Boolean(convexClient), []);

  const enqueueMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    enqueueMessage(userMessage);
    setInput("");
    setIsSending(true);

    try {
      if (!isConvexConfigured) {
        enqueueMessage({
          id: `agent-missing-${Date.now()}`,
          role: "agent",
          text: "Convex isn't configured yet. Add NEXT_PUBLIC_CONVEX_URL and try again.",
        });
        return;
      }

      const client = convexClient;
      if (!client) {
        throw new Error("Convex client unavailable");
      }

      const payload = threadId
        ? { text: trimmed, threadId }
        : { text: trimmed };

      const response = await client.action(api.agent.sendMessage, payload);

      enqueueMessage({
        id: response.threadId,
        role: "agent",
        text: response.reply,
        hint: `Thread ID: ${response.threadId}`,
      });
      setThreadId(response.threadId);
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Something went wrong while contacting the agent.";
      enqueueMessage({
        id: `agent-error-${Date.now()}`,
        role: "agent",
        text: "I couldn't send your message right now.",
        hint: errorText,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="container mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2 text-center">
          <span className="badge badge-secondary badge-outline mx-auto w-fit">
            Buscalo · Browser Agent
          </span>
          <h1 className="text-3xl font-bold sm:text-4xl">Talk with Buscalo</h1>
          <p className="text-base-content/80">
            Describe your real-estate mission and we’ll prep the agent to
            navigate maps, apply filters, and extract real listings.
          </p>
        </header>

        <section className="card flex-1 bg-base-100 shadow-xl">
          <div className="card-body flex h-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Pilot chat</h2>
              <span
                className={`badge ${isConvexConfigured ? "badge-success" : "badge-warning"}`}
              >
                {isConvexConfigured ? "Convex ready" : "Configure Convex"}
              </span>
            </div>

            <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto rounded-box border border-base-300 bg-base-200/60 p-4">
              {messages.map((message) => {
                const isAgent = message.role === "agent";
                return (
                  <div
                    key={message.id}
                    className={`chat ${isAgent ? "chat-start" : "chat-end"}`}
                  >
                    <div className="chat-header mb-1 text-sm opacity-70">
                      {isAgent ? "Buscalo" : "You"}
                    </div>
                    <div
                      className={`chat-bubble ${
                        isAgent ? "chat-bubble-primary" : "chat-bubble-accent"
                      } whitespace-pre-wrap`}
                    >
                      {message.text}
                    </div>
                    {message.hint ? (
                      <div className="chat-footer mt-1 text-xs opacity-60">
                        {message.hint}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              <label className="form-control">
                <div className="label">
                  <span className="label-text">
                    What do you need the agent to do?
                  </span>
                  <span className="label-text-alt text-xs opacity-60">
                    Example: "Find studios in Jersey City under $2,000 and allow
                    pets"
                  </span>
                </div>
                <textarea
                  className="textarea textarea-bordered min-h-24"
                  placeholder="Describe your real-estate mission"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={isSending}
                  required
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm opacity-70">
                  Browserbase + Stagehand integration arrives in the next
                  iteration.
                </span>
                <button
                  className={`btn btn-primary ${isSending ? "loading" : ""}`}
                  type="submit"
                  disabled={isSending || !isConvexConfigured}
                >
                  {isSending ? "Sending" : "Send to Buscalo"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
