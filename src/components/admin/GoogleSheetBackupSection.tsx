"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatRelativeTime } from "@/lib/date";
import { CheckIcon, DownloadIcon, RefreshIcon, SheetIcon, TrashIcon } from "@/components/ui/icons";
import { SHEETS_SCOPE } from "@/config/googleScopes";
import type { GoogleConnectionStatus } from "@/lib/googleAuth";
import type { BackupSheetStatus } from "@/app/api/admin/backup-sheet/route";
import type { RestoreResult } from "@/lib/sheetBackup";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export function GoogleSheetBackupSection() {
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);
  const [sheetStatus, setSheetStatus] = useState<BackupSheetStatus | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [linking, setLinking] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/integrations/google/status")
      .then((res) => res.json())
      .then((data: GoogleConnectionStatus) => setGoogleStatus(data))
      .catch(() => {});
    fetch("/api/admin/backup-sheet")
      .then((res) => res.json())
      .then((data: BackupSheetStatus) => setSheetStatus(data))
      .catch(() => {});
  }, []);

  async function handleLink() {
    if (!urlDraft.trim()) return;
    setLinking(true);
    try {
      const res = await fetch("/api/admin/backup-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetUrl: urlDraft }),
      });
      const data = (await res.json()) as BackupSheetStatus & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to link the sheet.");
      setSheetStatus(data);
      setUrlDraft("");
      toast.success(`Linked to "${data.spreadsheetTitle}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link the sheet.");
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink() {
    const res = await fetch("/api/admin/backup-sheet", { method: "DELETE" });
    const data = (await res.json()) as BackupSheetStatus;
    setSheetStatus(data);
    toast.success("Unlinked.");
  }

  async function handleBackupNow() {
    setBackingUp(true);
    try {
      const res = await fetch("/api/admin/backup-sheet/backup", { method: "POST" });
      const data = (await res.json()) as { tasks: number; litiges: number; achats: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Backup failed.");
      toast.success(`Sauvegardé : ${data.tasks} tâches, ${data.litiges} litiges, ${data.achats} achats.`);
      const status = await fetch("/api/admin/backup-sheet").then((r) => r.json());
      setSheetStatus(status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup failed.");
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setConfirmOpen(false);
    try {
      const res = await fetch("/api/admin/backup-sheet/restore", { method: "POST" });
      const data = (await res.json()) as RestoreResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Restore failed.");
      const total = data.tasksRestored + data.litigesRestored + data.achatsRestored;
      if (total === 0 && data.failed.length === 0) {
        toast.success("Rien à récupérer — tout est déjà à jour.");
      } else {
        toast.success(`Récupéré : ${data.tasksRestored} tâches, ${data.litigesRestored} litiges, ${data.achatsRestored} achats.${data.failed.length ? ` (${data.failed.length} échec(s))` : ""}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setRestoring(false);
    }
  }

  const hasSheetsScope = googleStatus?.scopes.includes(SHEETS_SCOPE) ?? false;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <SheetIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Google Sheet backup</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sauvegarde automatique des tâches, litiges et achats vers un Google Sheet — récupérable en cas de suppression.</p>
        </div>
      </div>

      <div className="mt-4">
        {!googleStatus || !sheetStatus ? (
          <p className="text-sm text-slate-400">Chargement…</p>
        ) : !googleStatus.connected ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Connecte d&apos;abord le compte Google ci-dessus.</p>
        ) : !hasSheetsScope ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">Le compte Google connecté n&apos;a pas encore l&apos;accès Sheets — reconnecte-le ci-dessus pour l&apos;ajouter.</p>
        ) : !sheetStatus.linked ? (
          <div className="flex items-center gap-2">
            <input
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              placeholder="Lien du Google Sheet (ex: https://docs.google.com/spreadsheets/d/...)"
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleLink}
              disabled={linking || !urlDraft.trim()}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {linking ? "Liaison…" : "Lier"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-3.5 w-3.5" /> Lié à &quot;{sheetStatus.spreadsheetTitle}&quot;
              </span>
              <span className="ml-2 text-slate-400">— dernière sauvegarde : {sheetStatus.lastBackupAt ? formatRelativeTime(sheetStatus.lastBackupAt) : "jamais"}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBackupNow}
                disabled={backingUp}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
                {backingUp ? "Sauvegarde…" : "Sauvegarder maintenant"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={restoring}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                {restoring ? "Récupération…" : "Récupérer depuis Google Sheet"}
              </button>
              <button
                type="button"
                onClick={handleUnlink}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Délier
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Récupérer depuis Google Sheet ?"
        description="Recrée uniquement les tâches, litiges et achats supprimés de l'app mais encore présents dans le Sheet — les éléments qui existent déjà dans l'app ne sont pas touchés ni écrasés."
        confirmLabel="Récupérer"
        onConfirm={handleRestore}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
