import { generateId } from "@/lib/id";
import type { Team } from "@/types/team";

const STORAGE_KEY = "evotasks.teams.v1";
const NETWORK_DELAY_MS = 250;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Stable id so seed tasks/projects (lib/seedTasks.ts) can reference this team directly.
export const SEED_TEAM_WEB = "team-web";

function createSeedTeams(): Team[] {
  const now = new Date().toISOString();
  return [
    { id: SEED_TEAM_WEB, name: "Web Development", color: "#6366f1", memberIds: ["u1", "u3", "u5"], createdAt: now },
    { id: "team-design", name: "Design", color: "#ec4899", memberIds: ["u2"], createdAt: now },
    { id: "team-ops", name: "Operations", color: "#22c55e", memberIds: ["u1", "u4"], createdAt: now },
  ];
}

function readAll(): Team[] {
  if (typeof window === "undefined") return createSeedTeams();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedTeams();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Team[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedTeams();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeAll(items: Team[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function fetchTeams(): Promise<Team[]> {
  await delay(NETWORK_DELAY_MS);
  return readAll();
}

export async function createTeam(input: { name: string; color: string; memberIds: string[] }): Promise<Team> {
  await delay(NETWORK_DELAY_MS);
  const name = input.name.trim();
  if (!name) throw new ApiError("Team name is required.");
  const team: Team = {
    id: generateId("team"),
    name,
    color: input.color,
    memberIds: input.memberIds,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), team]);
  return team;
}

export async function updateTeam(id: string, patch: Partial<Pick<Team, "name" | "color" | "memberIds">>): Promise<Team> {
  await delay(NETWORK_DELAY_MS);
  const items = readAll();
  const index = items.findIndex((t) => t.id === id);
  if (index === -1) throw new ApiError("Team not found.");
  const updated = { ...items[index], ...patch };
  const next = [...items];
  next[index] = updated;
  writeAll(next);
  return updated;
}

export async function deleteTeam(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  writeAll(readAll().filter((t) => t.id !== id));
}
