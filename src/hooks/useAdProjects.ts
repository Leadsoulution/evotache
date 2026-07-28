"use client";

import { useCallback, useEffect, useState } from "react";
import { createAdProject, deleteAdProject, fetchAdProjects, updateAdProject } from "@/services/adProjectApi";
import { deleteAdCampaignsByProject } from "@/services/adCampaignApi";
import { useToast } from "@/components/ui/Toast";
import type { AdPlatform, AdProject, AdProjectStatus } from "@/types/socialMedia";

type LoadState = "loading" | "success" | "error";

interface AdProjectInput {
  name: string;
  client: string;
  platform: AdPlatform;
  status: AdProjectStatus;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
}

export function useAdProjects() {
  const [projects, setProjects] = useState<AdProject[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchAdProjects()
      .then((list) => {
        if (cancelled) return;
        setProjects(list);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addProject = useCallback(
    async (input: AdProjectInput) => {
      try {
        const created = await createAdProject(input);
        setProjects((current) => [...current, created]);
        toast.success(`${created.name} was created.`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create the project.");
        return false;
      }
    },
    [toast]
  );

  const editProject = useCallback(
    async (id: string, patch: Partial<AdProjectInput> & { archived?: boolean }) => {
      const previous = projects;
      setProjects((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      try {
        await updateAdProject(id, patch);
      } catch (err) {
        setProjects(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update the project.");
      }
    },
    [projects, toast]
  );

  const toggleArchive = useCallback(
    (id: string, archived: boolean) => editProject(id, { archived }),
    [editProject]
  );

  const removeProject = useCallback(
    async (id: string) => {
      const previous = projects;
      setProjects((current) => current.filter((p) => p.id !== id));
      try {
        await deleteAdProject(id);
        await deleteAdCampaignsByProject(id);
      } catch (err) {
        setProjects(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete the project.");
      }
    },
    [projects, toast]
  );

  return { projects, loadState, addProject, editProject, toggleArchive, removeProject };
}
