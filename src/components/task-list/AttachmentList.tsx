"use client";

import { FileIcon, ImageIcon, LinkIcon, TrashIcon, VideoIcon } from "@/components/ui/icons";
import { formatBytes } from "@/lib/attachmentUtils";
import type { Attachment, AttachmentKind } from "@/types/attachment";

const KIND_ICON: Record<AttachmentKind, typeof FileIcon> = {
  image: ImageIcon,
  video: VideoIcon,
  pdf: FileIcon,
  spreadsheet: FileIcon,
  file: FileIcon,
  link: LinkIcon,
};

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

export function AttachmentList({ attachments, onDelete, readOnly }: AttachmentListProps) {
  if (attachments.length === 0) {
    return <p className="text-sm text-slate-400">No attachments yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((attachment) => {
        const Icon = KIND_ICON[attachment.kind];
        const href = attachment.kind === "link" ? attachment.linkUrl : attachment.dataUrl;
        return (
          <li
            key={attachment.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
          >
            {attachment.kind === "image" && attachment.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.dataUrl} alt={attachment.name} className="h-9 w-9 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <a
              href={href ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              download={attachment.kind !== "link" ? attachment.name : undefined}
              className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:underline dark:text-slate-200"
            >
              {attachment.name}
            </a>
            {attachment.sizeBytes > 0 && <span className="shrink-0 text-xs text-slate-400">{formatBytes(attachment.sizeBytes)}</span>}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onDelete(attachment.id)}
                className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                aria-label={`Remove ${attachment.name}`}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
