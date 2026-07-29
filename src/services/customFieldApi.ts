import type { CustomFieldDef, CustomFieldOption, CustomFieldType } from "@/types/customField";

/** Image/video custom-field values are stored as base64 data URLs directly on the task record, so this stays conservative to avoid hitting the origin's storage quota. */
export const MAX_CUSTOM_FIELD_FILE_BYTES = 2 * 1024 * 1024;

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchCustomFields(): Promise<CustomFieldDef[]> {
  const response = await fetch("/api/custom-fields");
  if (!response.ok) return [];
  return response.json();
}

export async function createCustomField(input: { name: string; type: CustomFieldType; options: CustomFieldOption[] }): Promise<CustomFieldDef> {
  const response = await fetch("/api/custom-fields", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateCustomField(id: string, patch: Partial<Pick<CustomFieldDef, "name" | "options">>): Promise<CustomFieldDef> {
  const response = await fetch(`/api/custom-fields/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteCustomField(id: string): Promise<void> {
  const response = await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
