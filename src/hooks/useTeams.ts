"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { createTeam, deleteTeam, fetchTeams, updateTeam } from "@/services/teamApi";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import type { Team } from "@/types/team";
import type { VisibilityScope } from "@/lib/orgChart";

type LoadState = "loading" | "success" | "error";

// The scope argument is accepted for call-site compatibility with
// fetchTeams()'s signature but ignored server-side (the server derives the
// real scope from the session), so there's no need to compute a real one here.
const IGNORED_SCOPE: VisibilityScope = { userId: "", isAdmin: false, visibleUserIds: [] };
const TEAMS_KEY = "teams";

export function useTeams() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<Team[]>(user ? TEAMS_KEY : null, () => fetchTeams(IGNORED_SCOPE));
  const teams = useMemo(() => data ?? [], [data]);
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";

  const addTeam = useCallback(
    async (input: { name: string; color: string; memberIds: string[]; excludedUserIds?: string[] }) => {
      try {
        const created = await createTeam(input);
        await mutate([...teams, created], { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create team.");
        return false;
      }
    },
    [teams, mutate, toast]
  );

  const editTeam = useCallback(
    async (id: string, patch: Partial<Pick<Team, "name" | "color" | "memberIds" | "excludedUserIds">>) => {
      const previous = teams;
      await mutate(previous.map((t) => (t.id === id ? { ...t, ...patch } : t)), { revalidate: false });
      try {
        await updateTeam(id, patch);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update team.");
      }
    },
    [teams, mutate, toast]
  );

  const removeTeam = useCallback(
    async (id: string) => {
      const previous = teams;
      await mutate(previous.filter((t) => t.id !== id), { revalidate: false });
      try {
        await deleteTeam(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete team.");
      }
    },
    [teams, mutate, toast]
  );

  return { teams, loadState, addTeam, editTeam, removeTeam };
}
