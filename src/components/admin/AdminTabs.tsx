"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import { cn } from "@/lib/cn";

export function AdminTabs() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  const tabs = [
    ...(canManageUsers(user.role) ? [{ href: "/admin", label: "Users" }] : []),
    ...(canManageUsers(user.role) ? [{ href: "/admin/agents", label: "AI agents" }] : []),
    ...(canManageWorkflow(user.role) ? [{ href: "/admin/workflow", label: "Statuses & priorities" }, { href: "/admin/fields", label: "Custom fields" }] : []),
    ...(canManageUsers(user.role) ? [{ href: "/admin/backup", label: "Backup" }] : []),
  ];

  return (
    <nav className="flex min-w-0 gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
              active
                ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
