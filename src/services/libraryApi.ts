import type { LibraryDoc } from "@/types/library";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchLibraryDocs(): Promise<LibraryDoc[]> {
  const response = await fetch("/api/library");
  if (!response.ok) return [];
  return response.json();
}

export async function createLibraryDoc(input: { title: string; content: string }): Promise<LibraryDoc> {
  const response = await fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateLibraryDoc(id: string, patch: Partial<Pick<LibraryDoc, "title" | "content">>): Promise<LibraryDoc> {
  const response = await fetch(`/api/library/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteLibraryDoc(id: string): Promise<void> {
  const response = await fetch(`/api/library/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function reorderLibraryDocs(orderedIds: string[]): Promise<void> {
  const response = await fetch("/api/library/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
}
