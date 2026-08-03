import type { ArchivedItem, ArchiveFilters, DbSizeInfo } from "@/types/archive";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchDbSize(): Promise<DbSizeInfo> {
  const response = await fetch("/api/admin/db-size");
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function fetchArchivedItems(module?: string): Promise<ArchivedItem[]> {
  const response = await fetch(`/api/admin/archive${module ? `?module=${module}` : ""}`);
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function fetchArchivePreview(filters: ArchiveFilters): Promise<number> {
  const params = new URLSearchParams({ module: filters.module });
  if (filters.statusId) params.set("statusId", filters.statusId);
  if (filters.beforeDate) params.set("beforeDate", filters.beforeDate);
  const response = await fetch(`/api/admin/archive/preview?${params.toString()}`);
  if (!response.ok) return parseErrorOrThrow(response);
  const { count } = await response.json();
  return count;
}

export async function createArchive(filters: ArchiveFilters): Promise<number> {
  const response = await fetch("/api/admin/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  const { archivedCount } = await response.json();
  return archivedCount;
}

export async function restoreArchiveBatch(batchId: string): Promise<void> {
  const response = await fetch(`/api/admin/archive/batch/${batchId}/restore`, { method: "POST" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function deleteArchiveBatch(batchId: string): Promise<void> {
  const response = await fetch(`/api/admin/archive/batch/${batchId}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
