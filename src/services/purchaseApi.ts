import type { PurchaseColumnDef, PurchaseColumnType, PurchaseDropdownOption, PurchaseItem } from "@/types/purchase";

/** Image/video values are stored as base64 data URLs directly on the row, so this stays conservative to avoid oversized JSON payloads. */
export const MAX_PURCHASE_FILE_BYTES = 2 * 1024 * 1024;

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

// --- Columns ---

export async function fetchPurchaseColumns(): Promise<PurchaseColumnDef[]> {
  const response = await fetch("/api/purchases/columns");
  if (!response.ok) return [];
  return response.json();
}

export async function createPurchaseColumn(input: { name: string; type: PurchaseColumnType; options: PurchaseDropdownOption[] }): Promise<PurchaseColumnDef> {
  const response = await fetch("/api/purchases/columns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updatePurchaseColumn(id: string, patch: Partial<Pick<PurchaseColumnDef, "name" | "options">>): Promise<PurchaseColumnDef> {
  const response = await fetch(`/api/purchases/columns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deletePurchaseColumn(id: string): Promise<void> {
  const response = await fetch(`/api/purchases/columns/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

// --- Items (rows) ---

/** The `scope` argument is accepted for call-site compatibility but the server independently re-derives the real scope from the authenticated session. */
export interface PurchaseItemScope {
  userId: string;
  isAdmin: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility; the server derives the real scope from the session
export async function fetchPurchaseItems(scope: PurchaseItemScope): Promise<PurchaseItem[]> {
  const response = await fetch("/api/purchases/items");
  if (!response.ok) return [];
  return response.json();
}

export async function createPurchaseItem(): Promise<PurchaseItem> {
  const response = await fetch("/api/purchases/items", { method: "POST" });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updatePurchaseItem(id: string, values: Record<string, string>): Promise<PurchaseItem> {
  const response = await fetch(`/api/purchases/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updatePurchaseItemAssignees(id: string, assigneeIds: string[]): Promise<PurchaseItem> {
  const response = await fetch(`/api/purchases/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assigneeIds }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updatePurchaseItemExcludedUsers(id: string, excludedUserIds: string[]): Promise<PurchaseItem> {
  const response = await fetch(`/api/purchases/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ excludedUserIds }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deletePurchaseItem(id: string): Promise<void> {
  const response = await fetch(`/api/purchases/items/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
