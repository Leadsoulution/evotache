"use client";

import { useWorkshopChrono } from "@/hooks/useWorkshopChrono";
import { formatWorkshopChrono, isWorkshopServiceLate, WORKSHOP_SERVICE_STATUS_LABEL } from "@/lib/workshopStats";
import { AlertTriangleIcon, TimerIcon } from "@/components/ui/icons";
import { getBadgeStyle } from "@/lib/badgeColor";
import { cn } from "@/lib/cn";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import type { WorkshopService } from "@/types/workshop";

interface WorkshopServiceRowProps {
  service: WorkshopService;
  onSessionAction: (serviceId: string, action: WorkshopSessionAction) => void;
  readOnly?: boolean;
}

const SERVICE_STATUS_COLOR: Record<WorkshopService["status"], string> = {
  waiting: "#94a3b8",
  in_progress: "#6366f1",
  done: "#22c55e",
};

/** One job within a repair — internal only ("En retard" here is judged
 * against the mechanic's own scheduledDate, never shown to the customer on
 * the TV). Reused in both "Mes réparations" and the repair detail drawer. */
export function WorkshopServiceRow({ service, onSessionAction, readOnly }: WorkshopServiceRowProps) {
  const session = service.activeSession;
  const elapsedSeconds = useWorkshopChrono(session);
  const isRunning = Boolean(session?.runningSince);
  const isPaused = Boolean(session && !session.runningSince && !session.endedAt);
  const hasEnded = Boolean(session?.endedAt);
  const hasStarted = Boolean(session) && !hasEnded;
  const late = isWorkshopServiceLate(service);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-sm font-semibold", service.status === "done" ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100")}>{service.description}</p>
        <div className="flex items-center gap-1.5">
          {late ? (
            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={getBadgeStyle("#ef4444")}>
              <AlertTriangleIcon className="h-3 w-3" /> En retard
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={getBadgeStyle(SERVICE_STATUS_COLOR[service.status])}>
              {WORKSHOP_SERVICE_STATUS_LABEL[service.status]}
            </span>
          )}
        </div>
      </div>

      {service.scheduledDate && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Prévu le {new Date(service.scheduledDate).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {(isRunning || isPaused) && (
        <div className="flex items-center gap-2">
          <TimerIcon className={isRunning ? "h-4 w-4 text-indigo-500" : "h-4 w-4 text-slate-400"} />
          <span className="font-mono text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatWorkshopChrono(elapsedSeconds)}</span>
          {isPaused && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">En pause</span>}
        </div>
      )}
      {hasEnded && service.activeSession?.totalWorkSeconds != null && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Temps travaillé : {formatWorkshopChrono(service.activeSession.totalWorkSeconds)}</p>
      )}

      {!readOnly && (
        <div className="flex items-center gap-2">
          {!hasStarted && !hasEnded && (
            <button type="button" onClick={() => onSessionAction(service.id, "start")} className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500">
              Démarrer
            </button>
          )}
          {isRunning && (
            <button
              type="button"
              onClick={() => onSessionAction(service.id, "pause")}
              className="flex-1 rounded-lg border border-slate-200 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Pause
            </button>
          )}
          {isPaused && (
            <button
              type="button"
              onClick={() => onSessionAction(service.id, "resume")}
              className="flex-1 rounded-lg border border-slate-200 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reprendre
            </button>
          )}
          {(isRunning || isPaused) && (
            <button type="button" onClick={() => onSessionAction(service.id, "end")} className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500">
              Terminer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
