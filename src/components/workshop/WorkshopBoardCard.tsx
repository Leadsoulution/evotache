"use client";

import { WorkshopFlagCard } from "./WorkshopFlagCard";
import { WorkshopRepairHeader } from "./WorkshopRepairHeader";
import { TimerIcon } from "@/components/ui/icons";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL, isWorkshopRepairLate } from "@/lib/workshopStats";
import type { Assignee } from "@/types/task";
import type { WorkshopRepair } from "@/types/workshop";

interface WorkshopBoardCardProps {
  repair: WorkshopRepair;
  mechanic: Assignee | null;
  onOpenDetail: () => void;
}

/** Atelier Board card (admin/commercial overview) — same icon-and-divider
 * flag-tab style as the TV display and "Mes réparations", plus the
 * internal-only extras (order number, assigned mechanic, "En retard")
 * the TV never shows. */
export function WorkshopBoardCard({ repair, mechanic, onOpenDetail }: WorkshopBoardCardProps) {
  const late = isWorkshopRepairLate(repair);
  const color = late ? "#ef4444" : WORKSHOP_STATUS_COLOR[repair.status];
  const label = late ? "En retard" : WORKSHOP_STATUS_LABEL[repair.status];
  const doneCount = repair.services.filter((s) => s.status === "done").length;
  const runningService = repair.services.find((s) => s.activeSession?.runningSince);

  return (
    <button type="button" onClick={onOpenDetail} className="block w-full text-left">
      <WorkshopFlagCard tabLabel={label} tabColor={color} bodyClassName="bg-white p-4 hover:shadow-xl dark:bg-slate-900" className="transition-shadow">
        <WorkshopRepairHeader
          color={color}
          orderNumber={repair.orderNumber}
          brand={repair.brand}
          model={repair.model}
          engineCc={repair.engineCc}
          services={repair.services.map((s) => s.description)}
        />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Mécanicien : {mechanic?.name ?? "Non affecté"}</p>
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
