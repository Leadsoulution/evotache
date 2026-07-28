"use client";

import { ContentAssigneeMenu } from "./ContentAssigneeMenu";
import { FlagIcon, TrashIcon, VideoIcon } from "@/components/ui/icons";
import { formatDueDate } from "@/lib/date";
import { APPROVAL_STATUS_META, CONTENT_PRIORITY_META } from "@/config/socialMeta";
import { cn } from "@/lib/cn";
import type { KanbanCardRenderState } from "./ContentKanbanBoard";
import type { Reel } from "@/types/socialMedia";
import type { AppUser } from "@/types/user";

interface ReelCardProps {
  reel: Reel;
  users: AppUser[];
  canManage: boolean;
  onOpen: (reel: Reel) => void;
  onRequestDelete: (id: string) => void;
  dragState: KanbanCardRenderState;
}

export function ReelCard({ reel, users, canManage, onOpen, onRequestDelete, dragState }: ReelCardProps) {
  const priority = CONTENT_PRIORITY_META[reel.priority];
  const approval = APPROVAL_STATUS_META[reel.approvalStatus];

  return (
    <div
      draggable={canManage}
      onDragStart={dragState.onDragStart}
      onDragEnd={dragState.onDragEnd}
      onDragOver={dragState.onDragOverCard}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        canManage && "cursor-grab active:cursor-grabbing",
        dragState.dragging && "opacity-40"
      )}
    >
      <button type="button" onClick={() => onOpen(reel)} className="flex items-start gap-1.5 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
        <VideoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        {reel.title}
      </button>
      {reel.client && <p className="truncate text-xs text-slate-400">{reel.client}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${priority.color}22`, color: priority.color }}>
          <FlagIcon className="h-3 w-3" />
          {priority.label}
        </span>
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${approval.color}22`, color: approval.color }}>
          {approval.label}
        </span>
        {reel.publishingDate && <span className="text-[11px] text-slate-400">Publish {formatDueDate(reel.publishingDate)}</span>}
      </div>

      <div className="flex items-center gap-2">
        <ContentAssigneeMenu users={users} value={reel.assigneeId} onChange={() => {}} readOnly />
        {canManage && (
          <button
            type="button"
            onClick={() => onRequestDelete(reel.id)}
            className="ml-auto rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label={`Delete ${reel.title}`}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
