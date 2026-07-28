import { createSeedPurchaseColumns, createSeedPurchaseItems } from "@/lib/seedPurchases";
import { generateId } from "@/lib/id";
import type { PurchaseColumnDef, PurchaseColumnType, PurchaseDropdownOption, PurchaseItem } from "@/types/purchase";

const COLUMNS_KEY = "evotasks.purchaseColumns.v1";
const ITEMS_KEY = "evotasks.purchaseItems.v1";
const NETWORK_DELAY_MS = 250;

/** Image/video values are stored as base64 data URLs directly in localStorage, so this stays conservative to avoid hitting the origin's storage quota across many rows. */
export const MAX_PURCHASE_FILE_BYTES = 2 * 1024 * 1024;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readColumns(): PurchaseColumnDef[] {
  if (typeof window === "undefined") return createSeedPurchaseColumns();
  const raw = window.localStorage.getItem(COLUMNS_KEY);
  if (!raw) {
    const seeded = createSeedPurchaseColumns();
    window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as PurchaseColumnDef[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return [...parsed].sort((a, b) => a.order - b.order);
  } catch {
    const seeded = createSeedPurchaseColumns();
    window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeColumns(columns: PurchaseColumnDef[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
}

function readItems(): PurchaseItem[] {
  if (typeof window === "undefined") return createSeedPurchaseItems();
  const raw = window.localStorage.getItem(ITEMS_KEY);
  if (!raw) {
    const seeded = createSeedPurchaseItems();
    window.localStorage.setItem(ITEMS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as PurchaseItem[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return [...parsed].sort((a, b) => a.order - b.order);
  } catch {
    const seeded = createSeedPurchaseItems();
    window.localStorage.setItem(ITEMS_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeItems(items: PurchaseItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

// --- Columns ---

export async function fetchPurchaseColumns(): Promise<PurchaseColumnDef[]> {
  await delay(NETWORK_DELAY_MS);
  return readColumns();
}

export async function createPurchaseColumn(input: { name: string; type: PurchaseColumnType; options: PurchaseDropdownOption[] }): Promise<PurchaseColumnDef> {
  await delay(NETWORK_DELAY_MS);
  const name = input.name.trim();
  if (!name) throw new ApiError("Column name is required.");
  const columns = readColumns();
  const column: PurchaseColumnDef = {
    id: generateId("purchasecol"),
    name,
    type: input.type,
    options: input.type === "dropdown" ? input.options.filter((o) => o.label.trim()) : [],
    order: columns.length,
    createdAt: new Date().toISOString(),
  };
  writeColumns([...columns, column]);
  return column;
}

export async function updatePurchaseColumn(id: string, patch: Partial<Pick<PurchaseColumnDef, "name" | "options">>): Promise<PurchaseColumnDef> {
  await delay(NETWORK_DELAY_MS);
  const columns = readColumns();
  const index = columns.findIndex((c) => c.id === id);
  if (index === -1) throw new ApiError("Column not found.");
  const updated = { ...columns[index], ...patch };
  const next = [...columns];
  next[index] = updated;
  writeColumns(next);
  return updated;
}

export async function deletePurchaseColumn(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  const columns = readColumns().filter((c) => c.id !== id).map((c, index) => ({ ...c, order: index }));
  writeColumns(columns);
  const items = readItems().map((item) => {
    if (!(id in item.values)) return item;
    const values = { ...item.values };
    delete values[id];
    return { ...item, values };
  });
  writeItems(items);
}

// --- Items (rows) ---

export interface PurchaseItemScope {
  userId: string;
  isAdmin: boolean;
}

export async function fetchPurchaseItems(scope: PurchaseItemScope): Promise<PurchaseItem[]> {
  await delay(NETWORK_DELAY_MS);
  const items = readItems();
  if (scope.isAdmin) return items;
  return items.filter((item) => !(item.excludedUserIds ?? []).includes(scope.userId));
}

export async function createPurchaseItem(): Promise<PurchaseItem> {
  await delay(NETWORK_DELAY_MS);
  const items = readItems();
  const now = new Date().toISOString();
  const item: PurchaseItem = {
    id: generateId("purchase"),
    order: items.length ? Math.max(...items.map((i) => i.order)) + 1 : 0,
    values: {},
    assigneeIds: [],
    excludedUserIds: [],
    createdAt: now,
    updatedAt: now,
  };
  writeItems([...items, item]);
  return item;
}

export async function updatePurchaseItem(id: string, values: Record<string, string>): Promise<PurchaseItem> {
  await delay(NETWORK_DELAY_MS);
  const items = readItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) throw new ApiError("Purchase item not found.");
  const updated: PurchaseItem = { ...items[index], values: { ...items[index].values, ...values }, updatedAt: new Date().toISOString() };
  const next = [...items];
  next[index] = updated;
  writeItems(next);
  return updated;
}

export async function updatePurchaseItemAssignees(id: string, assigneeIds: string[]): Promise<PurchaseItem> {
  await delay(NETWORK_DELAY_MS);
  const items = readItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) throw new ApiError("Purchase item not found.");
  const updated: PurchaseItem = { ...items[index], assigneeIds, updatedAt: new Date().toISOString() };
  const next = [...items];
  next[index] = updated;
  writeItems(next);
  return updated;
}

export async function updatePurchaseItemExcludedUsers(id: string, excludedUserIds: string[]): Promise<PurchaseItem> {
  await delay(NETWORK_DELAY_MS);
  const items = readItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) throw new ApiError("Purchase item not found.");
  const updated: PurchaseItem = { ...items[index], excludedUserIds, updatedAt: new Date().toISOString() };
  const next = [...items];
  next[index] = updated;
  writeItems(next);
  return updated;
}

export async function deletePurchaseItem(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeItems(readItems().filter((i) => i.id !== id));
}
