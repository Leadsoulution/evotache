"use client";

import { WorkshopFlagCard } from "./WorkshopFlagCard";
import { TimerIcon } from "@/components/ui/icons";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL, isWorkshopRepairLate } from "@/lib/workshopStats";
import type { Assignee } from "@/types/task";
import type { WorkshopRepair } from "@/types/workshop";

interface WorkshopBoardCardProps {
  repair: WorkshopRepair;
  mechanic: Assignee | null;
  onOpenDetail: () => void;
}

export function WorkshopBoardCard({ repair, mechanic, onOpenDetail }: WorkshopBoardCardProps) {
  const late = isWorkshopRepairLate(repair);
  const color = late ? "#ef4444" : WORKSHOP_STATUS_COLOR[repair.status];
  const label = late ? "En retard" : WORKSHOP_STATUS_LABEL[repair.status];
  const doneCount = repair.services.filter((s) => s.status === "done").length;
  const runningService = repair.services.find((s) => s.activeSession?.runningSince);

  return (
    <button type="button" onClick={onOpenDetail} className="block w-full text-left">
      <WorkshopFlagCard tabLabel={label} tabColor={color} bodyClassName="bg-white p-3 hover:shadow-xl dark:bg-slate-900" className="transition-shadow">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{repair.orderNumber}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{repair.brand}</p>
        <p className="text-sm text-slate-700 dark:text-slate-300">{repair.model}</p>
        <p className="text-xs text-slate-400">{[repair.year, repair.engineCc ? `${repair.engineCc} cc` : null].filter(Boolean).join(" • ")}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mécanicien : {mechanic?.name ?? "Non affecté"}</p>
        {repair.services.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {doneCount}/{repair.services.length} prestation{repair.services.length > 1 ? "s" : ""} terminée{doneCount > 1 ? "s" : ""}
          </p>
        )}
        {runningService && (
          <p className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <TimerIcon className="h-3 w-3" /> En cours
          </p>
        )}
      </WorkshopFlagCard>
    </button>
  );
}
