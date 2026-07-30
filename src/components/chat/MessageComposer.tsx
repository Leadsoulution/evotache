"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { FileIcon, PaperclipIcon, SendIcon, XIcon } from "@/components/ui/icons";
import { MAX_CHAT_FILE_BYTES } from "@/services/chatApi";
import { useToast } from "@/components/ui/Toast";
import { formatBytes } from "@/lib/attachmentUtils";
import { cn } from "@/lib/cn";
import { uploadFile } from "@/services/uploadApi";

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

interface OutgoingAttachment {
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

interface MessageComposerProps {
  onSend: (text: string, attachments: OutgoingAttachment[]) => Promise<boolean>;
}

export function MessageComposer({ onSend }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  function handleFilesPicked(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const oversized = files.filter((f) => f.size > MAX_CHAT_FILE_BYTES);
    if (oversized.length > 0) {
      toast.error(`${oversized.map((f) => f.name).join(", ")} exceeds ${formatBytes(MAX_CHAT_FILE_BYTES)} and won't be sent.`);
    }
    const accepted = files.filter((f) => f.size <= MAX_CHAT_FILE_BYTES);
    const next = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setPendingFiles((current) => [...current, ...next]);
  }

  function removePending(id: string) {
    setPendingFiles((current) => current.filter((f) => f.id !== id));
  }

  async function handleSend() {
    if (sending) return;
    if (!text.trim() && pendingFiles.length === 0) return;
    setSending(true);
    let attachments: OutgoingAttachment[];
    try {
      attachments = await Promise.all(
        pendingFiles.map(async (pending) => ({
          name: pending.file.name,
          mimeType: pending.file.type || "application/octet-stream",
          sizeBytes: pending.file.size,
          dataUrl: await uploadFile(pending.file, "chat"),
        }))
      );
    } catch (err) {
      setSending(false);
      toast.error(err instanceof Error ? err.message : "Failed to upload attachment.");
      return;
    }
    const success = await onSend(text, attachments);
    setSending(false);
    if (success) {
      setText("");
      pendingFiles.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
      setPendingFiles([]);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-slate-200 px-3 py-2.5 dark:border-slate-800">
      {pendingFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingFiles.map((pending) => (
            <div key={pending.id} className="relative flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-1 pr-2 dark:border-slate-700 dark:bg-slate-800">
              {pending.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pending.previewUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-slate-400 dark:bg-slate-900">
                  <FileIcon className="h-4 w-4" />
                </span>
              )}
              <span className="max-w-[100px] truncate text-xs text-slate-600 dark:text-slate-300">{pending.file.name}</span>
              <button
                type="button"
                onClick={() => removePending(pending.id)}
                className="rounded-full bg-slate-200 p-0.5 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                aria-label={`Remove ${pending.file.name}`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Attach a file"
        >
          <PaperclipIcon className="h-4.5 w-4.5" />
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={handleFilesPicked} className="sr-only" />

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Type a message…"
          className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={sending || (!text.trim() && pendingFiles.length === 0)}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:cursor-not-allowed disabled:opacity-40",
            "bg-indigo-600 hover:bg-indigo-500"
          )}
          aria-label="Send message"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
