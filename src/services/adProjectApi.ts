import { generateId } from "@/lib/id";
import type { AdProject, AdProjectStatus, AdPlatform } from "@/types/socialMedia";

const STORAGE_KEY = "evotasks.adProjects.v1";
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

function createSeedProjects(): AdProject[] {
  const now = new Date().toISOString();
  const rows: Omit<AdProject, "createdAt">[] = [
    {
      id: "adproj-lpr",
      name: "LPR Maroc — Lancement Quads",
      client: "LPR Maroc",
      platform: "facebook",
      status: "active",
      archived: false,
      startDate: daysFromToday(-20),
      endDate: daysFromToday(40),
      totalBudget: 15000,
    },
    {
      id: "adproj-atlas",
      name: "Atlas Distribution — Génération de leads",
      client: "Atlas Distribution",
      platform: "google",
      status: "active",
      archived: false,
      startDate: daysFromToday(-10),
      endDate: daysFromToday(20),
      totalBudget: 8000,
    },
    {
      id: "adproj-brand",
      name: "Notoriété de marque Q2",
      client: "EvoTasks Interne",
      platform: "instagram",
      status: "paused",
      archived: false,
      startDate: daysFromToday(-60),
      endDate: daysFromToday(-5),
      totalBudget: 5000,
    },
  ];
  return rows.map((row) => ({ ...row, createdAt: now }));
}

function readStore(): AdProject[] {
  if (typeof window === "undefined") return createSeedProjects();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedProjects();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as AdProject[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedProjects();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(projects: AdProject[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export async function fetchAdProjects(): Promise<AdProject[]> {
  await delay(NETWORK_DELAY_MS);
  return readStore();
}

export async function fetchAdProjectById(id: string): Promise<AdProject | null> {
  await delay(150);
  return readStore().find((p) => p.id === id) ?? null;
}

interface CreateAdProjectInput {
  name: string;
  client: string;
  platform: AdPlatform;
  status: AdProjectStatus;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
}

export async function createAdProject(input: CreateAdProjectInput): Promise<AdProject> {
  await delay(NETWORK_DELAY_MS);
  if (!input.name.trim()) throw new ApiError("Project name is required.");
  const project: AdProject = {
    id: generateId("adproj"),
    name: input.name.trim(),
    client: input.client.trim(),
    platform: input.platform,
    status: input.status,
    archived: false,
    startDate: input.startDate,
    endDate: input.endDate,
    totalBudget: input.totalBudget,
    createdAt: new Date().toISOString(),
  };
  writeStore([...readStore(), project]);
  return project;
}

export async function updateAdProject(id: string, patch: Partial<Omit<AdProject, "id" | "createdAt">>): Promise<AdProject> {
  await delay(NETWORK_DELAY_MS);
  const projects = readStore();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) throw new ApiError("Project not found.");
  const updated = { ...projects[index], ...patch };
  const next = [...projects];
  next[index] = updated;
  writeStore(next);
  return updated;
}

export async function deleteAdProject(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeStore(readStore().filter((p) => p.id !== id));
}
