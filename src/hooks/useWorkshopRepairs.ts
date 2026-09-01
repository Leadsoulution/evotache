"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import {
  createWorkshopRepairRequest,
  createWorkshopServiceRequest,
  deleteWorkshopRepairRequest,
  deleteWorkshopServiceRequest,
  fetchWorkshopRepairs,
  updateWorkshopRepairRequest,
  updateWorkshopServiceRequest,
  workshopServiceSessionActionRequest,
} from "@/services/workshopApi";
import type { WorkshopSessionAction } from "@/services/workshopApi";
import { useToast } from "@/components/ui/Toast";
import type { WorkshopRepair, WorkshopRepairDraft, WorkshopService } from "@/types/workshop";

// Polled every 15s — same "reuse the app's existing convention" approach
// as chat/biometrics (SWR refreshInterval), not a new WebSocket/SSE layer.
// Short enough that the board and the TV display both feel live without
// needing every client action to also broadcast an update itself.
const REFRESH_MS = 15_000;

/** Replaces one service within its parent repair, wherever it is in the
 * list — every service mutation (edit/delete/chrono action) is really "one
 * repair's nested services array changed", so this one helper covers all
 * of them. */
function replaceService(repairs: WorkshopRepair[], serviceId: string, next: WorkshopService | null): WorkshopRepair[] {
  return repairs.map((repair) => {
    if (!repair.services.some((s) => s.id === serviceId)) return repair;
    const services = next ? repair.services.map((s) => (s.id === serviceId ? next : s)) : repair.services.filter((s) => s.id !== serviceId);
    return { ...repair, services };
  });
}

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

  const createService = useCallback(
    async (repairId: string, description: string, durationMinutes: number | null) => {
      try {
        const created = await createWorkshopServiceRequest(repairId, description, durationMinutes);
        await mutate(
          (current) => (current ?? repairsRef.current).map((r) => (r.id === repairId ? { ...r, services: [...r.services, created] } : r)),
          { revalidate: false }
        );
        return created;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add the service.");
        return null;
      }
    },
    [mutate, toast]
  );

  const updateService = useCallback(
    async (id: string, patch: Partial<WorkshopService>) => {
      const previous = repairsRef.current;
      await mutate(replaceService(previous, id, { ...previous.flatMap((r) => r.services).find((s) => s.id === id)!, ...patch }), { revalidate: false });
      try {
        const updated = await updateWorkshopServiceRequest(id, patch);
        await mutate((current) => replaceService(current ?? previous, id, updated), { revalidate: false });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update the service.");
      }
    },
    [mutate, toast]
  );

  const deleteService = useCallback(
    async (id: string) => {
      const previous = repairsRef.current;
      await mutate(replaceService(previous, id, null), { revalidate: false });
      try {
        await deleteWorkshopServiceRequest(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete the service.");
      }
    },
    [mutate, toast]
  );

  const runServiceSessionAction = useCallback(
    async (serviceId: string, action: WorkshopSessionAction) => {
      try {
        const updated = await workshopServiceSessionActionRequest(serviceId, action);
        // A "start" also flips the parent repair to in_progress server-side
        // — cheapest way to keep that in sync client-side is a background
        // revalidation rather than reconstructing repair-level state here.
        await mutate((current) => replaceService(current ?? repairsRef.current, serviceId, updated), { revalidate: action === "start" });
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
    createService,
    updateService,
    deleteService,
    runServiceSessionAction,
    refetch: () => mutate(),
  };
}
