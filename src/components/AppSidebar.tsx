"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { getNavItems } from "@/config/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Avatar } from "@/components/ui/Avatar";
import { Menu } from "@/components/ui/Menu";
import { NavBadge } from "@/components/NavBadge";
import { ROLE_CONFIG } from "@/config/roleMeta";
import { ChevronDownIcon, DownloadIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { getAccountMenuOptions, handleAccountMenuChange } from "@/config/accountMenu";
import type { NavBadgeCounts } from "@/hooks/useNavBadgeCounts";

interface AppSidebarProps {
  navBadgeCounts: NavBadgeCounts;
}

export function AppSidebar({ navBadgeCounts }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const push = usePushSubscription();
  const { canInstall, install } = useInstallPrompt();

  if (!user) return null;
  const navItems = getNavItems(user);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-950">
      <div className="px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/app-logo-light.png" alt="EvoTask" className="h-14 w-auto rounded-md dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/app-logo-dark.png" alt="EvoTask" className="hidden h-14 w-auto rounded-md dark:block" />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const badgeCount = navBadgeCounts[item.href as keyof NavBadgeCounts] ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
                active
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
      <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
        {canInstall && (
          <button
            type="button"
            onClick={install}
            className="flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
          >
            <DownloadIcon className="h-4 w-4" />
            Install app
          </button>
        )}
        <LanguageToggle />
        <ThemeToggle />
        <Menu
          options={getAccountMenuOptions(push.supported, push.subscribed)}
          value={[]}
          onChange={(next) => handleAccountMenuChange(next[0], { logout, togglePush: push.subscribed ? push.unsubscribe : push.subscribe })}
          ariaLabel="Account menu"
          renderTrigger={() => (
            <span className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar name={user.name} color={user.color} photoDataUrl={user.photoDataUrl} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
                <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
                <span className={cn("text-[10px] font-medium", ROLE_CONFIG[user.role].textColor)}>{ROLE_CONFIG[user.role].label}</span>
              </span>
              <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </span>
          )}
        />
      </div>
    </aside>
  );
}
