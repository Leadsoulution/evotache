"use client";

import { useAuth } from "@/hooks/useAuth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import { AlertTriangleIcon } from "@/components/ui/icons";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || (!canManageUsers(user.role) && !canManageWorkflow(user.role))) {
    return (
      <div className="mx-auto flex w-full max-w-[95%] flex-col items-center gap-3 px-4 py-24 text-center sm:px-6 lg:px-8">
        <AlertTriangleIcon className="h-10 w-10 text-amber-400" />
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Access denied</p>
          <p className="mt-1 text-sm text-slate-400">You don&apos;t have access to this section. Ask an admin to change your role.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
