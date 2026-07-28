"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { DownloadIcon, XIcon } from "@/components/ui/icons";
import type { MessageAttachment } from "@/types/chat";

interface AttachmentLightboxProps {
  attachment: MessageAttachment | null;
  onClose: () => void;
}

export function AttachmentLightbox({ attachment, onClose }: AttachmentLightboxProps) {
  useEffect(() => {
    if (!attachment) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [attachment, onClose]);

  if (!attachment) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex animate-fade-in flex-col bg-black/90 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between text-white">
        <span className="truncate text-sm">{attachment.name}</span>
        <div className="flex items-center gap-1">
          <a
            href={attachment.dataUrl}
            download={attachment.name}
            className="rounded-md p-2 hover:bg-white/10"
            aria-label={`Download ${attachment.name}`}
          >
            <DownloadIcon className="h-5 w-5" />
          </a>
          <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-white/10" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {attachment.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attachment.dataUrl} alt={attachment.name} className="max-h-full max-w-full rounded-lg object-contain" />
        ) : (
          <video src={attachment.dataUrl} controls autoPlay className="max-h-full max-w-full rounded-lg" />
        )}
      </div>
    </div>,
    document.body
  );
}
