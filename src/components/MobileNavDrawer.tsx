"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { getNavItems } from "@/config/navigation";
import { NavBadge } from "@/components/NavBadge";
import { MenuIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { NavBadgeCounts } from "@/hooks/useNavBadgeCounts";

interface MobileNavDrawerProps {
  navBadgeCounts: NavBadgeCounts;
}

export function MobileNavDrawer({ navBadgeCounts }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  if (!user) return null;
  const navItems = getNavItems(user);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Open navigation menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex">
            <div className="absolute inset-0 animate-fade-in bg-black/30" onClick={() => setOpen(false)} />
            <aside className="relative flex h-full w-64 max-w-[80vw] animate-slide-up flex-col overflow-y-auto border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/app-logo-light.png" alt="EvoTask" className="h-11 w-auto rounded-md dark:hidden" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/app-logo-dark.png" alt="EvoTask" className="hidden h-11 w-auto rounded-md dark:block" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"
                  aria-label="Close navigation menu"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-0.5 p-2">
                {navItems.map((item) => {
                  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  const badgeCount = navBadgeCounts[item.href as keyof NavBadgeCounts] ?? 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      )}
                    >
                      <span className="relative inline-flex shrink-0">
                        <Icon className="h-4 w-4" />
                        <NavBadge count={badgeCount} />
                      </span>
                      {t(item.label)}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
