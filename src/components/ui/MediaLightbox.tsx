"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { DownloadIcon, XIcon } from "@/components/ui/icons";

export interface MediaPreview {
  kind: "image" | "video";
  src: string;
  name: string;
}

interface MediaLightboxProps {
  media: MediaPreview | null;
  onClose: () => void;
}

export function MediaLightbox({ media, onClose }: MediaLightboxProps) {
  useEffect(() => {
    if (!media) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [media, onClose]);

  if (!media) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex animate-fade-in flex-col bg-black/90 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between text-white">
        <span className="truncate text-sm">{media.name}</span>
        <div className="flex items-center gap-1">
          <a href={media.src} download={media.name} className="rounded-md p-2 hover:bg-white/10" aria-label={`Download ${media.name}`}>
            <DownloadIcon className="h-5 w-5" />
          </a>
          <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-white/10" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {media.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.src} alt={media.name} className="max-h-full max-w-full rounded-lg object-contain" />
        ) : (
          <video src={media.src} controls autoPlay className="max-h-full max-w-full rounded-lg" />
        )}
      </div>
    </div>,
    document.body
  );
}
