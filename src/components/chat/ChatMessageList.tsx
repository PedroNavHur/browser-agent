"use client";

import { AgentSpeechButton } from "./AgentSpeechButton";
import type { ChatMessage } from "./types";

type ChatMessageListProps = {
  messages: ChatMessage[];
};

export function ChatMessageList({ messages }: ChatMessageListProps) {
  return (
    <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto rounded-3xl border border-base-300 bg-base-200/60 p-4">
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
            {isAgent ? (
              <div className="chat-footer mt-1 flex flex-wrap items-center gap-3 text-xs opacity-80">
                <AgentSpeechButton text={message.text} />
                {message.hint ? <span>{message.hint}</span> : null}
              </div>
            ) : message.hint ? (
              <div className="chat-footer mt-1 text-xs opacity-60">
                {message.hint}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
