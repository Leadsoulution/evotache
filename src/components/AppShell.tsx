"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNavBadgeCounts } from "@/hooks/useNavBadgeCounts";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OverdueAlertPopup } from "@/components/notifications/OverdueAlertPopup";

const PUBLIC_ROUTES = new Set(["/login"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const navBadgeCounts = useNavBadgeCounts();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

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
    <div className="flex min-h-screen flex-col md:flex-row">
      <OverdueAlertPopup />
      <AppSidebar navBadgeCounts={navBadgeCounts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader navBadgeCounts={navBadgeCounts} />
        <div className="hidden justify-end border-b border-slate-200 px-4 py-2 md:flex dark:border-slate-800">
          <NotificationBell align="end" />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
