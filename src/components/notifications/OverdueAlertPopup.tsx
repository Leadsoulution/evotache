"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOverdueNotifications } from "@/hooks/useOverdueNotifications";
import { formatDueDate } from "@/lib/date";
import { AlertTriangleIcon, XIcon } from "@/components/ui/icons";

const SEEN_KEY = "evotasks.notifiedOverdue.v1";
const MODULE_HREF = { task: "/tasks", dispute: "/disputes" } as const;

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>): void {
  window.localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
}

/**
 * Proactive, center-of-screen alert for tasks that just became overdue for
 * the current user — separate from the always-available bell (NotificationBell):
 * this one surfaces once per task (tracked in localStorage) rather than
 * staying available on demand, so it doesn't nag on every navigation.
 */
export function OverdueAlertPopup() {
  const { user } = useAuth();
  const { overdue } = useOverdueNotifications();
  const router = useRouter();
  // Bumped after a dismissal to force the memo below to re-read localStorage,
  // since the "seen" set lives outside React state.
  const [seenVersion, setSeenVersion] = useState(0);

  const visible = useMemo(() => {
    if (!user) return [];
    const seen = readSeen();
    return overdue.filter((o) => !seen.has(`${user.id}:${o.id}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overdue, user?.id, seenVersion]);

  if (!user || visible.length === 0) return null;

  function dismiss() {
    if (!user) return;
    const seen = readSeen();
    for (const item of visible) seen.add(`${user.id}:${item.id}`);
    writeSeen(seen);
    setSeenVersion((v) => v + 1);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[85] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md animate-scale-in rounded-xl border border-red-200 bg-white p-4 shadow-2xl dark:border-red-900/60 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400">
            <AlertTriangleIcon className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {visible.length === 1 ? "1 overdue task" : `${visible.length} overdue tasks`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Assigned to you and past their due date.</p>
            <ul className="mt-2 flex flex-col gap-1">
              {visible.slice(0, 4).map((item) => (
                <li key={item.id} className="truncate text-xs text-slate-600 dark:text-slate-300">
                  &bull; {item.title} <span className="text-red-500">(due {formatDueDate(item.dueDate)})</span>
                </li>
              ))}
              {visible.length > 4 && <li className="text-xs text-slate-400">+{visible.length - 4} more</li>}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  router.push(MODULE_HREF[visible[0].module]);
                  dismiss();
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
              >
                View tasks
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
