"use client";

import { useCallback, useEffect, useState } from "react";
import { createProject, deleteProject, fetchProjects, updateProject } from "@/services/projectApi";
import { useToast } from "@/components/ui/Toast";
import type { Project } from "@/types/project";

type LoadState = "loading" | "success" | "error";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchProjects()
      .then((list) => {
        if (cancelled) return;
        setProjects(list);
        setLoadState("success");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addProject = useCallback(
    async (input: { name: string; description: string; color: string; logoDataUrl?: string | null; teamIds?: string[] }) => {
      try {
        const created = await createProject(input);
        setProjects((current) => [...current, created]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create project.");
        return false;
      }
    },
    [toast]
  );

  const editProject = useCallback(
    async (id: string, patch: Partial<Pick<Project, "name" | "description" | "color" | "logoDataUrl" | "teamIds">>) => {
      const previous = projects;
      setProjects((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      try {
        await updateProject(id, patch);
      } catch (err) {
        setProjects(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update project.");
      }
    },
    [projects, toast]
  );

  const removeProject = useCallback(
    async (id: string) => {
      const previous = projects;
      setProjects((current) => current.filter((p) => p.id !== id));
      try {
        await deleteProject(id);
      } catch (err) {
        setProjects(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete project.");
      }
    },
    [projects, toast]
  );

  return { projects, loadState, addProject, editProject, removeProject };
}
