import { getBadgeStyle } from "@/lib/badgeColor";
import { AlertTriangleIcon } from "@/components/ui/icons";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL, isWorkshopRepairLate } from "@/lib/workshopStats";
import type { WorkshopRepair } from "@/types/workshop";

interface WorkshopStatusBadgeProps {
  repair: Pick<WorkshopRepair, "status" | "expectedCompletionDate">;
  className?: string;
}

/** "En retard" overlays the real status rather than replacing it — a late
 * repair is still, say, "En attente de pièce", just flagged red — since
 * lateness is computed (see isWorkshopRepairLate), not a status anyone
 * picks or clears by hand. */
export function WorkshopStatusBadge({ repair, className }: WorkshopStatusBadgeProps) {
  const late = isWorkshopRepairLate(repair);
  if (late) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${className ?? ""}`}
        style={getBadgeStyle("#ef4444")}
      >
        <AlertTriangleIcon className="h-3 w-3" />
        En retard
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${className ?? ""}`} style={getBadgeStyle(WORKSHOP_STATUS_COLOR[repair.status])}>
      {WORKSHOP_STATUS_LABEL[repair.status]}
    </span>
  );
}
