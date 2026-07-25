"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useCustomFields } from "@/hooks/useCustomFields";
import { useViewPrefs } from "@/hooks/useViewPrefs";
import { useProjects } from "@/hooks/useProjects";
import { getTaskPermissions } from "@/lib/taskPermissions";
import { TaskListToolbar } from "./TaskListToolbar";
import { TaskTable } from "./TaskTable";
import type { TaskTableGroup } from "./TaskTable";
import { TaskCardList } from "./TaskCardList";
import { TaskListSkeleton } from "./TaskListSkeleton";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { groupTasks, sortTasks } from "@/lib/taskQuery";
import { countDescendants, filterTopLevelTasks, flattenVisibleTree, getChildren } from "@/lib/taskTree";
import { fetchAttachmentCountsByTask } from "@/services/attachmentApi";
import type { GroupField, SortDirection, SortField, Task, TaskFilters, TaskModule } from "@/types/task";

interface TaskListViewProps {
  module: TaskModule;
  title: string;
  subtitle: string;
}

export function TaskListView({ module, title, subtitle }: TaskListViewProps) {
  const { user } = useAuth();
  const permissions = getTaskPermissions(user?.role);
  const { tasks, assignees, loadState, errorMessage, refetch, createTask, updateTask, deleteTasks, reorderTask } = useTasks(module);
  const { statuses, priorities, loadState: metaLoadState } = useTaskMeta();
  const { fields: customFields } = useCustomFields();
  const { hiddenColumnIds, toggleColumn } = useViewPrefs();
  const { projects } = useProjects();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>(() => {
    const projectParam = searchParams.get("project");
    return projectParam ? [projectParam] : [];
  });
  const [groupField, setGroupField] = useState<GroupField>("status");
  const [sortField, setSortField] = useState<SortField>("manual");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [attachmentRefreshKey, setAttachmentRefreshKey] = useState(0);

  const assigneeNameById = useMemo(() => Object.fromEntries(assignees.map((a) => [a.id, a.name])), [assignees]);
  const allTasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  useEffect(() => {
    let cancelled = false;
    fetchAttachmentCountsByTask().then((counts) => {
      if (!cancelled) setAttachmentCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [tasks, attachmentRefreshKey]);

  const hasActiveFilters = Boolean(
    debouncedSearch || statusFilter.length || priorityFilter.length || assigneeFilter.length || projectFilter.length
  );

  const groups: TaskTableGroup[] = useMemo(() => {
    const filters: TaskFilters = {
      search: debouncedSearch,
      statuses: statusFilter,
      priorities: priorityFilter,
      assigneeIds: assigneeFilter,
      projectIds: projectFilter,
    };
    const topLevel = tasks.filter((t) => t.parentId === null);
    const filteredTopLevel = filterTopLevelTasks(topLevel, tasks, filters, assigneeNameById);
    const statusOrder = statuses.map((s) => s.id);
    const priorityOrder = priorities.map((p) => p.id);
    const sortedTopLevel = sortTasks(filteredTopLevel, sortField, sortDirection, statusOrder, priorityOrder);
    const groupResults = groupTasks(sortedTopLevel, groupField, assignees, statuses, priorities);
    return groupResults.map((group) => ({
      key: group.key,
      label: group.label,
      rows: flattenVisibleTree(group.tasks, tasks, collapsedIds),
    }));
  }, [
    tasks,
    debouncedSearch,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    projectFilter,
    assigneeNameById,
    sortField,
    sortDirection,
    groupField,
    assignees,
    statuses,
    priorities,
    collapsedIds,
  ]);

  const allRowIds = useMemo(() => groups.flatMap((g) => g.rows.map((r) => r.task.id)), [groups]);
  const totalRows = allRowIds.length;

  const visibleColumns = useMemo(
    () => ({
      assignees: !hiddenColumnIds.includes("assignees"),
      dueDate: !hiddenColumnIds.includes("dueDate"),
      priority: !hiddenColumnIds.includes("priority"),
      status: !hiddenColumnIds.includes("status"),
    }),
    [hiddenColumnIds]
  );
  const visibleCustomFields = useMemo(() => customFields.filter((f) => !hiddenColumnIds.includes(f.id)), [customFields, hiddenColumnIds]);

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(allRowIds) : new Set());
  }

  function toggleCollapse(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter([]);
    setPriorityFilter([]);
    setAssigneeFilter([]);
    setProjectFilter([]);
  }

  function handleAddSubtask(parentId: string) {
    setCollapsedIds((current) => {
      if (!current.has(parentId)) return current;
      const next = new Set(current);
      next.delete(parentId);
      return next;
    });
    createTask("New subtask", { parentId });
  }

  function handleCloseDetail() {
    setDetailTask(null);
    setAttachmentRefreshKey((k) => k + 1);
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteIds) return;
    const ids = pendingDeleteIds;
    await deleteTasks(ids);
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (detailTask && ids.includes(detailTask.id)) setDetailTask(null);
    setPendingDeleteIds(null);
  }

  const pendingDescendantCount = pendingDeleteIds ? pendingDeleteIds.reduce((sum, id) => sum + countDescendants(tasks, id), 0) : 0;
  const openTask = detailTask ? (allTasksById.get(detailTask.id) ?? detailTask) : null;
  const isLoading = loadState === "loading" || metaLoadState === "loading";
  const isReady = loadState === "success" && metaLoadState === "success";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
          {!permissions.canEditFull && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {permissions.canCreate ? "Limited access" : "View only"}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </header>

      <TaskListToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        projectFilter={projectFilter}
        onProjectFilterChange={setProjectFilter}
        assignees={assignees}
        projects={projects}
        statuses={statuses}
        priorities={priorities}
        customFields={customFields}
        hiddenColumnIds={hiddenColumnIds}
        onToggleColumn={toggleColumn}
        groupField={groupField}
        onGroupFieldChange={setGroupField}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortFieldChange={setSortField}
        onToggleSortDirection={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
        selectedCount={selectedIds.size}
        onBulkDelete={() => setPendingDeleteIds(Array.from(selectedIds))}
        onClearSelection={() => setSelectedIds(new Set())}
        visibleCount={totalRows}
        totalCount={tasks.length}
      />

      {isLoading && <TaskListSkeleton />}

      {loadState === "error" && <ErrorState message={errorMessage ?? "Unknown error."} onRetry={refetch} />}

      {isReady && totalRows === 0 && hasActiveFilters && <EmptyState onClearFilters={clearFilters} />}

      {isReady && (totalRows > 0 || !hasActiveFilters) && (
        <>
          <TaskTable
            groups={groups}
            allTasksById={allTasksById}
            assignees={assignees}
            statuses={statuses}
            priorities={priorities}
            visibleColumns={visibleColumns}
            visibleCustomFields={visibleCustomFields}
            attachmentCounts={attachmentCounts}
            groupField={groupField}
            dragEnabled={sortField === "manual" && permissions.canEditFull}
            permissions={permissions}
            selectedIds={selectedIds}
            collapsedIds={collapsedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onToggleCollapse={toggleCollapse}
            onUpdate={updateTask}
            onRequestDelete={(id) => setPendingDeleteIds([id])}
            onAddSubtask={handleAddSubtask}
            onOpenDetail={setDetailTask}
            onReorder={reorderTask}
            onCreate={createTask}
          />
          <TaskCardList
            groups={groups}
            assignees={assignees}
            statuses={statuses}
            priorities={priorities}
            visibleColumns={visibleColumns}
            attachmentCounts={attachmentCounts}
            groupField={groupField}
            permissions={permissions}
            selectedIds={selectedIds}
            collapsedIds={collapsedIds}
            onToggleSelect={toggleSelect}
            onToggleCollapse={toggleCollapse}
            onUpdate={updateTask}
            onRequestDelete={(id) => setPendingDeleteIds([id])}
            onAddSubtask={handleAddSubtask}
            onOpenDetail={setDetailTask}
            onCreate={createTask}
          />
        </>
      )}

      <TaskDetailDrawer
        task={openTask}
        assignees={assignees}
        statuses={statuses}
        priorities={priorities}
        customFields={customFields}
        projects={projects}
        subtaskCount={openTask ? getChildren(tasks, openTask.id).length : 0}
        currentUserId={user?.id ?? ""}
        permissions={permissions}
        onClose={handleCloseDetail}
        onUpdate={updateTask}
      />

      <ConfirmDialog
        open={pendingDeleteIds !== null}
        title={pendingDeleteIds && pendingDeleteIds.length > 1 ? `Delete ${pendingDeleteIds.length} tasks?` : "Delete task?"}
        description={
          pendingDescendantCount > 0
            ? `This will also delete ${pendingDescendantCount} subtask${pendingDescendantCount > 1 ? "s" : ""}. This action cannot be undone.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteIds(null)}
      />
    </div>
  );
}
