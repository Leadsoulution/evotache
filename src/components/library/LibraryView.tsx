"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLibrary } from "@/hooks/useLibrary";
import { useColumnDragReorder } from "@/hooks/useColumnDragReorder";
import { canManageWorkflow } from "@/config/roleMeta";
import { MarkdownLite } from "@/lib/markdownLite";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { ErrorState } from "@/components/task-list/ErrorState";
import { BookOpenIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function LibraryView() {
  const { user } = useAuth();
  const canEdit = user ? canManageWorkflow(user.role) : false;
  const { docs, loadState, errorMessage, refetch, addDoc, editDoc, removeDoc, reorderDocs } = useLibrary();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const orderedIds = docs.map((d) => d.id);
  const { onDragStart, onDragOverColumn, onDrop, onDragEnd, dropTarget } = useColumnDragReorder(orderedIds, reorderDocs);

  // Derived at render time instead of synced via effect: falls back to the
  // first document whenever activeId hasn't been set yet or no longer
  // matches an existing doc (e.g. it was just deleted).
  const effectiveActiveId = activeId && docs.some((d) => d.id === activeId) ? activeId : (docs[0]?.id ?? null);
  const activeDoc = docs.find((d) => d.id === effectiveActiveId) ?? null;
  const pendingDeleteDoc = docs.find((d) => d.id === pendingDeleteId) ?? null;

  function startEditing() {
    if (!activeDoc) return;
    setDraftTitle(activeDoc.title);
    setDraftContent(activeDoc.content);
    setEditing(true);
  }

  async function handleSave() {
    if (!activeDoc) return;
    setSaving(true);
    const ok = await editDoc(activeDoc.id, { title: draftTitle.trim() || activeDoc.title, content: draftContent });
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function handleAdd() {
    const created = await addDoc("New document");
    if (created) {
      setActiveId(created.id);
      setDraftTitle(created.title);
      setDraftContent("");
      setEditing(true);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    await removeDoc(pendingDeleteId);
    setPendingDeleteId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-[95%] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Library</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Company rules and reference documents — working hours, policies, and more.</p>
      </header>

      {loadState === "loading" && <TaskListSkeleton />}
      {loadState === "error" && <ErrorState message={errorMessage ?? "Unknown error."} onRetry={refetch} />}

      {loadState === "success" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            {docs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                draggable={canEdit}
                onDragStart={() => onDragStart(doc.id)}
                onDragOver={(event) => onDragOverColumn(event, doc.id)}
                onDrop={() => onDrop(doc.id)}
                onDragEnd={onDragEnd}
                onClick={() => {
                  setActiveId(doc.id);
                  setEditing(false);
                }}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  effectiveActiveId === doc.id
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                  dropTarget?.id === doc.id && (dropTarget.edge === "before" ? "border-l-4 border-l-indigo-500" : "border-r-4 border-r-indigo-500")
                )}
              >
                {doc.title}
              </button>
            ))}
            {canEdit && (
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-400"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add
              </button>
            )}
          </div>

          {!activeDoc && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-16 text-center dark:border-slate-800">
              <BookOpenIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {canEdit ? "No documents yet — add one to get started." : "No documents yet."}
              </p>
            </div>
          )}

          {activeDoc && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {editing ? (
                <div className="flex flex-col gap-3">
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <textarea
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    rows={16}
                    placeholder={"# Heading\n\nWrite the policy here. Use **bold**, *italic*, and \"- \" for bullet lists."}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{activeDoc.title}</h2>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={startEditing}
                          aria-label={`Edit ${activeDoc.title}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(activeDoc.id)}
                          aria-label={`Delete ${activeDoc.title}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <MarkdownLite content={activeDoc.content} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete document?"
        description={pendingDeleteDoc ? `"${pendingDeleteDoc.title}" will be permanently removed.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
