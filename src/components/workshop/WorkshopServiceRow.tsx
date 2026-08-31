"use client";

import { useWorkshopChrono } from "@/hooks/useWorkshopChrono";
import { formatWorkshopChrono, isWorkshopServiceLate, WORKSHOP_SERVICE_STATUS_LABEL } from "@/lib/workshopStats";
import { AlertTriangleIcon, TimerIcon, TrashIcon, WrenchIcon } from "@/components/ui/icons";
import { getBadgeStyle } from "@/lib/badgeColor";
import { cn } from "@/lib/cn";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import type { WorkshopService } from "@/types/workshop";

interface WorkshopServiceRowProps {
  service: WorkshopService;
  onSessionAction: (serviceId: string, action: WorkshopSessionAction) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const SERVICE_STATUS_COLOR: Record<WorkshopService["status"], string> = {
  waiting: "#94a3b8",
  in_progress: "#6366f1",
  done: "#22c55e",
};

/** One job within a repair — same icon-and-divider visual language as the
 * TV card (WorkshopTvView), but internal-only ("En retard" here is judged
 * against the mechanic's own scheduledDate, never shown to the customer),
 * enriched with the date/chrono a mechanic actually needs, bold and
 * right-aligned. Reused in both "Mes réparations" and the repair detail
 * drawer. */
export function WorkshopServiceRow({ service, onSessionAction, onDelete, readOnly }: WorkshopServiceRowProps) {
  const session = service.activeSession;
  const elapsedSeconds = useWorkshopChrono(session);
  const isRunning = Boolean(session?.runningSince);
  const isPaused = Boolean(session && !session.runningSince && !session.endedAt);
  const hasEnded = Boolean(session?.endedAt);
  const hasStarted = Boolean(session) && !hasEnded;
  const late = isWorkshopServiceLate(service);
  const color = late ? "#ef4444" : SERVICE_STATUS_COLOR[service.status];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 bg-white p-3 dark:bg-slate-900" style={{ borderColor: color }}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1f`, color }}>
          <WrenchIcon className="h-5 w-5" />
        </span>
        <span className="h-9 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-bold", service.status === "done" ? "text-slate-400 line-through" : "text-slate-900 dark:text-slate-100")}>{service.description}</p>
          {late ? (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={getBadgeStyle("#ef4444")}>
              <AlertTriangleIcon className="h-3 w-3" /> En retard
            </span>
          ) : (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={getBadgeStyle(SERVICE_STATUS_COLOR[service.status])}>
              {WORKSHOP_SERVICE_STATUS_LABEL[service.status]}
            </span>
          )}
        </div>

        <div className="shrink-0 text-right">
          {service.scheduledDate && (
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {new Date(service.scheduledDate).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {(isRunning || isPaused) && (
            <p className="mt-0.5 flex items-center justify-end gap-1 font-mono text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
              <TimerIcon className={isRunning ? "h-4 w-4 text-indigo-500" : "h-4 w-4 text-slate-400"} />
              {formatWorkshopChrono(elapsedSeconds)}
            </p>
          )}
          {isPaused && <p className="text-xs font-bold text-amber-600 dark:text-amber-400">En pause</p>}
          {hasEnded && service.activeSession?.totalWorkSeconds != null && (
            <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">{formatWorkshopChrono(service.activeSession.totalWorkSeconds)}</p>
          )}
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            aria-label="Supprimer cette prestation"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

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
