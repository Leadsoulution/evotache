"use client";

import { useCallback, useEffect, useState } from "react";
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
import { isPriorityInUse, isStatusInUse } from "@/services/taskApi";
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

export function useTaskMeta(): UseTaskMetaResult {
  const [statuses, setStatuses] = useState<StatusDef[]>([]);
  const [priorities, setPriorities] = useState<PriorityDef[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  const load = useCallback(() => {
    setLoadState("loading");
    Promise.all([fetchStatuses(), fetchPriorities()])
      .then(([statusList, priorityList]) => {
        setStatuses(statusList);
        setPriorities(priorityList);
        setLoadState("success");
      })
      .catch(() => setLoadState("error"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStatuses(), fetchPriorities()])
      .then(([statusList, priorityList]) => {
        if (cancelled) return;
        setStatuses(statusList);
        setPriorities(priorityList);
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

  const addStatus = useCallback(
    async (input: { label: string; color: string }) => {
      try {
        const created = await createStatus(input);
        setStatuses((current) => [...current, created]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add status.");
        return false;
      }
    },
    [toast]
  );

  const editStatus = useCallback(
    async (id: string, patch: Partial<Pick<StatusDef, "label" | "color">>) => {
      const previous = statuses;
      setStatuses((current) => current.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      try {
        await updateStatus(id, patch);
      } catch (err) {
        setStatuses(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update status.");
      }
    },
    [statuses, toast]
  );

  const removeStatus = useCallback(
    async (id: string) => {
      try {
        await deleteStatus(id, isStatusInUse);
        setStatuses((current) => current.filter((s) => s.id !== id));
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete status.");
        return false;
      }
    },
    [toast]
  );

  const moveStatus = useCallback(
    async (id: string, direction: 1 | -1) => {
      const index = statuses.findIndex((s) => s.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= statuses.length) return;
      const next = [...statuses];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      setStatuses(next);
      try {
        await reorderStatuses(next.map((s) => s.id));
      } catch {
        setStatuses(statuses);
        toast.error("Failed to reorder statuses.");
      }
    },
    [statuses, toast]
  );

  const addPriority = useCallback(
    async (input: { label: string; color: string }) => {
      try {
        const created = await createPriority(input);
        setPriorities((current) => [...current, created]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add priority.");
        return false;
      }
    },
    [toast]
  );

  const editPriority = useCallback(
    async (id: string, patch: Partial<Pick<PriorityDef, "label" | "color">>) => {
      const previous = priorities;
      setPriorities((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      try {
        await updatePriority(id, patch);
      } catch (err) {
        setPriorities(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update priority.");
      }
    },
    [priorities, toast]
  );

  const removePriority = useCallback(
    async (id: string) => {
      try {
        await deletePriority(id, isPriorityInUse);
        setPriorities((current) => current.filter((p) => p.id !== id));
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete priority.");
        return false;
      }
    },
    [toast]
  );

  const movePriority = useCallback(
    async (id: string, direction: 1 | -1) => {
      const index = priorities.findIndex((p) => p.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= priorities.length) return;
      const next = [...priorities];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      setPriorities(next);
      try {
        await reorderPriorities(next.map((p) => p.id));
      } catch {
        setPriorities(priorities);
        toast.error("Failed to reorder priorities.");
      }
    },
    [priorities, toast]
  );

  return {
    statuses,
    priorities,
    loadState,
    refetch: load,
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
