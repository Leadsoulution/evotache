import { generateId } from "@/lib/id";
import type { Project } from "@/types/project";

const STORAGE_KEY = "evotasks.projects.v1";
const NETWORK_DELAY_MS = 250;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Stable id so seed tasks (lib/seedTasks.ts) can reference this project directly.
export const SEED_PROJECT_LPR = "proj-lpr-maroc";

function createSeedProjects(): Project[] {
  const now = new Date().toISOString();
  return [
    {
      id: SEED_PROJECT_LPR,
      name: "Site Web LPR Maroc",
      description: "Refonte du site vitrine et catalogue produits LPR Maroc.",
      color: "#6366f1",
      createdAt: now,
    },
    {
      id: "proj-internal-tools",
      name: "Internal Tools",
      description: "Internal dashboards and tooling for the ops team.",
      color: "#22c55e",
      createdAt: now,
    },
    {
      id: "proj-marketing-q3",
      name: "Marketing Q3 Campaign",
      description: "Q3 marketing launch across web and social.",
      color: "#f59e0b",
      createdAt: now,
    },
  ];
}

function readAll(): Project[] {
  if (typeof window === "undefined") return createSeedProjects();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedProjects();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Project[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedProjects();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeAll(items: Project[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function fetchProjects(): Promise<Project[]> {
  await delay(NETWORK_DELAY_MS);
  return readAll();
}

export async function createProject(input: { name: string; description: string; color: string }): Promise<Project> {
  await delay(NETWORK_DELAY_MS);
  const name = input.name.trim();
  if (!name) throw new ApiError("Project name is required.");
  const project: Project = {
    id: generateId("project"),
    name,
    description: input.description.trim(),
    color: input.color,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), project]);
  return project;
}

export async function updateProject(id: string, patch: Partial<Pick<Project, "name" | "description" | "color">>): Promise<Project> {
  await delay(NETWORK_DELAY_MS);
  const items = readAll();
  const index = items.findIndex((p) => p.id === id);
  if (index === -1) throw new ApiError("Project not found.");
  const updated = { ...items[index], ...patch };
  const next = [...items];
  next[index] = updated;
  writeAll(next);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeAll(readAll().filter((p) => p.id !== id));
}
