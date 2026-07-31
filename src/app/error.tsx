"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-medium text-slate-400">Something went wrong</p>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">This page hit an unexpected error</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Nothing was lost — try again, or reload the page if it keeps happening.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
