"use client";

import { SquarePen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { VoiceInputButton } from "./VoiceInputButton";

type ChatComposerProps = {
  input: string;
  isSending: boolean;
  isConvexConfigured: boolean;
  onChangeAction: (value: string) => void;
  onSubmitAction: (event: React.FormEvent<HTMLFormElement>) => void;
  onVoiceSubmitAction: (transcript: string) => Promise<void> | void;
};

export function ChatComposer({
  input,
  isSending,
  isConvexConfigured,
  onChangeAction,
  onSubmitAction,
  onVoiceSubmitAction,
}: ChatComposerProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isComposerOpen) {
      textareaRef.current?.focus();
    }
  }, [isComposerOpen]);

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmitAction}>
      <div className="flex items-center justify-center gap-3">
        <VoiceInputButton
          disabled={isSending || !isConvexConfigured}
          onTranscriptionAction={onVoiceSubmitAction}
        />
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => setIsComposerOpen((prev) => !prev)}
          aria-expanded={isComposerOpen}
          aria-controls="chat-composer-text"
        >
          <SquarePen className="h-4 w-4" aria-hidden />
          <span className="sr-only">
            {isComposerOpen ? "Hide text composer" : "Type a request"}
          </span>
        </button>
      </div>

      {isComposerOpen ? (
        <>
          <label className="form-control w-full" htmlFor="chat-composer-text">
            <div className="label flex flex-col items-start text-left">
              <span className="label-text">
                What do you need the agent to do?
              </span>
              <span className="label-text-alt mb-1 text-xs opacity-60">
                Example: "Find studios in Jersey City under $2,000 and allow
                pets"
              </span>
            </div>
            <textarea
              id="chat-composer-text"
              ref={textareaRef}
              className="textarea textarea-bordered min-h-24 w-full"
              placeholder="Describe your real-estate mission"
              value={input}
              onChange={(event) => onChangeAction(event.target.value)}
              disabled={isSending}
              required
            />
          </label>
          <div className="flex justify-end">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={
                isSending || !isConvexConfigured || input.trim().length === 0
              }
            >
              {isSending ? "Running..." : "Send to Buscalo"}
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}
