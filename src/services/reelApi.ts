import { generateId } from "@/lib/id";
import type { ApprovalStatus, ContentPriority, Reel, ReelEditingStatus } from "@/types/socialMedia";

const STORAGE_KEY = "evotasks.reels.v1";
const NETWORK_DELAY_MS = 300;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

function createSeedReels(): Reel[] {
  const now = new Date().toISOString();
  const rows: Omit<Reel, "createdAt">[] = [
    {
      id: "reel-1",
      title: "Hawk 200R — Essai en conditions réelles",
      client: "LPR Maroc",
      assigneeId: "u4",
      script: "Ouverture sur le désert, plan large du Hawk 200R, cut rapide sur les caractéristiques techniques, CTA fin de vidéo.",
      shootingDate: daysFromToday(-3),
      editingStatus: "in_progress",
      approvalStatus: "pending",
      publishingDate: daysFromToday(4),
      priority: "high",
      notes: "Prévoir drone pour les plans larges.",
      link: null,
      order: 0,
    },
    {
      id: "reel-2",
      title: "Unboxing XTANK 200R",
      client: "LPR Maroc",
      assigneeId: "u3",
      script: "",
      shootingDate: daysFromToday(6),
      editingStatus: "not_started",
      approvalStatus: "pending",
      publishingDate: null,
      priority: "normal",
      notes: "",
      link: null,
      order: 1,
    },
    {
      id: "reel-3",
      title: "Behind the scenes atelier",
      client: "EvoTasks Interne",
      assigneeId: "u7",
      script: "Interviews courtes de l'équipe technique.",
      shootingDate: daysFromToday(-10),
      editingStatus: "done",
      approvalStatus: "approved",
      publishingDate: daysFromToday(-1),
      priority: "normal",
      notes: "",
      link: "https://instagram.com/reel/example-behind-the-scenes",
      order: 0,
    },
  ];
  return rows.map((row) => ({ ...row, createdAt: now }));
}

function readStore(): Reel[] {
  if (typeof window === "undefined") return createSeedReels();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedReels();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Reel[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedReels();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(reels: Reel[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reels));
}

export async function fetchReels(): Promise<Reel[]> {
  await delay(NETWORK_DELAY_MS);
  return readStore();
}

interface CreateReelInput {
  title: string;
  client: string;
  assigneeId: string | null;
  script: string;
  shootingDate: string | null;
  editingStatus: ReelEditingStatus;
  approvalStatus: ApprovalStatus;
  publishingDate: string | null;
  priority: ContentPriority;
  notes: string;
  link: string | null;
}

export async function createReel(input: CreateReelInput): Promise<Reel> {
  await delay(NETWORK_DELAY_MS);
  if (!input.title.trim()) throw new ApiError("Title is required.");
  const reels = readStore();
  const maxOrder = reels.filter((r) => r.editingStatus === input.editingStatus).reduce((max, r) => Math.max(max, r.order), -1);
  const reel: Reel = { ...input, id: generateId("reel"), title: input.title.trim(), order: maxOrder + 1, createdAt: new Date().toISOString() };
  writeStore([...reels, reel]);
  return reel;
}

export async function updateReel(id: string, patch: Partial<Omit<Reel, "id" | "createdAt">>): Promise<Reel> {
  await delay(NETWORK_DELAY_MS);
  const reels = readStore();
  const index = reels.findIndex((r) => r.id === id);
  if (index === -1) throw new ApiError("Reel not found.");
  const updated = { ...reels[index], ...patch };
  const next = [...reels];
  next[index] = updated;
  writeStore(next);
  return updated;
}

export async function deleteReel(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeStore(readStore().filter((r) => r.id !== id));
}
