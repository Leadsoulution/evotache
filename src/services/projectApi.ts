import { generateId } from "@/lib/id";
import { fetchTeams } from "@/services/teamApi";
import type { VisibilityScope } from "@/lib/orgChart";
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
      id: "proj-evobike",
      name: "EVOBIKE",
      description: "Boutique et opérations EVOBIKE.",
      color: "#ef4444",
      logoDataUrl: null,
      teamIds: [],
      excludedUserIds: [],
      createdAt: now,
    },
    {
      id: SEED_PROJECT_LPR,
      name: "LPR MAROC",
      description: "Refonte du site vitrine et catalogue produits LPR Maroc.",
      color: "#6366f1",
      logoDataUrl: null,
      teamIds: ["team-web"],
      excludedUserIds: [],
      createdAt: now,
    },
    {
      id: "proj-internal-tools",
      name: "EVOTRACEUR",
      description: "Outils et tableaux de bord internes EVOTRACEUR.",
      color: "#22c55e",
      logoDataUrl: null,
      teamIds: ["team-ops"],
      excludedUserIds: [],
      createdAt: now,
    },
    {
      id: "proj-marketing-q3",
      name: "BAYSONE",
      description: "Projet BAYSONE.",
      color: "#f59e0b",
      logoDataUrl: null,
      teamIds: [],
      excludedUserIds: [],
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

/**
 * Visibility-scoped list for the UI: admins see all projects; everyone else
 * sees a project if it's unscoped (no team) or owned by a team they can see
 * (their own or a subordinate's), minus any project that excluded them.
 */
export async function fetchProjects(scope: VisibilityScope): Promise<Project[]> {
  await delay(NETWORK_DELAY_MS);
  const all = readAll();
  if (scope.isAdmin) return all;
  const visibleTeamIds = new Set((await fetchTeams(scope)).map((t) => t.id));
  return all.filter(
    (p) => (p.teamIds.length === 0 || p.teamIds.some((id) => visibleTeamIds.has(id))) && !(p.excludedUserIds ?? []).includes(scope.userId)
  );
}

export async function createProject(input: {
  name: string;
  description: string;
  color: string;
  logoDataUrl?: string | null;
  teamIds?: string[];
  excludedUserIds?: string[];
}): Promise<Project> {
  await delay(NETWORK_DELAY_MS);
  const name = input.name.trim();
  if (!name) throw new ApiError("Project name is required.");
  const project: Project = {
    id: generateId("project"),
    name,
    description: input.description.trim(),
    color: input.color,
    logoDataUrl: input.logoDataUrl ?? null,
    teamIds: input.teamIds ?? [],
    excludedUserIds: input.excludedUserIds ?? [],
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), project]);
  return project;
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "description" | "color" | "logoDataUrl" | "teamIds" | "excludedUserIds">>
): Promise<Project> {
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
