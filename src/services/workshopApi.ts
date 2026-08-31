import type { WorkshopRepair, WorkshopRepairDraft, WorkshopStatusHistoryEntry, WorkshopTvRepair } from "@/types/workshop";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchWorkshopRepairs(): Promise<WorkshopRepair[]> {
  const response = await fetch("/api/workshop/repairs");
  if (!response.ok) return [];
  return response.json();
}

export async function createWorkshopRepairRequest(draft: WorkshopRepairDraft): Promise<WorkshopRepair> {
  const response = await fetch("/api/workshop/repairs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateWorkshopRepairRequest(id: string, patch: Partial<WorkshopRepair>): Promise<WorkshopRepair> {
  const response = await fetch(`/api/workshop/repairs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteWorkshopRepairRequest(id: string): Promise<void> {
  const response = await fetch(`/api/workshop/repairs/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export type WorkshopSessionAction = "start" | "pause" | "resume" | "end";

export async function workshopSessionActionRequest(id: string, action: WorkshopSessionAction): Promise<WorkshopRepair> {
  const response = await fetch(`/api/workshop/repairs/${id}/session`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function fetchWorkshopStatusHistory(id: string): Promise<WorkshopStatusHistoryEntry[]> {
  const response = await fetch(`/api/workshop/repairs/${id}/history`);
  if (!response.ok) return [];
  return response.json();
}

export async function fetchWorkshopTvRepairs(): Promise<WorkshopTvRepair[]> {
  const response = await fetch("/api/workshop/tv");
  if (!response.ok) return [];
  return response.json();
}
