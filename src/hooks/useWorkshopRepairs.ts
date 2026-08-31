"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import {
  createWorkshopRepairRequest,
  deleteWorkshopRepairRequest,
  fetchWorkshopRepairs,
  updateWorkshopRepairRequest,
  workshopSessionActionRequest,
} from "@/services/workshopApi";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import { useToast } from "@/components/ui/Toast";
import type { WorkshopRepair, WorkshopRepairDraft } from "@/types/workshop";

// Polled every 15s — same "reuse the app's existing convention" approach
// as chat/biometrics (SWR refreshInterval), not a new WebSocket/SSE layer.
// Short enough that the board and the TV display both feel live without
// needing every client action to also broadcast an update itself.
const REFRESH_MS = 15_000;

export function useWorkshopRepairs() {
  const toast = useToast();
  const { data, isLoading, error, mutate } = useSWR<WorkshopRepair[]>("workshop-repairs", fetchWorkshopRepairs, { refreshInterval: REFRESH_MS });
  const repairs = useMemo(() => data ?? [], [data]);
  const repairsRef = useRef(repairs);
  useEffect(() => {
    repairsRef.current = repairs;
  }, [repairs]);

  const createRepair = useCallback(
    async (draft: WorkshopRepairDraft) => {
      try {
        const created = await createWorkshopRepairRequest(draft);
        await mutate((current) => [created, ...(current ?? [])], { revalidate: false });
        return created;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create the repair.");
        return null;
      }
    },
    [mutate, toast]
  );

  const updateRepair = useCallback(
    async (id: string, patch: Partial<WorkshopRepair>) => {
      const previous = repairsRef.current;
      await mutate(
        previous.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        { revalidate: false }
      );
      try {
        const updated = await updateWorkshopRepairRequest(id, patch);
        await mutate((current) => (current ?? previous).map((r) => (r.id === id ? updated : r)), { revalidate: false });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update the repair.");
      }
    },
    [mutate, toast]
  );

  const deleteRepair = useCallback(
    async (id: string) => {
      const previous = repairsRef.current;
      await mutate(
        previous.filter((r) => r.id !== id),
        { revalidate: false }
      );
      try {
        await deleteWorkshopRepairRequest(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete the repair.");
      }
    },
    [mutate, toast]
  );

  const runSessionAction = useCallback(
    async (id: string, action: WorkshopSessionAction) => {
      try {
        const updated = await workshopSessionActionRequest(id, action);
        await mutate((current) => (current ?? repairsRef.current).map((r) => (r.id === id ? updated : r)), { revalidate: false });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update the chrono.");
      }
    },
    [mutate, toast]
  );

  return {
    repairs,
    loadState: error ? ("error" as const) : isLoading ? ("loading" as const) : ("success" as const),
    createRepair,
    updateRepair,
    deleteRepair,
    runSessionAction,
    refetch: () => mutate(),
  };
}
