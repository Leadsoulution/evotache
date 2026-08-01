"use client";

import { Avatar } from "@/components/ui/Avatar";
import { DownloadIcon, FileIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { formatBytes } from "@/lib/attachmentUtils";
import { cn } from "@/lib/cn";
import type { Message, MessageAttachment } from "@/types/chat";
import type { AppUser } from "@/types/user";

interface MessageBubbleProps {
  message: Message;
  sender: AppUser | null;
  isOwn: boolean;
  showSenderName: boolean;
  onOpenAttachment: (attachment: MessageAttachment) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

export function MessageBubble({ message, sender, isOwn, showSenderName, onOpenAttachment, onEdit, onDelete }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  if (message.deletedAt) {
    return (
      <div className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}>
        {!isOwn && <Avatar name={sender?.name ?? "?"} color={sender?.color ?? "#64748b"} photoDataUrl={sender?.photoDataUrl ?? null} size="xs" className="mb-1" />}
        <div className={cn("flex max-w-[72%] flex-col gap-1", isOwn && "items-end")}>
          {showSenderName && !isOwn && <span className="px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{sender?.name ?? "Unknown"}</span>}
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm italic text-slate-400 dark:text-slate-500",
              isOwn ? "rounded-br-sm bg-slate-100 dark:bg-slate-800" : "rounded-bl-sm bg-slate-100 dark:bg-slate-800"
            )}
          >
            This message was deleted
          </div>
          <span className="px-1 text-[10px] text-slate-400">{time}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group flex items-end gap-2", isOwn && "flex-row-reverse")}>
      {!isOwn && <Avatar name={sender?.name ?? "?"} color={sender?.color ?? "#64748b"} photoDataUrl={sender?.photoDataUrl ?? null} size="xs" className="mb-1" />}
      <div className={cn("relative flex max-w-[72%] flex-col gap-1", isOwn && "items-end")}>
        {showSenderName && !isOwn && <span className="px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{sender?.name ?? "Unknown"}</span>}

        {isOwn && (onEdit || onDelete) && (
          <div
            className={cn(
              "absolute top-0 z-10 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900",
              "-left-16"
            )}
          >
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(message)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Edit message"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(message)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
                aria-label="Delete message"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {message.attachments.map((attachment) => (
          <div key={attachment.id} className={cn("overflow-hidden rounded-2xl", isOwn ? "bg-indigo-600" : "bg-slate-100 dark:bg-slate-800")}>
            {attachment.kind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                onClick={() => onOpenAttachment(attachment)}
                className="block max-h-72 max-w-full cursor-pointer object-cover"
              />
            )}
            {attachment.kind === "video" && (
              <video
                src={attachment.dataUrl}
                onClick={() => onOpenAttachment(attachment)}
                className="block max-h-72 max-w-full cursor-pointer"
                muted
              />
            )}
            {(attachment.kind === "pdf" || attachment.kind === "file") && (
              <a
                href={attachment.dataUrl}
                download={attachment.name}
                className={cn("flex items-center gap-2 px-3 py-2.5", isOwn ? "text-white" : "text-slate-700 dark:text-slate-200")}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", isOwn ? "bg-white/15" : "bg-white dark:bg-slate-900")}>
                  <FileIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{attachment.name}</span>
                  <span className={cn("block text-[11px]", isOwn ? "text-indigo-100" : "text-slate-400")}>{formatBytes(attachment.sizeBytes)}</span>
                </span>
                <DownloadIcon className="h-3.5 w-3.5 shrink-0" />
              </a>
            )}
          </div>
        ))}

        {message.text && (
          <div
            className={cn(
              "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
              isOwn ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            )}
          >
            {message.text}
          </div>
        )}

        <span className="px-1 text-[10px] text-slate-400">
          {message.editedAt && <span className="italic">edited · </span>}
          {time}
        </span>
      </div>
    </div>
  );
}
