"use client";

import { Menu } from "@/components/ui/Menu";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { getBadgeStyle } from "@/lib/badgeColor";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL, WORKSHOP_STATUS_ORDER } from "@/lib/workshopStats";
import type { WorkshopStatus } from "@/types/workshop";

interface WorkshopStatusMenuProps {
  value: WorkshopStatus;
  onChange: (next: WorkshopStatus) => void;
  readOnly?: boolean;
}

export function WorkshopStatusMenu({ value, onChange, readOnly }: WorkshopStatusMenuProps) {
  const options = WORKSHOP_STATUS_ORDER.map((status) => ({
    value: status,
    label: WORKSHOP_STATUS_LABEL[status],
    icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: WORKSHOP_STATUS_COLOR[status] }} />,
  }));

  const badge = (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold" style={getBadgeStyle(WORKSHOP_STATUS_COLOR[value])}>
      {WORKSHOP_STATUS_LABEL[value]}
    </span>
  );

  if (readOnly) return badge;

  return (
    <Menu
      options={options}
      value={[value]}
      onChange={(next) => onChange(next[0] as WorkshopStatus)}
      ariaLabel="Changer le statut"
      align="end"
      renderTrigger={({ open }) => (
        <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-shadow", open && "ring-2 ring-indigo-400")} style={getBadgeStyle(WORKSHOP_STATUS_COLOR[value])}>
          {WORKSHOP_STATUS_LABEL[value]}
          <ChevronDownIcon className="h-3 w-3 opacity-60" />
        </span>
      )}
    />
  );
}
