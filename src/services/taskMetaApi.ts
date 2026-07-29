import type { PriorityDef, StatusDef } from "@/types/taskMeta";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

// --- Statuses ---

export async function fetchStatuses(): Promise<StatusDef[]> {
  const response = await fetch("/api/statuses");
  if (!response.ok) return [];
  return response.json();
}

export async function createStatus(input: { label: string; color: string }): Promise<StatusDef> {
  const response = await fetch("/api/statuses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateStatus(id: string, patch: Partial<Pick<StatusDef, "label" | "color">>): Promise<StatusDef> {
  const response = await fetch(`/api/statuses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteStatus(id: string): Promise<void> {
  const response = await fetch(`/api/statuses/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function reorderStatuses(orderedIds: string[]): Promise<StatusDef[]> {
  const response = await fetch("/api/statuses/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

// --- Priorities ---

export async function fetchPriorities(): Promise<PriorityDef[]> {
  const response = await fetch("/api/priorities");
  if (!response.ok) return [];
  return response.json();
}

export async function createPriority(input: { label: string; color: string }): Promise<PriorityDef> {
  const response = await fetch("/api/priorities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updatePriority(id: string, patch: Partial<Pick<PriorityDef, "label" | "color">>): Promise<PriorityDef> {
  const response = await fetch(`/api/priorities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deletePriority(id: string): Promise<void> {
  const response = await fetch(`/api/priorities/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function reorderPriorities(orderedIds: string[]): Promise<PriorityDef[]> {
  const response = await fetch("/api/priorities/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function fetchDefaultStatusId(): Promise<string> {
  const items = await fetchStatuses();
  return items[0]?.id ?? "todo";
}

export async function fetchDefaultPriorityId(): Promise<string> {
  const items = await fetchPriorities();
  return items[items.length - 1]?.id ?? "none";
}
