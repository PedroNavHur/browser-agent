"use client";

import { VoiceInputButton } from "./VoiceInputButton";

type ChatComposerProps = {
  input: string;
  isSending: boolean;
  isConvexConfigured: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onVoiceSubmitAction: (transcript: string) => Promise<void> | void;
};

export function ChatComposer({
  input,
  isSending,
  isConvexConfigured,
  onChange,
  onSubmit,
  onVoiceSubmitAction,
}: ChatComposerProps) {
  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <label className="form-control">
        <div className="label">
          <span className="label-text">What do you need the agent to do?</span>
          <span className="label-text-alt text-xs opacity-60">
            Example: "Find studios in Jersey City under $2,000 and allow pets"
          </span>
        </div>
        <textarea
          className="textarea textarea-bordered min-h-24"
          placeholder="Describe your real-estate mission"
          value={input}
          onChange={(event) => onChange(event.target.value)}
          disabled={isSending}
          required
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2 text-sm opacity-80 sm:flex-row sm:items-center">
          <VoiceInputButton
            disabled={isSending || !isConvexConfigured}
            onTranscriptionAction={onVoiceSubmitAction}
          />
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={isSending || !isConvexConfigured}
        >
          {isSending ? "Running..." : "Send to Buscalo"}
        </button>
      </div>
    </form>
  );
}
