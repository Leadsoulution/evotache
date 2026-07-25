export function TaskListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-hidden="true">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <ul>
        {Array.from({ length: 8 }).map((_, index) => (
          <li key={index} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800">
            <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-800" style={{ animationDelay: `${index * 60}ms` }} />
            <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          </li>
        ))}
      </ul>
    </div>
  );
}
