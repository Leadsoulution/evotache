"use client";

import { useEffect, useMemo, useState } from "react";
import { useDbSize, useArchivedItems, previewArchive } from "@/hooks/useArchive";
import { useTaskMeta } from "@/hooks/useTaskMeta";
import { useUsers } from "@/hooks/useUsers";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatRelativeTime, formatDueDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { GoogleConnectionCard } from "@/components/admin/GoogleConnectionCard";
import { GoogleSheetBackupSection } from "@/components/admin/GoogleSheetBackupSection";
import type { ArchiveFilters, ArchiveModule } from "@/types/archive";

const MODULE_LABELS: Record<ArchiveModule, string> = {
  task: "Tasks",
  dispute: "Disputes",
  achat: "Purchases",
  conversation: "Conversations",
};

const LEVEL_STYLES = {
  ok: { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  warning: { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  critical: { bar: "bg-red-500", text: "text-red-700 dark:text-red-400" },
};

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupView() {
  const { dbSize, loading: dbSizeLoading, refetch: refetchDbSize } = useDbSize();
  const { items, loading: itemsLoading, archive, restore } = useArchivedItems();
  const { statuses } = useTaskMeta();
  const { users } = useUsers();
  const toast = useToast();

  const [module, setModule] = useState<ArchiveModule>("task");
  const [statusId, setStatusId] = useState("");
  const [beforeDate, setBeforeDate] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [listFilter, setListFilter] = useState<ArchiveModule | "all">("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const filters: ArchiveFilters = useMemo(
    () => ({ module, statusId: module === "task" || module === "dispute" ? statusId || undefined : undefined, beforeDate: beforeDate || undefined }),
    [module, statusId, beforeDate]
  );

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewing(true);
    previewArchive(filters)
      .then((count) => {
        if (!cancelled) setPreviewCount(count);
      })
      .catch(() => {
        if (!cancelled) setPreviewCount(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  async function handleArchive() {
    setArchiving(true);
    const count = await archive(filters);
    setArchiving(false);
    setConfirmOpen(false);
    if (count !== null) {
      toast.success(count === 0 ? "Nothing matched — nothing was archived." : `Archived ${count} item${count === 1 ? "" : "s"}.`);
      void refetchDbSize();
    }
  }

  async function handleRestore(id: string) {
    setRestoringId(id);
    const success = await restore(id);
    setRestoringId(null);
    if (success) {
      toast.success("Restored.");
      void refetchDbSize();
    }
  }

  const visibleItems = listFilter === "all" ? items : items.filter((item) => item.module === listFilter);
  const levelStyle = dbSize ? LEVEL_STYLES[dbSize.level] : LEVEL_STYLES.ok;

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Backup</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Keep the database lean by archiving old data out to storage — restore it any time.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Database size</h2>
        {dbSizeLoading || !dbSize ? (
          <p className="mt-3 text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn("h-full rounded-full transition-all", levelStyle.bar)}
                style={{ width: `${Math.min(100, Math.max(2, dbSize.percent))}%` }}
              />
            </div>
            <p className={cn("mt-2 text-sm font-medium", levelStyle.text)}>
              {formatMb(dbSize.bytes)} of {formatMb(dbSize.limitBytes)} used ({dbSize.percent.toFixed(1)}%)
            </p>
            {dbSize.level !== "ok" && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {dbSize.level === "critical"
                  ? "The database is nearly full. Archive some old data below to free up space."
                  : "The database is getting full. Consider archiving old data below."}
              </p>
            )}
          </>
        )}
      </section>

      <GoogleConnectionCard />

      <GoogleSheetBackupSection />

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Archive old data</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Pick what to archive. Archived data moves out of the live app but can be restored later.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Module</span>
            <select
              value={module}
              onChange={(event) => {
                setModule(event.target.value as ArchiveModule);
                setStatusId("");
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
            >
              {(Object.keys(MODULE_LABELS) as ArchiveModule[]).map((m) => (
                <option key={m} value={m}>
                  {MODULE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          {(module === "task" || module === "dispute") && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Status</span>
              <select
                value={statusId}
                onChange={(event) => setStatusId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
              >
                <option value="">Any status</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
              {module === "conversation" ? "Inactive since" : "Before"}
            </span>
            <input
              type="date"
              value={beforeDate}
              onChange={(event) => setBeforeDate(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {previewing ? "Counting…" : previewCount === null ? "—" : `${previewCount} item${previewCount === 1 ? "" : "s"} match this filter.`}
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!previewCount || archiving}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Archive
          </button>
        </div>
        {(module === "task" || module === "dispute") && (
          <p className="mt-2 text-xs text-slate-400">Subtasks are archived along with their parent automatically.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Archived items</h2>
          <select
            value={listFilter}
            onChange={(event) => setListFilter(event.target.value as ArchiveModule | "all")}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All modules</option>
            {(Object.keys(MODULE_LABELS) as ArchiveModule[]).map((m) => (
              <option key={m} value={m}>
                {MODULE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {itemsLoading && <p className="py-4 text-sm text-slate-400">Loading…</p>}
          {!itemsLoading && visibleItems.length === 0 && <p className="py-4 text-sm text-slate-400">Nothing archived yet.</p>}
          {visibleItems.map((item) => {
            const archivedByUser = users.find((u) => u.id === item.archivedBy);
            return (
              <div key={item.id} className="flex items-center gap-3 py-2.5">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {MODULE_LABELS[item.module]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-100">{item.title}</span>
                <span className="shrink-0 text-xs text-slate-400" title={formatDueDate(item.archivedAt)}>
                  {formatRelativeTime(item.archivedAt)}
                  {archivedByUser ? ` · ${archivedByUser.name}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleRestore(item.id)}
                  disabled={restoringId === item.id}
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {restoringId === item.id ? "Restoring…" : "Restore"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title={`Archive ${previewCount ?? 0} item${previewCount === 1 ? "" : "s"}?`}
        description="They'll disappear from the live app but can be restored from the list below at any time."
        confirmLabel={archiving ? "Archiving…" : "Archive"}
        onConfirm={handleArchive}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
