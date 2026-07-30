"use client";

import { useCallback } from "react";
import useSWR from "swr";
import {
  createPriority,
  createStatus,
  deletePriority,
  deleteStatus,
  fetchPriorities,
  fetchStatuses,
  reorderPriorities,
  reorderStatuses,
  updatePriority,
  updateStatus,
} from "@/services/taskMetaApi";
import { useToast } from "@/components/ui/Toast";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";

type LoadState = "loading" | "success" | "error";

interface UseTaskMetaResult {
  statuses: StatusDef[];
  priorities: PriorityDef[];
  loadState: LoadState;
  refetch: () => void;
  addStatus: (input: { label: string; color: string }) => Promise<boolean>;
  editStatus: (id: string, patch: Partial<Pick<StatusDef, "label" | "color">>) => Promise<void>;
  removeStatus: (id: string) => Promise<boolean>;
  moveStatus: (id: string, direction: 1 | -1) => Promise<void>;
  addPriority: (input: { label: string; color: string }) => Promise<boolean>;
  editPriority: (id: string, patch: Partial<Pick<PriorityDef, "label" | "color">>) => Promise<void>;
  removePriority: (id: string) => Promise<boolean>;
  movePriority: (id: string, direction: 1 | -1) => Promise<void>;
}

const STATUSES_KEY = "statuses";
const PRIORITIES_KEY = "priorities";

export function useTaskMeta(): UseTaskMetaResult {
  const toast = useToast();
  const statusesSWR = useSWR<StatusDef[]>(STATUSES_KEY, fetchStatuses);
  const prioritiesSWR = useSWR<PriorityDef[]>(PRIORITIES_KEY, fetchPriorities);
  const statuses = statusesSWR.data ?? [];
  const priorities = prioritiesSWR.data ?? [];
  const loadState: LoadState =
    statusesSWR.error || prioritiesSWR.error ? "error" : statusesSWR.isLoading || prioritiesSWR.isLoading ? "loading" : "success";

  const refetch = useCallback(() => {
    void statusesSWR.mutate();
    void prioritiesSWR.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addStatus = useCallback(
    async (input: { label: string; color: string }) => {
      try {
        const created = await createStatus(input);
        await statusesSWR.mutate([...statuses, created], { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add status.");
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses, toast]
  );

  const editStatus = useCallback(
    async (id: string, patch: Partial<Pick<StatusDef, "label" | "color">>) => {
      const previous = statuses;
      await statusesSWR.mutate(previous.map((s) => (s.id === id ? { ...s, ...patch } : s)), { revalidate: false });
      try {
        await updateStatus(id, patch);
      } catch (err) {
        await statusesSWR.mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update status.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses, toast]
  );

  const removeStatus = useCallback(
    async (id: string) => {
      try {
        await deleteStatus(id);
        await statusesSWR.mutate(statuses.filter((s) => s.id !== id), { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete status.");
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses, toast]
  );

  const moveStatus = useCallback(
    async (id: string, direction: 1 | -1) => {
      const index = statuses.findIndex((s) => s.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= statuses.length) return;
      const next = [...statuses];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      await statusesSWR.mutate(next, { revalidate: false });
      try {
        await reorderStatuses(next.map((s) => s.id));
      } catch {
        await statusesSWR.mutate(statuses, { revalidate: false });
        toast.error("Failed to reorder statuses.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses, toast]
  );

  const addPriority = useCallback(
    async (input: { label: string; color: string }) => {
      try {
        const created = await createPriority(input);
        await prioritiesSWR.mutate([...priorities, created], { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add priority.");
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priorities, toast]
  );

  const editPriority = useCallback(
    async (id: string, patch: Partial<Pick<PriorityDef, "label" | "color">>) => {
      const previous = priorities;
      await prioritiesSWR.mutate(previous.map((p) => (p.id === id ? { ...p, ...patch } : p)), { revalidate: false });
      try {
        await updatePriority(id, patch);
      } catch (err) {
        await prioritiesSWR.mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update priority.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priorities, toast]
  );

  const removePriority = useCallback(
    async (id: string) => {
      try {
        await deletePriority(id);
        await prioritiesSWR.mutate(priorities.filter((p) => p.id !== id), { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete priority.");
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priorities, toast]
  );

  const movePriority = useCallback(
    async (id: string, direction: 1 | -1) => {
      const index = priorities.findIndex((p) => p.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= priorities.length) return;
      const next = [...priorities];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      await prioritiesSWR.mutate(next, { revalidate: false });
      try {
        await reorderPriorities(next.map((p) => p.id));
      } catch {
        await prioritiesSWR.mutate(priorities, { revalidate: false });
        toast.error("Failed to reorder priorities.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [priorities, toast]
  );

  return {
    statuses,
    priorities,
    loadState,
    refetch,
    addStatus,
    editStatus,
    removeStatus,
    moveStatus,
    addPriority,
    editPriority,
    removePriority,
    movePriority,
  };
}
