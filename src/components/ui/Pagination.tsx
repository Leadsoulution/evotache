"use client";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "@/components/ui/icons";

const PAGE_SIZE_OPTIONS: (number | "all")[] = [5, 10, 25, 50, 100, "all"];

const navButtonClass =
  "flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-300";

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number | "all";
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number | "all") => void;
}

export function Pagination({ page, pageCount, pageSize, total, rangeStart, rangeEnd, onPageChange, onPageSizeChange }: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5">
          Page size:
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value === "all" ? "all" : Number(event.target.value))}
            aria-label="Rows per page"
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "all" ? "Tous" : opt}
              </option>
            ))}
          </select>
        </label>
        <span>{total === 0 ? "0 to 0 of 0" : `${rangeStart} to ${rangeEnd} of ${total}`}</span>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="First page" className={navButtonClass}>
          <ChevronsLeftIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className={navButtonClass}>
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
        <span className="px-1 tabular-nums">
          Page {page} of {pageCount}
        </span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page" className={navButtonClass}>
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => onPageChange(pageCount)} disabled={page >= pageCount} aria-label="Last page" className={navButtonClass}>
          <ChevronsRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
