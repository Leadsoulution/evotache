"use client";

import { ContentAssigneeMenu } from "./ContentAssigneeMenu";
import { CircleDashedIcon, TrashIcon } from "@/components/ui/icons";
import { formatDueDate } from "@/lib/date";
import { PLATFORM_META } from "@/config/socialMeta";
import { cn } from "@/lib/cn";
import type { KanbanCardRenderState } from "./ContentKanbanBoard";
import type { Story } from "@/types/socialMedia";
import type { AppUser } from "@/types/user";

interface StoryCardProps {
  story: Story;
  users: AppUser[];
  canManage: boolean;
  onOpen: (story: Story) => void;
  onRequestDelete: (id: string) => void;
  dragState: KanbanCardRenderState;
}

export function StoryCard({ story, users, canManage, onOpen, onRequestDelete, dragState }: StoryCardProps) {
  const platform = PLATFORM_META[story.platform];

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
      <button type="button" onClick={() => onOpen(story)} className="flex items-start gap-1.5 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
        <CircleDashedIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        {story.title}
      </button>
      {story.client && <p className="truncate text-xs text-slate-400">{story.client}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${platform.color}22`, color: platform.color }}>
          {platform.label}
        </span>
        {story.dueDate && <span className="text-[11px] text-slate-400">Due {formatDueDate(story.dueDate)}</span>}
      </div>

      <div className="flex items-center gap-2">
        <ContentAssigneeMenu users={users} value={story.assigneeId} onChange={() => {}} readOnly />
        {canManage && (
          <button
            type="button"
            onClick={() => onRequestDelete(story.id)}
            className="ml-auto rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label={`Delete ${story.title}`}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
