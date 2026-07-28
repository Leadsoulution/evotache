"use client";

import { KanbanIcon, ListIcon, SheetIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ContentViewMode = "list" | "board" | "products";

interface ContentViewToggleProps {
  value: ContentViewMode;
  onChange: (mode: ContentViewMode) => void;
  /** Only Stories exposes the Google Sheet "products to launch" view for now. */
  includeProducts?: boolean;
}

function ToggleButton({ mode, value, onChange, label, icon }: { mode: ContentViewMode; value: ContentViewMode; onChange: (m: ContentViewMode) => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(mode)}
      aria-label={label}
      aria-pressed={value === mode}
      className={cn(
        "rounded-md p-1.5",
        value === mode ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
      )}
    >
      {icon}
    </button>
  );
}

export function ContentViewToggle({ value, onChange, includeProducts }: ContentViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
      <ToggleButton mode="list" value={value} onChange={onChange} label="List view" icon={<ListIcon className="h-4 w-4" />} />
      <ToggleButton mode="board" value={value} onChange={onChange} label="Board view" icon={<KanbanIcon className="h-4 w-4" />} />
      {includeProducts && (
        <ToggleButton mode="products" value={value} onChange={onChange} label="Products to launch" icon={<SheetIcon className="h-4 w-4" />} />
      )}
    </div>
  );
}
