"use client";

import { useWorkshopChrono } from "@/hooks/useWorkshopChrono";
import { formatWorkshopChrono } from "@/lib/workshopStats";
import { WorkshopStatusBadge } from "./WorkshopStatusBadge";
import { TimerIcon } from "@/components/ui/icons";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import type { WorkshopRepair } from "@/types/workshop";

interface WorkshopMechanicCardProps {
  repair: WorkshopRepair;
  onSessionAction: (id: string, action: WorkshopSessionAction) => void;
  onOpenDetail: (repair: WorkshopRepair) => void;
}

/** One card in "Mes réparations" — DÉMARRER only shows before any session
 * exists; once it does, PAUSE/REPRENDRE + TERMINER take over, and the
 * chrono itself only ever reflects `activeSession` (server-persisted), so
 * a refresh never zeroes it out. */
export function WorkshopMechanicCard({ repair, onSessionAction, onOpenDetail }: WorkshopMechanicCardProps) {
  const session = repair.activeSession;
  const elapsedSeconds = useWorkshopChrono(session);
  const isRunning = Boolean(session?.runningSince);
  const isPaused = Boolean(session && !session.runningSince && !session.endedAt);
  const hasEnded = Boolean(session?.endedAt);
  const hasStarted = Boolean(session) && !hasEnded;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{repair.orderNumber}</p>
          <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
            {repair.brand} {repair.model}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[repair.year, repair.engineCc ? `${repair.engineCc} cc` : null].filter(Boolean).join(" • ")}
          </p>
        </div>
        <WorkshopStatusBadge repair={repair} />
      </div>

      {repair.workDescription && <p className="text-sm text-slate-600 dark:text-slate-300">{repair.workDescription}</p>}

      {(isRunning || isPaused) && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
          <TimerIcon className={isRunning ? "h-4 w-4 text-indigo-500" : "h-4 w-4 text-slate-400"} />
          <span className="font-mono text-lg font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatWorkshopChrono(elapsedSeconds)}</span>
          {isPaused && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">En pause</span>}
        </div>
      )}

      <div className="flex items-center gap-2">
        {!hasStarted && !hasEnded && (
          <button
            type="button"
            onClick={() => onSessionAction(repair.id, "start")}
            className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Démarrer
          </button>
        )}
        {isRunning && (
          <button
            type="button"
            onClick={() => onSessionAction(repair.id, "pause")}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Pause
          </button>
        )}
        {isPaused && (
          <button
            type="button"
            onClick={() => onSessionAction(repair.id, "resume")}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reprendre
          </button>
        )}
        {(isRunning || isPaused) && (
          <button
            type="button"
            onClick={() => onSessionAction(repair.id, "end")}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Terminer
          </button>
        )}
        {hasEnded && (
          <button
            type="button"
            onClick={() => onOpenDetail(repair)}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Changer le statut
          </button>
        )}
      </div>
    </div>
  );
}
