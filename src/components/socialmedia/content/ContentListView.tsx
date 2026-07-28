"use client";

import type { ReactNode } from "react";
import { TrashIcon } from "@/components/ui/icons";

export interface ContentListColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
}

interface ContentListViewProps<T extends { id: string }> {
  items: T[];
  columns: ContentListColumn<T>[];
  titleOf: (item: T) => string;
  onOpen: (item: T) => void;
  canManage: boolean;
  onRequestDelete: (id: string) => void;
  emptyLabel: string;
}

export function ContentListView<T extends { id: string }>({ items, columns, titleOf, onOpen, canManage, onRequestDelete, emptyLabel }: ContentListViewProps<T>) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="px-3 py-2">
              Title
            </th>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="whitespace-nowrap px-3 py-2">
                {column.label}
              </th>
            ))}
            <th scope="col" className="px-3 py-2" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <td className="max-w-[260px] px-3 py-2">
                <button type="button" onClick={() => onOpen(item)} className="truncate text-left font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400">
                  {titleOf(item)}
                </button>
              </td>
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-3 py-2 text-slate-600 dark:text-slate-300">
                  {column.render(item)}
                </td>
              ))}
              <td className="px-3 py-2 text-right">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => onRequestDelete(item.id)}
                    className="rounded-md p-1.5 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950 dark:hover:text-red-400"
                    aria-label={`Delete ${titleOf(item)}`}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
