import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface WorkshopFlagCardProps {
  tabLabel: string;
  tabColor: string;
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
}

/** Shared shell for the reference-image card style: a small flag-shaped
 * tab (angled cut on its right edge, like a ticket stub) overlapping the
 * top-left corner of a thick-bordered, heavily-rounded card — used both by
 * the public TV display and the internal mechanic/board views, so the
 * "look" stays one system instead of two implementations drifting apart. */
export function WorkshopFlagCard({ tabLabel, tabColor, bodyClassName, className, children }: WorkshopFlagCardProps) {
  return (
    <div className={cn("relative pt-5", className)}>
      <div
        className="absolute left-6 top-0 z-10 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-md"
        style={{ backgroundColor: tabColor, clipPath: "polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)" }}
      >
        {tabLabel}
      </div>
      <div className={cn("rounded-[1.75rem] border-[3px] shadow-lg", bodyClassName)} style={{ borderColor: tabColor }}>
        {children}
      </div>
    </div>
  );
}
