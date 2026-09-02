"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNavBadgeCounts } from "@/hooks/useNavBadgeCounts";
import { useWorkshopAlarmSound } from "@/hooks/useWorkshopAlarmSound";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OverdueAlertPopup } from "@/components/notifications/OverdueAlertPopup";

// /atelier/tv is the unattended client-facing TV display — no login on
// that screen, no sidebar/header chrome, full-bleed.
const PUBLIC_ROUTES = new Set(["/login", "/atelier/tv"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const navBadgeCounts = useNavBadgeCounts();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  useWorkshopAlarmSound();

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicRoute) {
      router.replace("/login");
    }
    if (status === "authenticated" && pathname === "/login") {
      router.replace("/");
    }
  }, [status, isPublicRoute, pathname, router]);

  const showLoadingScreen =
    status === "loading" || (status === "unauthenticated" && !isPublicRoute) || (status === "authenticated" && pathname === "/login");

  if (showLoadingScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          role="status"
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400"
        />
      </div>
    );
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <OverdueAlertPopup />
      <AppSidebar navBadgeCounts={navBadgeCounts} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader navBadgeCounts={navBadgeCounts} />
        <div className="hidden justify-end border-b border-slate-200 px-4 py-2 md:flex dark:border-slate-800">
          <NotificationBell align="end" />
        </div>
        {/* Fixed-height shell, scrollable here: a normal page just renders
            taller-than-viewport content and this scrolls it, while a page
            like Chat that manages its own internal scrolling (h-full
            overflow-hidden) fits exactly and never triggers this scrollbar —
            either way, the sidebar/header stay pinned instead of scrolling
            away with page content. */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
