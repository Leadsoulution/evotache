"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon, TrashIcon, PlusIcon } from "@/components/ui/icons";
import { fetchWorkshopStatusHistory } from "@/services/workshopApi";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL, isWorkshopRepairLate } from "@/lib/workshopStats";
import { WorkshopStatusBadge } from "./WorkshopStatusBadge";
import { WorkshopStatusMenu } from "./WorkshopStatusMenu";
import { WorkshopMechanicMenu } from "./WorkshopMechanicMenu";
import { WorkshopRepairHeader } from "./WorkshopRepairHeader";
import { WorkshopServiceRow } from "./WorkshopServiceRow";
import { formatDueDate, fromDateTimeInputValue } from "@/lib/date";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import type { Assignee } from "@/types/task";
import type { WorkshopRepair, WorkshopService, WorkshopStatus, WorkshopStatusHistoryEntry } from "@/types/workshop";

interface WorkshopDetailDrawerProps {
  repair: WorkshopRepair | null;
  mechanics: Assignee[];
  canEditStatus: boolean;
  canEditRepair: boolean;
  canDelete: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<WorkshopRepair>) => void;
  onDelete: (id: string) => void;
  onSessionAction: (serviceId: string, action: WorkshopSessionAction) => void;
  onToggleServiceDone: (service: WorkshopService, done: boolean) => void;
  onAddService: (repairId: string, description: string, scheduledDate: string | null) => void;
  onDeleteService: (serviceId: string) => void;
}

export function WorkshopDetailDrawer({
  repair,
  mechanics,
  canEditStatus,
  canEditRepair,
  canDelete,
  onClose,
  onUpdate,
  onDelete,
  onSessionAction,
  onToggleServiceDone,
  onAddService,
  onDeleteService,
}: WorkshopDetailDrawerProps) {
  const [history, setHistory] = useState<WorkshopStatusHistoryEntry[]>([]);
  const [newServiceDescription, setNewServiceDescription] = useState("");
  const [newServiceDate, setNewServiceDate] = useState("");

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

  function handleAddService() {
    const description = newServiceDescription.trim();
    if (!description || !repair) return;
    onAddService(repair.id, description, fromDateTimeInputValue(newServiceDate));
    setNewServiceDescription("");
    setNewServiceDate("");
  }

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
            <WorkshopRepairHeader
              color={isWorkshopRepairLate(repair) ? "#ef4444" : WORKSHOP_STATUS_COLOR[repair.status]}
              orderNumber={repair.orderNumber}
              brand={repair.brand}
              model={repair.model}
              engineCc={repair.engineCc}
            />
            {(repair.year || repair.registration) && (
              <p className="mt-1 pl-[4.5rem] text-sm text-slate-500 dark:text-slate-400">{[repair.year, repair.registration].filter(Boolean).join(" • ")}</p>
            )}
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
            <WorkshopMechanicMenu mechanics={mechanics} value={repair.mechanicId} onChange={(mechanicId) => onUpdate(repair.id, { mechanicId })} readOnly={!canEditRepair} />
          </div>

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
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Prestations</p>
            {repair.services.length === 0 ? (
              <p className="mb-2 text-xs text-slate-400">Aucune prestation pour l&apos;instant.</p>
            ) : (
              <div className="mb-2 flex flex-col gap-2">
                {repair.services.map((service) => (
                  <WorkshopServiceRow
                    key={service.id}
                    service={service}
                    onSessionAction={onSessionAction}
                    onToggleDone={canEditStatus ? (done) => onToggleServiceDone(service, done) : undefined}
                    onDelete={canEditRepair ? () => onDeleteService(service.id) : undefined}
                    readOnly={!canEditStatus}
                  />
                ))}
              </div>
            )}
            {canEditRepair && (
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700">
                <input
                  value={newServiceDescription}
                  onChange={(e) => setNewServiceDescription(e.target.value)}
                  placeholder="Nouvelle prestation (ex: Changement des pneus)"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={newServiceDate}
                    onChange={(e) => setNewServiceDate(e.target.value)}
                    className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddService}
                    disabled={!newServiceDescription.trim()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Ajouter
                  </button>
                </div>
              </div>
            )}
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
