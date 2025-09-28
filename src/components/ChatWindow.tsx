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

      const client = convexClient;
      if (!client) {
        throw new Error("Convex client unavailable");
      }

      let activeThreadId = threadId;

      if (!activeThreadId) {
        const ensured = await client.action(api.agent.ensureThread, {});
        activeThreadId = ensured.threadId;
        setThreadId(ensured.threadId);
      }

      const payload = activeThreadId
        ? { text: trimmed, threadId: activeThreadId }
        : { text: trimmed };

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
    <main className="min-h-screen w-full bg-base-200 text-base-content">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-6 pt-0 pb-14 lg:px-10">
        <ChatHeader isConvexConfigured={isConvexConfigured} />

        <div className="flex flex-col gap-4 md:h-[calc(100vh-8rem)] md:min-h-0 md:flex-row md:overflow-hidden">
          <section className="card flex h-full flex-[2_1_0%] flex-col overflow-hidden bg-base-100 shadow-sm md:h-full md:max-h-[calc(100vh-8rem)] lg:rounded-3xl">
            <div className="card-body flex h-full min-h-0 flex-col gap-8 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <ChatMessageList messages={messages} />
              </div>

              <div className="flex-shrink-0">
                <ChatComposer
                  input={input}
                  isSending={isSending}
                  isConvexConfigured={isConvexConfigured}
                  onChangeAction={(value) => setInput(value)}
                  onSubmitAction={handleSubmit}
                  onVoiceSubmitAction={handleVoiceSubmit}
                />
              </div>
            </div>
          </section>

          <div className="flex h-full min-h-0 flex-[3_1_0%] flex-col gap-4 overflow-hidden md:h-[calc(100vh-8rem)] md:max-h-[calc(100vh-8rem)]">
            {isConvexConfigured ? (
              <>
                <div className="flex-shrink-0">
                  <AgentActivityLog threadId={threadId} isRunning={isSending} />
                </div>
                <div className="flex min-h-0 flex-1 overflow-hidden">
                  <ListingsPanel className="h-full min-h-0" />
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl bg-base-100 p-8 text-center text-base-content/70 shadow-sm">
                <p>
                  Add your Convex deployment URL to enable live listing storage
                  and activity logs.
                </p>
                <p className="text-sm">
                  Once configured, Buscalo will surface real-time logs and
                  listings from your agent runs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
