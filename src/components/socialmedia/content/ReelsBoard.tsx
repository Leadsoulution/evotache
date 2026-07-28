"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { useReels } from "@/hooks/useReels";
import { canManageWorkflow } from "@/config/roleMeta";
import { ContentKanbanBoard } from "./ContentKanbanBoard";
import { ContentListView } from "./ContentListView";
import { ContentViewToggle } from "./ContentViewToggle";
import type { ContentViewMode } from "./ContentViewToggle";
import { ContentAssigneeMenu } from "./ContentAssigneeMenu";
import { ContentLinkField } from "./ContentLinkField";
import { ReelCard } from "./ReelCard";
import { ReelDialog } from "./ReelDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { PlusIcon } from "@/components/ui/icons";
import { formatDueDate } from "@/lib/date";
import { REEL_EDITING_STATUS_META, REEL_EDITING_STATUS_ORDER, APPROVAL_STATUS_META, CONTENT_PRIORITY_META } from "@/config/socialMeta";
import type { Reel, ReelEditingStatus } from "@/types/socialMedia";
import type { ContentListColumn } from "./ContentListView";

const COLUMNS = REEL_EDITING_STATUS_ORDER.map((id) => ({ id, label: REEL_EDITING_STATUS_META[id].label, color: REEL_EDITING_STATUS_META[id].color }));

function badge(label: string, color: string) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${color}22`, color }}>
      {label}
    </span>
  );
}

export function ReelsBoard() {
  const { user } = useAuth();
  const canManage = user ? canManageWorkflow(user.role) : false;
  const { users } = useUsers();
  const { reels, loadState, addReel, editReel, removeReel } = useReels();

  const [viewMode, setViewMode] = useState<ContentViewMode>("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReel, setEditingReel] = useState<Reel | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<ReelEditingStatus | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingReel = reels.find((r) => r.id === pendingDeleteId) ?? null;

  function openEdit(reel: Reel) {
    setEditingReel(reel);
    setDialogOpen(true);
  }

  const listColumns: ContentListColumn<Reel>[] = [
    { key: "client", label: "Client", render: (r) => r.client || "—" },
    { key: "assignee", label: "Assigned to", render: (r) => <ContentAssigneeMenu users={users} value={r.assigneeId} onChange={() => {}} readOnly /> },
    { key: "editing", label: "Editing", render: (r) => badge(REEL_EDITING_STATUS_META[r.editingStatus].label, REEL_EDITING_STATUS_META[r.editingStatus].color) },
    { key: "approval", label: "Approval", render: (r) => badge(APPROVAL_STATUS_META[r.approvalStatus].label, APPROVAL_STATUS_META[r.approvalStatus].color) },
    { key: "priority", label: "Priority", render: (r) => badge(CONTENT_PRIORITY_META[r.priority].label, CONTENT_PRIORITY_META[r.priority].color) },
    { key: "shooting", label: "Shooting date", render: (r) => (r.shootingDate ? formatDueDate(r.shootingDate) : "—") },
    { key: "publish", label: "Publishing date", render: (r) => (r.publishingDate ? formatDueDate(r.publishingDate) : "—") },
    { key: "link", label: "Link", render: (r) => <ContentLinkField value={r.link} onChange={(link) => editReel(r.id, { link })} readOnly={!canManage} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Reels</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track every reel from script to publish.</p>
        </div>
        <div className="flex items-center gap-2">
          <ContentViewToggle value={viewMode} onChange={setViewMode} />
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingReel(null);
                setDefaultStatus(null);
                setDialogOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <PlusIcon className="h-4 w-4" />
              New reel
            </button>
          )}
        </div>
      </div>

      {loadState === "loading" && <TaskListSkeleton />}

      {loadState === "success" && viewMode === "list" && (
        <ContentListView<Reel>
          items={reels}
          columns={listColumns}
          titleOf={(r) => r.title}
          onOpen={openEdit}
          canManage={canManage}
          onRequestDelete={setPendingDeleteId}
          emptyLabel="No reels yet"
        />
      )}

      {loadState === "success" && viewMode === "board" && (
        <ContentKanbanBoard<Reel>
          columns={COLUMNS}
          items={reels}
          getColumnId={(reel) => reel.editingStatus}
          canCreate={canManage}
          onAddClick={(columnId) => {
            setEditingReel(null);
            setDefaultStatus(columnId as ReelEditingStatus);
            setDialogOpen(true);
          }}
          onMove={(id, columnId, order) => editReel(id, { editingStatus: columnId as ReelEditingStatus, order })}
          renderCard={(reel, dragState) => (
            <ReelCard reel={reel} users={users} canManage={canManage} onOpen={openEdit} onRequestDelete={setPendingDeleteId} dragState={dragState} />
          )}
        />
      )}

      <ReelDialog
        open={dialogOpen}
        reel={editingReel}
        defaultEditingStatus={defaultStatus}
        users={users}
        onClose={() => setDialogOpen(false)}
        onSubmit={(input) => (editingReel ? editReel(editingReel.id, input).then(() => true) : addReel(input))}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this reel?"
        description={pendingReel ? `"${pendingReel.title}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await removeReel(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
