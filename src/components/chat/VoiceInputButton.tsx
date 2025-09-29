"use client";

import { Loader2, Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type VoiceInputButtonProps = {
  disabled?: boolean;
  onTranscriptionAction: (transcript: string) => Promise<void> | void;
};

export function VoiceInputButton({
  disabled,
  onTranscriptionAction,
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const skipTranscriptionRef = useRef(false);

  type StopOptions = {
    force?: boolean;
    skipTranscription?: boolean;
  };

  const stopRecording = useCallback(
    ({ force, skipTranscription }: StopOptions = {}) => {
      if (skipTranscription) {
        skipTranscriptionRef.current = true;
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.warn("voice-input", "Unable to stop recorder", error);
        }
      }
      mediaRecorderRef.current = null;

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        mediaStreamRef.current = null;
      }

      if (force) {
        skipTranscriptionRef.current = true;
      }

      setIsRecording(false);
      startedAtRef.current = null;
    },
    [],
  );

  useEffect(() => {
    setIsSupported(
      typeof window !== "undefined" && Boolean(navigator.mediaDevices),
    );

    return () => {
      stopRecording({ force: true, skipTranscription: true });
    };
  }, [stopRecording]);

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "command.webm");

        console.debug("voice-input", "Uploading audio blob", {
          size: blob.size,
          type: blob.type,
        });

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const status = response.status;
          console.error("voice-input", "Transcription API error", {
            status,
            body,
          });
          type Attempt = { model?: string; status?: number };
          const attemptsSummary = Array.isArray(body.attempts)
            ? (body.attempts as Attempt[])
                .map(
                  (attempt) =>
                    `${attempt.model ?? "unknown"}: ${attempt.status ?? "?"}`,
                )
                .join(" | ")
            : undefined;
          throw new Error(
            body.error
              ? `${body.error}${attemptsSummary ? ` (${attemptsSummary})` : ""}`
              : `Transcription failed (${status})`,
          );
        }

        const result = await response.json();
        console.debug("voice-input", "Transcription success", result);
        const transcript =
          typeof result.text === "string" ? result.text.trim() : "";
        if (transcript) {
          await onTranscriptionAction(transcript);
        } else {
          setError("I couldn't understand that recording.");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to transcribe audio";
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [onTranscriptionAction],
  );

  const startRecording = useCallback(async () => {
    if (isRecording || isProcessing) {
      return;
    }

    try {
      setError(null);
      setIsRecording(true);
      skipTranscriptionRef.current = false;
      audioChunksRef.current = [];
      startedAtRef.current = performance.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType: string | undefined;
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const recordedMimeType = mimeType ?? "audio/webm";
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (skipTranscriptionRef.current) {
          skipTranscriptionRef.current = false;
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recordedMimeType,
        });
        audioChunksRef.current = [];
        await transcribeAudio(audioBlob);
      };

      recorder.start();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to access microphone";
      setError(message);
      setIsRecording(false);
      stopRecording({ force: true, skipTranscription: true });
    }
  }, [isProcessing, isRecording, stopRecording, transcribeAudio]);

  const finishRecording = useCallback(
    (options?: { minimumDurationMs?: number }) => {
      if (!isRecording) {
        return;
      }

      const startedAt = startedAtRef.current;
      const duration = startedAt ? performance.now() - startedAt : 0;
      const minimum = options?.minimumDurationMs ?? 600;
      if (duration < minimum) {
        setError("I barely heard that — try speaking a bit longer.");
        stopRecording({ skipTranscription: true });
        return;
      }

      console.debug("voice-input", "Stopping recording", {
        durationMs: duration,
      });
      stopRecording();
    },
    [isRecording, stopRecording],
  );

  const handleToggleRecording = async () => {
    if (!isSupported || disabled || isProcessing) {
      if (!isSupported) {
        console.warn("voice-input", "Navigator mediaDevices unsupported");
      }
      return;
    }

    if (isRecording) {
      finishRecording();
    } else {
      console.debug("voice-input", "Starting recording");
      await startRecording();
    }
  };

  const buttonLabel = !isSupported
    ? "Voice input not supported"
    : isRecording
      ? "Tap to finish"
      : "Tap to speak";

  const statusMessage = (() => {
    if (isProcessing) return "Processing…";
    if (error) return error;
    if (disabled) return "Agent working…";
    return "Tap once to start, tap again to send.";
  })();

  const statusClass = error ? "text-error" : "opacity-70";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`btn btn-sm gap-2 ${
          isRecording ? "btn-error" : "btn-ghost"
        }`}
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing || !isSupported}
        aria-pressed={isRecording}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span>{buttonLabel}</span>
      </button>
      <div className="flex flex-col text-xs">
        <span className={statusClass}>{statusMessage}</span>
      </div>
    </div>
  );
}
