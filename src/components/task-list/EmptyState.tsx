import { InboxIcon } from "@/components/ui/icons";

interface EmptyStateProps {
  onClearFilters: () => void;
}

export function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
      <InboxIcon className="h-10 w-10 text-slate-300 dark:text-slate-700" />
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No tasks match your filters</p>
        <p className="mt-1 text-sm text-slate-400">Try adjusting or clearing your filters.</p>
      </div>
      <button
        type="button"
        onClick={onClearFilters}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Clear filters
      </button>
    </div>
  );
}
