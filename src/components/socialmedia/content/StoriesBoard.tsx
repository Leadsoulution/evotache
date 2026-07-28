"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { useStories } from "@/hooks/useStories";
import { canManageWorkflow } from "@/config/roleMeta";
import { ContentKanbanBoard } from "./ContentKanbanBoard";
import { ContentListView } from "./ContentListView";
import { ContentViewToggle } from "./ContentViewToggle";
import type { ContentViewMode } from "./ContentViewToggle";
import { ContentAssigneeMenu } from "./ContentAssigneeMenu";
import { ContentLinkField } from "./ContentLinkField";
import { ProductsToLaunchView } from "./ProductsToLaunchView";
import { StoryCard } from "./StoryCard";
import { StoryDialog } from "./StoryDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { PlusIcon } from "@/components/ui/icons";
import { formatDueDate } from "@/lib/date";
import { CONTENT_STAGE_STATUS_META, CONTENT_STAGE_STATUS_ORDER, PLATFORM_META } from "@/config/socialMeta";
import type { ContentStageStatus, Story } from "@/types/socialMedia";
import type { ContentListColumn } from "./ContentListView";

const COLUMNS = CONTENT_STAGE_STATUS_ORDER.map((id) => ({ id, label: CONTENT_STAGE_STATUS_META[id].label, color: CONTENT_STAGE_STATUS_META[id].color }));

function badge(label: string, color: string) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${color}22`, color }}>
      {label}
    </span>
  );
}

export function StoriesBoard() {
  const { user } = useAuth();
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { users } = useUsers();
  const { stories, loadState, addStory, editStory, removeStory } = useStories();

  const [viewMode, setViewMode] = useState<ContentViewMode>("products");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<ContentStageStatus | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingStory = stories.find((s) => s.id === pendingDeleteId) ?? null;

  function openEdit(story: Story) {
    setEditingStory(story);
    setDialogOpen(true);
  }

  const listColumns: ContentListColumn<Story>[] = [
    { key: "client", label: "Client", render: (s) => s.client || "—" },
    { key: "platform", label: "Platform", render: (s) => badge(PLATFORM_META[s.platform].label, PLATFORM_META[s.platform].color) },
    { key: "assignee", label: "Assigned to", render: (s) => <ContentAssigneeMenu users={users} value={s.assigneeId} onChange={() => {}} readOnly /> },
    { key: "status", label: "Status", render: (s) => badge(CONTENT_STAGE_STATUS_META[s.status].label, CONTENT_STAGE_STATUS_META[s.status].color) },
    { key: "due", label: "Due date", render: (s) => (s.dueDate ? formatDueDate(s.dueDate) : "—") },
    { key: "link", label: "Link", render: (s) => <ContentLinkField value={s.link} onChange={(link) => editStory(s.id, { link })} readOnly={!canManage} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Stories</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Short-lived content across every platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <ContentViewToggle value={viewMode} onChange={setViewMode} includeProducts />
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingStory(null);
                setDefaultStatus(null);
                setDialogOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <PlusIcon className="h-4 w-4" />
              New story
            </button>
          )}
        </div>
      </div>

      {viewMode === "products" && <ProductsToLaunchView />}

      {loadState === "loading" && viewMode !== "products" && <TaskListSkeleton />}

      {loadState === "success" && viewMode === "list" && (
        <ContentListView<Story>
          items={stories}
          columns={listColumns}
          titleOf={(s) => s.title}
          onOpen={openEdit}
          canManage={canManage}
          onRequestDelete={setPendingDeleteId}
          emptyLabel="No stories yet"
        />
      )}

      {loadState === "success" && viewMode === "board" && (
        <ContentKanbanBoard<Story>
          columns={COLUMNS}
          items={stories}
          getColumnId={(story) => story.status}
          canCreate={canManage}
          onAddClick={(columnId) => {
            setEditingStory(null);
            setDefaultStatus(columnId as ContentStageStatus);
            setDialogOpen(true);
          }}
          onMove={(id, columnId, order) => editStory(id, { status: columnId as ContentStageStatus, order })}
          renderCard={(story, dragState) => (
            <StoryCard story={story} users={users} canManage={canManage} onOpen={openEdit} onRequestDelete={setPendingDeleteId} dragState={dragState} />
          )}
        />
      )}

      <StoryDialog
        open={dialogOpen}
        story={editingStory}
        defaultStatus={defaultStatus}
        users={users}
        onClose={() => setDialogOpen(false)}
        onSubmit={(input) => (editingStory ? editStory(editingStory.id, input).then(() => true) : addStory(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this story?"
        description={pendingStory ? `"${pendingStory.title}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await removeStory(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
