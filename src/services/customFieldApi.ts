import { generateId } from "@/lib/id";
import type { CustomFieldDef, CustomFieldOption, CustomFieldType } from "@/types/customField";

const STORAGE_KEY = "evotasks.customfields.v1";
const NETWORK_DELAY_MS = 250;

/** Image/video custom-field values are stored as base64 data URLs directly on the task record, so this stays conservative to avoid hitting the origin's storage quota. */
export const MAX_CUSTOM_FIELD_FILE_BYTES = 2 * 1024 * 1024;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readList(): CustomFieldDef[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CustomFieldDef[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return [...parsed].sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

function writeList(items: CustomFieldDef[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function fetchCustomFields(): Promise<CustomFieldDef[]> {
  await delay(NETWORK_DELAY_MS);
  return readList();
}

export async function createCustomField(input: { name: string; type: CustomFieldType; options: CustomFieldOption[] }): Promise<CustomFieldDef> {
  await delay(NETWORK_DELAY_MS);
  const name = input.name.trim();
  if (!name) throw new ApiError("Field name is required.");
  const items = readList();
  const field: CustomFieldDef = {
    id: generateId("field"),
    name,
    type: input.type,
    options: input.type === "select" ? input.options.filter((o) => o.label.trim()) : [],
    order: items.length,
    createdAt: new Date().toISOString(),
  };
  writeList([...items, field]);
  return field;
}

export async function updateCustomField(id: string, patch: Partial<Pick<CustomFieldDef, "name" | "options">>): Promise<CustomFieldDef> {
  await delay(NETWORK_DELAY_MS);
  const items = readList();
  const index = items.findIndex((f) => f.id === id);
  if (index === -1) throw new ApiError("Custom field not found.");
  const updated = { ...items[index], ...patch };
  const next = [...items];
  next[index] = updated;
  writeList(next);
  return updated;
}

export async function deleteCustomField(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  const items = readList();
  writeList(items.filter((f) => f.id !== id).map((f, index) => ({ ...f, order: index })));
}
