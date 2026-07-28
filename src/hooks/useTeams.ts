"use client";

import { useCallback, useEffect, useState } from "react";
import { createTeam, deleteTeam, fetchTeams, updateTeam } from "@/services/teamApi";
import { fetchUsers } from "@/services/userApi";
import { useAuth } from "@/hooks/useAuth";
import { canManageUsers } from "@/config/roleMeta";
import { getVisibleUserIds } from "@/lib/orgChart";
import { useToast } from "@/components/ui/Toast";
import type { Team } from "@/types/team";

type LoadState = "loading" | "success" | "error";

export function useTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();
  const isAdmin = user ? canManageUsers(user.role) : false;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchUsers()
      .then((allUsers) => {
        const visibleUserIds = getVisibleUserIds(allUsers, user.id);
        return fetchTeams({ userId: user.id, isAdmin, visibleUserIds });
      })
      .then((list) => {
        if (cancelled) return;
        setTeams(list);
        setLoadState("success");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);

  const addTeam = useCallback(
    async (input: { name: string; color: string; memberIds: string[]; excludedUserIds?: string[] }) => {
      try {
        const created = await createTeam(input);
        setTeams((current) => [...current, created]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create team.");
        return false;
      }
    },
    [toast]
  );

  const editTeam = useCallback(
    async (id: string, patch: Partial<Pick<Team, "name" | "color" | "memberIds" | "excludedUserIds">>) => {
      const previous = teams;
      setTeams((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      try {
        await updateTeam(id, patch);
      } catch (err) {
        setTeams(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update team.");
      }
    },
    [teams, toast]
  );

  const removeTeam = useCallback(
    async (id: string) => {
      const previous = teams;
      setTeams((current) => current.filter((t) => t.id !== id));
      try {
        await deleteTeam(id);
      } catch (err) {
        setTeams(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete team.");
      }
    },
    [teams, toast]
  );

  return { teams, loadState, addTeam, editTeam, removeTeam };
}
