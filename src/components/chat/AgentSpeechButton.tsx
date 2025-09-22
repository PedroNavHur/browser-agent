"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Square, Volume2 } from "lucide-react";

type AgentSpeechButtonProps = {
  text: string;
};

export function AgentSpeechButton({ text }: AgentSpeechButtonProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const ensureAudio = async () => {
    if (audioUrl) {
      return audioUrl;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate speech");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      audioRef.current && (audioRef.current.currentTime = 0);
      setIsPlaying(false);
      return;
    }

    try {
      const url = await ensureAudio();
      if (!url) return;

      if (!audioRef.current) {
        audioRef.current = new Audio(url);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onpause = () => setIsPlaying(false);
      } else {
        audioRef.current.currentTime = 0;
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      // Error state handled in ensureAudio
    }
  };

  const label = isPlaying
    ? "Stop playback"
    : audioUrl
      ? "Play response"
      : "Speak response";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="btn btn-ghost btn-xs gap-1"
        aria-live="polite"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isPlaying ? (
          <Square className="h-3 w-3" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
        <span>{label}</span>
      </button>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </div>
  );
}
