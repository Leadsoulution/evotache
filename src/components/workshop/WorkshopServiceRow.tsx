"use client";

import { useWorkshopChrono } from "@/hooks/useWorkshopChrono";
import { formatWorkshopChrono, isWorkshopServiceLate, WORKSHOP_SERVICE_STATUS_LABEL } from "@/lib/workshopStats";
import { AlertTriangleIcon, TimerIcon, TrashIcon } from "@/components/ui/icons";
import { getBadgeStyle } from "@/lib/badgeColor";
import { cn } from "@/lib/cn";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import type { WorkshopService, WorkshopServiceStatus } from "@/types/workshop";

interface WorkshopServiceRowProps {
  service: WorkshopService;
  onSessionAction: (serviceId: string, action: WorkshopSessionAction) => void;
  onToggleDone?: (done: boolean) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const SERVICE_STATUS_COLOR: Record<WorkshopServiceStatus, string> = {
  waiting: "#94a3b8",
  in_progress: "#6366f1",
  done: "#22c55e",
};

/** One job within a repair, displayed like the rest of the app's task
 * lists (checkbox + title, same read-at-a-glance convention as
 * TaskCard/TaskRow) rather than a bespoke card. "En retard" here is judged
 * against the mechanic's own scheduledDate and is internal-only — never
 * shown to the customer on the TV. Reused in both "Mes réparations" and
 * the repair detail drawer (mechanic and commercial views alike). */
export function WorkshopServiceRow({ service, onSessionAction, onToggleDone, onDelete, readOnly }: WorkshopServiceRowProps) {
  const session = service.activeSession;
  const elapsedSeconds = useWorkshopChrono(session);
  const isRunning = Boolean(session?.runningSince);
  const isPaused = Boolean(session && !session.runningSince && !session.endedAt);
  const hasEnded = Boolean(session?.endedAt);
  const hasStarted = Boolean(session) && !hasEnded;
  const late = isWorkshopServiceLate(service);
  const done = service.status === "done";

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={done}
          disabled={readOnly || !onToggleDone}
          onChange={(e) => onToggleDone?.(e.target.checked)}
          aria-label={`Marquer "${service.description}" comme terminée`}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
        />
        <p className={cn("min-w-0 flex-1 truncate text-sm font-medium", done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}>{service.description}</p>
        {late ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={getBadgeStyle("#ef4444")}>
            <AlertTriangleIcon className="h-3 w-3" /> En retard
          </span>
        ) : (
          !done && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={getBadgeStyle(SERVICE_STATUS_COLOR[service.status])}>
              {WORKSHOP_SERVICE_STATUS_LABEL[service.status]}
            </span>
          )
        )}
        {(isRunning || isPaused) && (
          <span className="flex shrink-0 items-center gap-1 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
            <TimerIcon className={isRunning ? "h-3.5 w-3.5 text-indigo-500" : "h-3.5 w-3.5 text-slate-400"} />
            {formatWorkshopChrono(elapsedSeconds)}
          </span>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label="Supprimer cette prestation"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {(service.scheduledDate || isPaused || (hasEnded && service.activeSession?.totalWorkSeconds != null)) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs font-medium text-slate-500 dark:text-slate-400">
          {service.scheduledDate && (
            <span>
              Début prévu : {new Date(service.scheduledDate).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              {service.durationMinutes != null && ` (${service.durationMinutes} min)`}
            </span>
          )}
          {isPaused && <span className="text-amber-600 dark:text-amber-400">En pause</span>}
          {hasEnded && service.activeSession?.totalWorkSeconds != null && <span>Temps travaillé : {formatWorkshopChrono(service.activeSession.totalWorkSeconds)}</span>}
        </div>
      )}

      {!readOnly && !done && (
        <div className="flex items-center gap-2 pl-6">
          {!hasStarted && !hasEnded && (
            <button type="button" onClick={() => onSessionAction(service.id, "start")} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500">
              Démarrer
            </button>
          )}
          {isRunning && (
            <button
              type="button"
              onClick={() => onSessionAction(service.id, "pause")}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Pause
            </button>
          )}
          {isPaused && (
            <button
              type="button"
              onClick={() => onSessionAction(service.id, "resume")}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reprendre
            </button>
          )}
          {(isRunning || isPaused) && (
            <button type="button" onClick={() => onSessionAction(service.id, "end")} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500">
              Terminer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
