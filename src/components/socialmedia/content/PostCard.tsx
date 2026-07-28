"use client";

import { ContentAssigneeMenu } from "./ContentAssigneeMenu";
import { FlagIcon, ImageIcon, TrashIcon } from "@/components/ui/icons";
import { formatDueDate } from "@/lib/date";
import { CONTENT_PRIORITY_META } from "@/config/socialMeta";
import { cn } from "@/lib/cn";
import type { KanbanCardRenderState } from "./ContentKanbanBoard";
import type { Post } from "@/types/socialMedia";
import type { AppUser } from "@/types/user";

interface PostCardProps {
  post: Post;
  users: AppUser[];
  canManage: boolean;
  onOpen: (post: Post) => void;
  onRequestDelete: (id: string) => void;
  dragState: KanbanCardRenderState;
}

export function PostCard({ post, users, canManage, onOpen, onRequestDelete, dragState }: PostCardProps) {
  const priority = CONTENT_PRIORITY_META[post.priority];

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
      <button type="button" onClick={() => onOpen(post)} className="flex items-start gap-1.5 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
        <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        {post.title}
      </button>
      {post.client && <p className="truncate text-xs text-slate-400">{post.client}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${priority.color}22`, color: priority.color }}>
          <FlagIcon className="h-3 w-3" />
          {priority.label}
        </span>
        {post.publishingDate && <span className="text-[11px] text-slate-400">{formatDueDate(post.publishingDate)}</span>}
      </div>

      <div className="flex items-center gap-2">
        <ContentAssigneeMenu users={users} value={post.assigneeId} onChange={() => {}} readOnly />
        {canManage && (
          <button
            type="button"
            onClick={() => onRequestDelete(post.id)}
            className="ml-auto rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label={`Delete ${post.title}`}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
