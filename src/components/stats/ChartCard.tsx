import type { ReactNode } from "react";
import Link from "next/link";

interface ChartCardProps {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
}

export function ChartCard({ title, action, children }: ChartCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        {action && (
          <Link href={action.href} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
