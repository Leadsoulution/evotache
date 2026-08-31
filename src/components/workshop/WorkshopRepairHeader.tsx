"use client";

import { WrenchIcon } from "@/components/ui/icons";

interface WorkshopRepairHeaderProps {
  color: string;
  orderNumber: string;
  brand: string;
  model: string;
  engineCc: number | null;
  /** Prestation names joined into one line, like the TV card — an
   * at-a-glance summary; individual status/date/chrono per prestation
   * still lives in the checklist below (mechanic/commercial) or behind
   * the detail drawer (board). */
  services?: string[];
}

/** Icon-and-divider header — the exact same visual language as the
 * customer-facing TV card (WorkshopTvView) — reused across "Mes
 * réparations", the Atelier Board, and the detail drawer so every
 * internal view (mechanic, commercial, admin) reads as one design system.
 * Unlike the TV, this keeps the order number (an internal reference the
 * customer never needs) and can be colored for "En retard", which is
 * itself internal-only and never sent to the TV. */
export function WorkshopRepairHeader({ color, orderNumber, brand, model, engineCc, services }: WorkshopRepairHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1f`, color }}>
        <WrenchIcon className="h-6 w-6" />
      </span>
      <span className="h-11 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{orderNumber}</p>
        <p className="truncate text-xl font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">
          {brand} {model}
        </p>
        {engineCc != null && <p className="text-sm text-slate-500 dark:text-slate-400">{engineCc} cc</p>}
        {services && services.length > 0 && <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-300">{services.join(" • ")}</p>}
      </div>
    </div>
  );
}
