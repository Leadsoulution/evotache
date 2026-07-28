"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useOverdueNotifications } from "@/hooks/useOverdueNotifications";
import { formatDueDate } from "@/lib/date";
import { BellIcon } from "@/components/ui/icons";

interface NotificationBellProps {
  align?: "start" | "end";
}

const MODULE_LABEL = { task: "Task", dispute: "Litige" } as const;
const MODULE_HREF = { task: "/tasks", dispute: "/disputes" } as const;

export function NotificationBell({ align = "end" }: NotificationBellProps) {
  const { overdue, count } = useOverdueNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (align === "end") {
      setPosition({ top: rect.bottom + 6, left: 0, right: window.innerWidth - rect.right });
    } else {
      setPosition({ top: rect.bottom + 6, left: rect.left, right: 0 });
    }
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `${count} overdue task notification(s)` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <BellIcon className="h-4.5 w-4.5" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-semibold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Overdue task notifications"
            style={{ position: "fixed", top: position.top, left: align === "start" ? position.left : undefined, right: align === "end" ? position.right : undefined }}
            className="z-[95] w-80 max-w-[calc(100vw-1.5rem)] animate-scale-in overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Overdue tasks</p>
              <p className="text-xs text-slate-400">{count > 0 ? `${count} task${count > 1 ? "s" : ""} assigned to you are late` : "You're all caught up"}</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {overdue.length === 0 && <p className="px-3.5 py-6 text-center text-xs text-slate-400">No overdue tasks. Nice.</p>}
              {overdue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(MODULE_HREF[item.module]);
                  }}
                  className="flex w-full items-start gap-2 border-b border-slate-50 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-700 dark:text-slate-200">{item.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-red-500">
                      <span>{MODULE_LABEL[item.module]}</span>
                      <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                      <span>Due {formatDueDate(item.dueDate)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
