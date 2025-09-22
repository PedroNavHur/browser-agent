"use client";

import { useMemo, useState } from "react";
import { convexClient } from "@/app/convex-provider";
import { api } from "@/lib/convexApi";
import { AgentActivityLog } from "./AgentActivityLog";
import { ChatComposer } from "./chat/ChatComposer";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatMessageList } from "./chat/ChatMessageList";
import type { ChatMessage } from "./chat/types";
import { ListingsPanel } from "./listings/ListingsPanel";

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

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>(introMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);

  const isConvexConfigured = useMemo(() => Boolean(convexClient), []);

  const sendMessage = async (content: string) => {
    if (isSending) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    enqueueMessage(userMessage);
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

      const payload = threadId ? { text: trimmed, threadId } : { text: trimmed };
      const client = convexClient;
      if (!client) {
        throw new Error("Convex client unavailable");
      }

      const response = await client.action(api.agent.sendMessage, payload);

      enqueueMessage({
        id: `${response.threadId}-${Date.now()}`,
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

  const enqueueMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    setInput("");

    await sendMessage(trimmed);
  };

  const handleVoiceSubmit = async (transcript: string) => {
    await sendMessage(transcript);
  };

  return (
    <main className="min-h-screen bg-base-200 text-base-content">
      <div className="container mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10">
        <ChatHeader isConvexConfigured={isConvexConfigured} />

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="card flex h-full flex-col bg-base-100 shadow-xl">
            <div className="card-body flex h-full flex-col gap-6">
              <ChatMessageList messages={messages} />

              <ChatComposer
                input={input}
                isSending={isSending}
                isConvexConfigured={isConvexConfigured}
                onChange={(value) => setInput(value)}
                onSubmit={handleSubmit}
                onVoiceSubmitAction={handleVoiceSubmit}
              />
            </div>
          </section>

          <div className="flex h-full flex-col gap-4">
            {isConvexConfigured ? (
              <>
                <AgentActivityLog threadId={threadId} isRunning={isSending} />
                <ListingsPanel />
              </>
            ) : (
              <section className="card h-full bg-base-100 shadow-xl">
                <div className="card-body flex h-full flex-col items-center justify-center gap-3 text-center opacity-70">
                  <p>
                    Add your Convex deployment URL to enable live listing storage
                    and activity logs.
                  </p>
                  <p className="text-sm">
                    Once configured, Buscalo will surface real-time logs and
                    listings from your agent runs.
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
