"use client";

import { useWorkshopChrono } from "@/hooks/useWorkshopChrono";
import { formatWorkshopChrono } from "@/lib/workshopStats";
import { WorkshopStatusBadge } from "./WorkshopStatusBadge";
import { TimerIcon } from "@/components/ui/icons";
import type { Assignee } from "@/types/task";
import type { WorkshopRepair } from "@/types/workshop";

interface WorkshopBoardCardProps {
  repair: WorkshopRepair;
  mechanic: Assignee | null;
  onOpenDetail: () => void;
}

export function WorkshopBoardCard({ repair, mechanic, onOpenDetail }: WorkshopBoardCardProps) {
  const isRunning = Boolean(repair.activeSession?.runningSince);
  const elapsedSeconds = useWorkshopChrono(repair.activeSession);

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-indigo-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{repair.orderNumber}</p>
        <WorkshopStatusBadge repair={repair} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{repair.brand}</p>
        <p className="text-sm text-slate-700 dark:text-slate-300">{repair.model}</p>
        <p className="text-xs text-slate-400">{[repair.year, repair.engineCc ? `${repair.engineCc} cc` : null].filter(Boolean).join(" • ")}</p>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Mécanicien : {mechanic?.name ?? "Non affecté"}</p>
      {isRunning && (
        <p className="inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
          <TimerIcon className="h-3.5 w-3.5" /> {formatWorkshopChrono(elapsedSeconds)}
        </p>
      )}
    </button>
  );
}
