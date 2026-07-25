import { cn } from "@/lib/cn";

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "default" | "warning" | "critical";
}

const TONE_CLASSES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-slate-900 dark:text-slate-50",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
};

export function StatTile({ label, value, icon, tone = "default" }: StatTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className={cn("text-2xl font-semibold tabular-nums", TONE_CLASSES[tone])}>{value}</p>
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
