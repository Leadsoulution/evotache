"use client";

import { useAuth } from "@/hooks/useAuth";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { Menu } from "@/components/ui/Menu";
import { DownloadIcon } from "@/components/ui/icons";
import { getAccountMenuOptions, handleAccountMenuChange } from "@/config/accountMenu";
import { LOGO_VERSION } from "@/config/logoVersion";
import type { NavBadgeCounts } from "@/hooks/useNavBadgeCounts";

interface AppHeaderProps {
  navBadgeCounts: NavBadgeCounts;
}

export function AppHeader({ navBadgeCounts }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const push = usePushSubscription();
  const { canInstall, install } = useInstallPrompt();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-slate-200 bg-white/80 px-3 py-2.5 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/80">
      <MobileNavDrawer navBadgeCounts={navBadgeCounts} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/app-logo-light.png?v=${LOGO_VERSION}`} alt="EvoTask" className="h-11 w-auto rounded-md dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/app-logo-dark.png?v=${LOGO_VERSION}`} alt="EvoTask" className="hidden h-11 w-auto rounded-md dark:block" />
      <div className="ml-auto flex items-center gap-2">
        {canInstall && (
          <button
            type="button"
            onClick={install}
            title="Install app"
            aria-label="Install app"
            className="rounded-lg border border-indigo-200 bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
          >
            <DownloadIcon className="h-4 w-4" />
          </button>
        )}
        <NotificationBell align="end" />
        <LanguageToggle />
        <ThemeToggle />
        <Menu
          options={getAccountMenuOptions(push.supported, push.subscribed)}
          value={[]}
          onChange={(next) => handleAccountMenuChange(next[0], { logout, togglePush: push.subscribed ? push.unsubscribe : push.subscribe })}
          ariaLabel="Account menu"
          align="end"
          renderTrigger={() => (
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Avatar name={user.name} color={user.color} photoDataUrl={user.photoDataUrl} size="sm" />
            </span>
          )}
        />
      </div>
    </header>
  );
}
