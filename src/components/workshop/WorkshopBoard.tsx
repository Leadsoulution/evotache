"use client";

import { useMemo } from "react";
import { WorkshopBoardCard } from "./WorkshopBoardCard";
import { WORKSHOP_BOARD_STATUSES, WORKSHOP_STATUS_LABEL } from "@/lib/workshopStats";
import type { Assignee } from "@/types/task";
import type { WorkshopRepair } from "@/types/workshop";

interface WorkshopBoardProps {
  repairs: WorkshopRepair[];
  mechanics: Assignee[];
  onOpenDetail: (repair: WorkshopRepair) => void;
}

export function WorkshopBoard({ repairs, mechanics, onOpenDetail }: WorkshopBoardProps) {
  const mechanicById = useMemo(() => new Map(mechanics.map((m) => [m.id, m])), [mechanics]);
  const byStatus = useMemo(() => {
    const map = new Map<string, WorkshopRepair[]>();
    for (const status of WORKSHOP_BOARD_STATUSES) map.set(status, []);
    for (const repair of repairs) {
      if (!map.has(repair.status)) continue; // picked_up / cancelled aren't board columns
      map.get(repair.status)!.push(repair);
    }
    return map;
  }, [repairs]);

  return (
    <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
      {WORKSHOP_BOARD_STATUSES.map((status) => {
        const columnRepairs = byStatus.get(status) ?? [];
        return (
          <div key={status} className="flex min-w-64 flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{WORKSHOP_STATUS_LABEL[status]}</span>
              <span className="text-xs font-medium text-slate-400">{columnRepairs.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2.5">
              {columnRepairs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700">Aucune moto</div>
              ) : (
                columnRepairs.map((repair) => (
                  <WorkshopBoardCard key={repair.id} repair={repair} mechanic={mechanicById.get(repair.mechanicId ?? "") ?? null} onOpenDetail={() => onOpenDetail(repair)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
