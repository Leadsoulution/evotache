"use client";

import { Menu } from "@/components/ui/Menu";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { CustomFieldDef } from "@/types/customField";

export const BUILT_IN_COLUMNS = [
  { id: "assignees", label: "Assignees" },
  { id: "dueDate", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "status", label: "Status" },
];

interface ColumnsMenuProps {
  customFields: CustomFieldDef[];
  hiddenColumnIds: string[];
  onToggle: (columnId: string) => void;
}

export function ColumnsMenu({ customFields, hiddenColumnIds, onToggle }: ColumnsMenuProps) {
  const allColumns = [...BUILT_IN_COLUMNS, ...customFields.map((f) => ({ id: f.id, label: f.name }))];
  const visibleIds = allColumns.map((c) => c.id).filter((id) => !hiddenColumnIds.includes(id));

  return (
    <Menu
      options={allColumns.map((c) => ({ value: c.id, label: c.label }))}
      value={visibleIds}
      multiple
      onChange={(nextVisible) => {
        for (const column of allColumns) {
          const shouldBeVisible = nextVisible.includes(column.id);
          const isVisible = !hiddenColumnIds.includes(column.id);
          if (shouldBeVisible !== isVisible) onToggle(column.id);
        }
      }}
      ariaLabel="Show or hide columns"
      align="end"
      renderTrigger={() => (
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          Columns
          <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
        </span>
      )}
    />
  );
}
