"use client";

import { useEffect } from "react";

// Root-level fallback — catches errors even in the root layout itself
// (auth/session loading, fonts, providers). Next.js replaces the whole
// document with this when triggered, so it needs its own <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center text-slate-900">
        <p className="text-sm font-medium text-slate-400">Something went wrong</p>
        <h1 className="text-xl font-semibold">EvoTasks hit an unexpected error</h1>
        <p className="max-w-sm text-sm text-slate-500">Nothing was lost — reload the page to continue.</p>
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
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
