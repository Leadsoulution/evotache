"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { usePosts } from "@/hooks/usePosts";
import { canManageWorkflow } from "@/config/roleMeta";
import { ContentKanbanBoard } from "./ContentKanbanBoard";
import { ContentListView } from "./ContentListView";
import { ContentViewToggle } from "./ContentViewToggle";
import type { ContentViewMode } from "./ContentViewToggle";
import { ContentAssigneeMenu } from "./ContentAssigneeMenu";
import { ContentLinkField } from "./ContentLinkField";
import { PostCard } from "./PostCard";
import { PostDialog } from "./PostDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { PlusIcon } from "@/components/ui/icons";
import { formatDueDate } from "@/lib/date";
import { CONTENT_STAGE_STATUS_META, CONTENT_STAGE_STATUS_ORDER, CONTENT_PRIORITY_META } from "@/config/socialMeta";
import type { ContentStageStatus, Post } from "@/types/socialMedia";
import type { ContentListColumn } from "./ContentListView";

const COLUMNS = CONTENT_STAGE_STATUS_ORDER.map((id) => ({ id, label: CONTENT_STAGE_STATUS_META[id].label, color: CONTENT_STAGE_STATUS_META[id].color }));

function badge(label: string, color: string) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${color}22`, color }}>
      {label}
    </span>
  );
}

export function PostsBoard() {
  const { user } = useAuth();
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { users } = useUsers();
  const { posts, loadState, addPost, editPost, removePost } = usePosts();

  const [viewMode, setViewMode] = useState<ContentViewMode>("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<ContentStageStatus | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingPost = posts.find((p) => p.id === pendingDeleteId) ?? null;

  function openEdit(post: Post) {
    setEditingPost(post);
    setDialogOpen(true);
  }

  const listColumns: ContentListColumn<Post>[] = [
    { key: "client", label: "Client", render: (p) => p.client || "—" },
    { key: "assignee", label: "Assigned to", render: (p) => <ContentAssigneeMenu users={users} value={p.assigneeId} onChange={() => {}} readOnly /> },
    { key: "status", label: "Status", render: (p) => badge(CONTENT_STAGE_STATUS_META[p.status].label, CONTENT_STAGE_STATUS_META[p.status].color) },
    { key: "priority", label: "Priority", render: (p) => badge(CONTENT_PRIORITY_META[p.priority].label, CONTENT_PRIORITY_META[p.priority].color) },
    { key: "publish", label: "Publishing date", render: (p) => (p.publishingDate ? formatDueDate(p.publishingDate) : "—") },
    { key: "link", label: "Link", render: (p) => <ContentLinkField value={p.link} onChange={(link) => editPost(p.id, { link })} readOnly={!canManage} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Posts</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Image and carousel posts, from draft to published.</p>
        </div>
        <div className="flex items-center gap-2">
          <ContentViewToggle value={viewMode} onChange={setViewMode} />
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingPost(null);
                setDefaultStatus(null);
                setDialogOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <PlusIcon className="h-4 w-4" />
              New post
            </button>
          )}
        </div>
      </div>

      {loadState === "loading" && <TaskListSkeleton />}

      {loadState === "success" && viewMode === "list" && (
        <ContentListView<Post>
          items={posts}
          columns={listColumns}
          titleOf={(p) => p.title}
          onOpen={openEdit}
          canManage={canManage}
          onRequestDelete={setPendingDeleteId}
          emptyLabel="No posts yet"
        />
      )}

      {loadState === "success" && viewMode === "board" && (
        <ContentKanbanBoard<Post>
          columns={COLUMNS}
          items={posts}
          getColumnId={(post) => post.status}
          canCreate={canManage}
          onAddClick={(columnId) => {
            setEditingPost(null);
            setDefaultStatus(columnId as ContentStageStatus);
            setDialogOpen(true);
          }}
          onMove={(id, columnId, order) => editPost(id, { status: columnId as ContentStageStatus, order })}
          renderCard={(post, dragState) => (
            <PostCard post={post} users={users} canManage={canManage} onOpen={openEdit} onRequestDelete={setPendingDeleteId} dragState={dragState} />
          )}
        />
      )}

      <PostDialog
        open={dialogOpen}
        post={editingPost}
        defaultStatus={defaultStatus}
        users={users}
        onClose={() => setDialogOpen(false)}
        onSubmit={(input) => (editingPost ? editPost(editingPost.id, input).then(() => true) : addPost(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this post?"
        description={pendingPost ? `"${pendingPost.title}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await removePost(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
