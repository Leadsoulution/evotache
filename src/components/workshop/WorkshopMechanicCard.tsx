"use client";

import { WorkshopFlagCard } from "./WorkshopFlagCard";
import { WorkshopRepairHeader } from "./WorkshopRepairHeader";
import { WorkshopServiceRow } from "./WorkshopServiceRow";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL, isWorkshopRepairLate } from "@/lib/workshopStats";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import type { WorkshopRepair, WorkshopService } from "@/types/workshop";

interface WorkshopMechanicCardProps {
  repair: WorkshopRepair;
  onSessionAction: (serviceId: string, action: WorkshopSessionAction) => void;
  onToggleServiceDone?: (service: WorkshopService, done: boolean) => void;
  onOpenDetail: (repair: WorkshopRepair) => void;
  onDeleteService?: (serviceId: string) => void;
}

/** "Mes réparations" card — same icon-and-divider flag-tab style as the
 * TV display, with every prestation listed underneath like the rest of
 * the app's task lists — a checkbox plus title, unlike the customer-
 * facing TV which shows none of that. */
export function WorkshopMechanicCard({ repair, onSessionAction, onToggleServiceDone, onOpenDetail, onDeleteService }: WorkshopMechanicCardProps) {
  const late = isWorkshopRepairLate(repair);
  const color = late ? "#ef4444" : WORKSHOP_STATUS_COLOR[repair.status];
  const label = late ? "En retard" : WORKSHOP_STATUS_LABEL[repair.status];

  return (
    <WorkshopFlagCard tabLabel={label} tabColor={color} bodyClassName="bg-white p-5 dark:bg-slate-900">
      <button type="button" onClick={() => onOpenDetail(repair)} className="mb-3 block w-full text-left hover:opacity-80">
        <WorkshopRepairHeader
          color={color}
          orderNumber={repair.orderNumber}
          brand={repair.brand}
          model={repair.model}
          engineCc={repair.engineCc}
          services={repair.services.map((s) => s.description)}
        />
      </button>

      {repair.services.length === 0 ? (
        <p className="text-xs text-slate-400">Aucune prestation définie.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {repair.services.map((service) => (
            <WorkshopServiceRow
              key={service.id}
              service={service}
              onSessionAction={onSessionAction}
              onToggleDone={onToggleServiceDone ? (done) => onToggleServiceDone(service, done) : undefined}
              onDelete={onDeleteService ? () => onDeleteService(service.id) : undefined}
            />
          ))}
        </div>
      )}
    </WorkshopFlagCard>
  );
}
