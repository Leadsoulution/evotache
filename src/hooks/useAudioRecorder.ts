"use client";

import { useCallback, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "transcribing";

interface UseAudioRecorderResult {
  state: RecorderState;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useAudioRecorder(onTranscript: (text: string) => void): UseAudioRecorderResult {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setState("idle");
          return;
        }
        setState("transcribing");
        try {
          const formData = new FormData();
          formData.set("audio", blob, "recording.webm");
          const response = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "Transcription failed.");
          } else if (data.text) {
            onTranscript(data.text as string);
          } else {
            setError("Didn't catch that — try recording again.");
          }
        } catch {
          setError("Could not reach the transcription service.");
        } finally {
          setState("idle");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("Microphone access was denied or unavailable.");
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  return { state, error, start, stop };
}
