"use client";

import { WorkshopFlagCard } from "./WorkshopFlagCard";
import { WorkshopServiceRow } from "./WorkshopServiceRow";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL, isWorkshopRepairLate } from "@/lib/workshopStats";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import type { WorkshopRepair } from "@/types/workshop";

interface WorkshopMechanicCardProps {
  repair: WorkshopRepair;
  onSessionAction: (serviceId: string, action: WorkshopSessionAction) => void;
  onOpenDetail: (repair: WorkshopRepair) => void;
  onDeleteService?: (serviceId: string) => void;
}

/** "Mes réparations" card — same flag-tab visual language as the TV
 * display (per request: same look for the team, but with everything a
 * mechanic actually needs — BC, full dates, and every prestation with its
 * own chrono, unlike the customer-facing TV which shows none of that). */
export function WorkshopMechanicCard({ repair, onSessionAction, onOpenDetail, onDeleteService }: WorkshopMechanicCardProps) {
  const late = isWorkshopRepairLate(repair);
  const color = late ? "#ef4444" : WORKSHOP_STATUS_COLOR[repair.status];
  const label = late ? "En retard" : WORKSHOP_STATUS_LABEL[repair.status];

  return (
    <WorkshopFlagCard tabLabel={label} tabColor={color} bodyClassName="bg-white p-5 dark:bg-slate-900">
      <div className="mb-3 flex items-start justify-between gap-2">
        <button type="button" onClick={() => onOpenDetail(repair)} className="min-w-0 text-left hover:opacity-80">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{repair.orderNumber}</p>
          <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
            {repair.brand} {repair.model}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{[repair.year, repair.engineCc ? `${repair.engineCc} cc` : null].filter(Boolean).join(" • ")}</p>
        </button>
      </div>

      {repair.services.length === 0 ? (
        <p className="text-xs text-slate-400">Aucune prestation définie.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {repair.services.map((service) => (
            <WorkshopServiceRow
              key={service.id}
              service={service}
              onSessionAction={onSessionAction}
              onDelete={onDeleteService ? () => onDeleteService(service.id) : undefined}
            />
          ))}
        </div>
      )}
    </WorkshopFlagCard>
  );
}
