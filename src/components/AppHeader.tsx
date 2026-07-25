"use client";

import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNavDrawer } from "@/components/MobileNavDrawer";
import { Avatar } from "@/components/ui/Avatar";
import { Menu } from "@/components/ui/Menu";
import { ACCOUNT_MENU_OPTIONS, handleAccountMenuChange } from "@/config/accountMenu";

export function AppHeader() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-slate-200 bg-white/80 px-3 py-2.5 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/80">
      <MobileNavDrawer />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-horizontal.png" alt="EvoTask" className="h-11 w-auto rounded-md" />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Menu
          options={ACCOUNT_MENU_OPTIONS}
          value={[]}
          onChange={(next) => handleAccountMenuChange(next[0], logout)}
          ariaLabel="Account menu"
          align="end"
          renderTrigger={() => (
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Avatar name={user.name} color={user.color} size="sm" />
            </span>
          )}
        />
      </div>
    </header>
  );
}
