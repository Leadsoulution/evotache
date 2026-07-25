"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { canManageUsers } from "@/config/roleMeta";
import { AdminUsersView } from "./AdminUsersView";

export function AdminHome() {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = user ? canManageUsers(user.role) : false;

  useEffect(() => {
    if (user && !allowed) router.replace("/admin/workflow");
  }, [user, allowed, router]);

  if (!allowed) return null;
  return <AdminUsersView />;
}
