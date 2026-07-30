"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { createProject, deleteProject, fetchProjects, updateProject } from "@/services/projectApi";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import type { Project } from "@/types/project";
import type { VisibilityScope } from "@/lib/orgChart";

type LoadState = "loading" | "success" | "error";

// See useTeams.ts — the scope argument is ignored server-side.
const IGNORED_SCOPE: VisibilityScope = { userId: "", isAdmin: false, visibleUserIds: [] };
const PROJECTS_KEY = "projects";

export function useProjects() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<Project[]>(user ? PROJECTS_KEY : null, () => fetchProjects(IGNORED_SCOPE));
  const projects = useMemo(() => data ?? [], [data]);
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";

  const addProject = useCallback(
    async (input: { name: string; description: string; color: string; logoDataUrl?: string | null; teamIds?: string[]; excludedUserIds?: string[] }) => {
      try {
        const created = await createProject(input);
        await mutate([...projects, created], { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create project.");
        return false;
      }
    },
    [projects, mutate, toast]
  );

  const editProject = useCallback(
    async (id: string, patch: Partial<Pick<Project, "name" | "description" | "color" | "logoDataUrl" | "teamIds" | "excludedUserIds">>) => {
      const previous = projects;
      await mutate(previous.map((p) => (p.id === id ? { ...p, ...patch } : p)), { revalidate: false });
      try {
        await updateProject(id, patch);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update project.");
      }
    },
    [projects, mutate, toast]
  );

  const removeProject = useCallback(
    async (id: string) => {
      const previous = projects;
      await mutate(previous.filter((p) => p.id !== id), { revalidate: false });
      try {
        await deleteProject(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete project.");
      }
    },
    [projects, mutate, toast]
  );

  return { projects, loadState, addProject, editProject, removeProject };
}
