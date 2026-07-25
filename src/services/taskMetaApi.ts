import { generateId } from "@/lib/id";
import type { PriorityDef, StatusDef } from "@/types/taskMeta";

const STATUS_KEY = "evotasks.statuses.v1";
const PRIORITY_KEY = "evotasks.priorities.v1";
const NETWORK_DELAY_MS = 250;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSeedStatuses(): StatusDef[] {
  return [
    { id: "todo", label: "To Do", color: "#94a3b8", order: 0 },
    { id: "in_progress", label: "In Progress", color: "#3b82f6", order: 1 },
    { id: "in_review", label: "In Review", color: "#f59e0b", order: 2 },
    { id: "done", label: "Done", color: "#10b981", order: 3 },
  ];
}

function createSeedPriorities(): PriorityDef[] {
  return [
    { id: "urgent", label: "Urgent", color: "#ef4444", order: 0 },
    { id: "high", label: "High", color: "#f97316", order: 1 },
    { id: "normal", label: "Normal", color: "#3b82f6", order: 2 },
    { id: "low", label: "Low", color: "#94a3b8", order: 3 },
    { id: "none", label: "No priority", color: "#cbd5e1", order: 4 },
  ];
}

function readList<T extends { order: number }>(key: string, seedFn: () => T[]): T[] {
  if (typeof window === "undefined") return seedFn().sort((a, b) => a.order - b.order);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    const seeded = seedFn();
    window.localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as T[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return [...parsed].sort((a, b) => a.order - b.order);
  } catch {
    const seeded = seedFn();
    window.localStorage.setItem(key, JSON.stringify(seeded));
    return seeded;
  }
}

function writeList<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

function normalizeOrder<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

// --- Statuses ---

export async function fetchStatuses(): Promise<StatusDef[]> {
  await delay(NETWORK_DELAY_MS);
  return readList(STATUS_KEY, createSeedStatuses);
}

export async function createStatus(input: { label: string; color: string }): Promise<StatusDef> {
  await delay(NETWORK_DELAY_MS);
  const items = readList(STATUS_KEY, createSeedStatuses);
  const status: StatusDef = { id: generateId("status"), label: input.label.trim(), color: input.color, order: items.length };
  if (!status.label) throw new ApiError("Status name is required.");
  writeList(STATUS_KEY, [...items, status]);
  return status;
}

export async function updateStatus(id: string, patch: Partial<Pick<StatusDef, "label" | "color">>): Promise<StatusDef> {
  await delay(NETWORK_DELAY_MS);
  const items = readList(STATUS_KEY, createSeedStatuses);
  const index = items.findIndex((s) => s.id === id);
  if (index === -1) throw new ApiError("Status not found.");
  const updated = { ...items[index], ...patch };
  const next = [...items];
  next[index] = updated;
  writeList(STATUS_KEY, next);
  return updated;
}

export async function deleteStatus(id: string, isInUse: (id: string) => boolean): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  const items = readList(STATUS_KEY, createSeedStatuses);
  if (items.length <= 1) throw new ApiError("At least one status is required.");
  if (isInUse(id)) throw new ApiError("This status is used by existing tasks. Move those tasks first.");
  writeList(STATUS_KEY, normalizeOrder(items.filter((s) => s.id !== id)));
}

export async function reorderStatuses(orderedIds: string[]): Promise<StatusDef[]> {
  await delay(150);
  const items = readList(STATUS_KEY, createSeedStatuses);
  const byId = new Map(items.map((s) => [s.id, s]));
  const reordered = normalizeOrder(orderedIds.map((id) => byId.get(id)).filter((s): s is StatusDef => Boolean(s)));
  writeList(STATUS_KEY, reordered);
  return reordered;
}

// --- Priorities ---

export async function fetchPriorities(): Promise<PriorityDef[]> {
  await delay(NETWORK_DELAY_MS);
  return readList(PRIORITY_KEY, createSeedPriorities);
}

export async function createPriority(input: { label: string; color: string }): Promise<PriorityDef> {
  await delay(NETWORK_DELAY_MS);
  const items = readList(PRIORITY_KEY, createSeedPriorities);
  const priority: PriorityDef = { id: generateId("priority"), label: input.label.trim(), color: input.color, order: items.length };
  if (!priority.label) throw new ApiError("Priority name is required.");
  writeList(PRIORITY_KEY, [...items, priority]);
  return priority;
}

export async function updatePriority(id: string, patch: Partial<Pick<PriorityDef, "label" | "color">>): Promise<PriorityDef> {
  await delay(NETWORK_DELAY_MS);
  const items = readList(PRIORITY_KEY, createSeedPriorities);
  const index = items.findIndex((p) => p.id === id);
  if (index === -1) throw new ApiError("Priority not found.");
  const updated = { ...items[index], ...patch };
  const next = [...items];
  next[index] = updated;
  writeList(PRIORITY_KEY, next);
  return updated;
}

export async function deletePriority(id: string, isInUse: (id: string) => boolean): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  const items = readList(PRIORITY_KEY, createSeedPriorities);
  if (items.length <= 1) throw new ApiError("At least one priority is required.");
  if (isInUse(id)) throw new ApiError("This priority is used by existing tasks. Reassign those tasks first.");
  writeList(PRIORITY_KEY, normalizeOrder(items.filter((p) => p.id !== id)));
}

export async function reorderPriorities(orderedIds: string[]): Promise<PriorityDef[]> {
  await delay(150);
  const items = readList(PRIORITY_KEY, createSeedPriorities);
  const byId = new Map(items.map((p) => [p.id, p]));
  const reordered = normalizeOrder(orderedIds.map((id) => byId.get(id)).filter((p): p is PriorityDef => Boolean(p)));
  writeList(PRIORITY_KEY, reordered);
  return reordered;
}

export async function fetchDefaultStatusId(): Promise<string> {
  const items = readList(STATUS_KEY, createSeedStatuses);
  return items[0]?.id ?? "todo";
}

export async function fetchDefaultPriorityId(): Promise<string> {
  const items = readList(PRIORITY_KEY, createSeedPriorities);
  return items[items.length - 1]?.id ?? "none";
}
