"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon, TrashIcon } from "@/components/ui/icons";
import { fetchWorkshopStatusHistory } from "@/services/workshopApi";
import { useWorkshopChrono } from "@/hooks/useWorkshopChrono";
import { formatWorkshopChrono, WORKSHOP_STATUS_LABEL } from "@/lib/workshopStats";
import { WorkshopStatusBadge } from "./WorkshopStatusBadge";
import { WorkshopStatusMenu } from "./WorkshopStatusMenu";
import { WorkshopMechanicMenu } from "./WorkshopMechanicMenu";
import { formatDueDate } from "@/lib/date";
import type { Assignee } from "@/types/task";
import type { WorkshopRepair, WorkshopStatus, WorkshopStatusHistoryEntry } from "@/types/workshop";

interface WorkshopDetailDrawerProps {
  repair: WorkshopRepair | null;
  mechanics: Assignee[];
  canEditStatus: boolean;
  canDelete: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<WorkshopRepair>) => void;
  onDelete: (id: string) => void;
}

export function WorkshopDetailDrawer({ repair, mechanics, canEditStatus, canDelete, onClose, onUpdate, onDelete }: WorkshopDetailDrawerProps) {
  const [history, setHistory] = useState<WorkshopStatusHistoryEntry[]>([]);
  const elapsedSeconds = useWorkshopChrono(repair?.activeSession ?? null);

  useEffect(() => {
    if (!repair) return;
    fetchWorkshopStatusHistory(repair.id).then(setHistory);
  }, [repair]);

  useEffect(() => {
    if (!repair) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [repair, onClose]);

  if (!repair) return null;

  const mechanicById = new Map(mechanics.map((m) => [m.id, m]));

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-full animate-slide-up flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl sm:max-w-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Détail de la réparation</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{repair.orderNumber}</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {repair.brand} {repair.model}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{[repair.year, repair.engineCc ? `${repair.engineCc} cc` : null, repair.registration].filter(Boolean).join(" • ")}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Statut</span>
            {canEditStatus ? (
              <WorkshopStatusMenu value={repair.status} onChange={(status: WorkshopStatus) => onUpdate(repair.id, { status })} />
            ) : (
              <WorkshopStatusBadge repair={repair} />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mécanicien</span>
            <WorkshopMechanicMenu mechanics={mechanics} value={repair.mechanicId} onChange={(mechanicId) => onUpdate(repair.id, { mechanicId })} readOnly={!canEditStatus} />
          </div>

          {repair.activeSession && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Temps travaillé</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {formatWorkshopChrono(repair.activeSession.endedAt ? (repair.activeSession.totalWorkSeconds ?? 0) : elapsedSeconds)}
              </span>
            </div>
          )}

          {repair.workDescription && (
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Travail demandé</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{repair.workDescription}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Date d&apos;entrée</p>
              <p className="text-slate-700 dark:text-slate-300">{formatDueDate(repair.entryDate)}</p>
            </div>
            <div>
              <p className="text-slate-400">Date prévue</p>
              <p className="text-slate-700 dark:text-slate-300">{formatDueDate(repair.expectedCompletionDate)}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Historique des statuts</p>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun changement pour l&apos;instant.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">
                      {entry.oldStatus ? WORKSHOP_STATUS_LABEL[entry.oldStatus] : "—"} → <span className="font-medium">{WORKSHOP_STATUS_LABEL[entry.newStatus]}</span>
                    </span>
                    <span className="shrink-0 text-slate-400">
                      {mechanicById.get(entry.changedBy ?? "")?.name ?? "—"} · {new Date(entry.changedAt).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(repair.id)}
              className="mt-2 inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Supprimer
            </button>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
