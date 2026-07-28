import { generateId } from "@/lib/id";
import type { VisibilityScope } from "@/lib/orgChart";
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
    { id: SEED_TEAM_WEB, name: "MARKETING DIGITAL", color: "#6366f1", memberIds: ["u2", "u4", "u7"], excludedUserIds: [], createdAt: now },
    { id: "team-design", name: "COMMERCIAL", color: "#ec4899", memberIds: ["u3", "u6"], excludedUserIds: [], createdAt: now },
    { id: "team-ops", name: "ADMINISTRATIF", color: "#22c55e", memberIds: ["u1", "u2", "u5"], excludedUserIds: [], createdAt: now },
    { id: "team-atelier", name: "ATELIER", color: "#f97316", memberIds: [], excludedUserIds: [], createdAt: now },
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

/** Visibility-scoped list for the UI: admins see all teams; everyone else sees only teams a visible user (self or subordinate) belongs to, minus any team that has explicitly excluded them. */
export async function fetchTeams(scope: VisibilityScope): Promise<Team[]> {
  await delay(NETWORK_DELAY_MS);
  const all = readAll();
  if (scope.isAdmin) return all;
  return all.filter(
    (t) => t.memberIds.some((id) => scope.visibleUserIds.includes(id)) && !(t.excludedUserIds ?? []).includes(scope.userId)
  );
}

/** Internal use only (e.g. syncing a user's team memberships across every team when their profile is edited) — bypasses visibility scope entirely, unlike the public fetchTeams above. */
export async function fetchAllTeamsUnscoped(): Promise<Team[]> {
  await delay(NETWORK_DELAY_MS);
  return readAll();
}

export async function createTeam(input: { name: string; color: string; memberIds: string[]; excludedUserIds?: string[] }): Promise<Team> {
  await delay(NETWORK_DELAY_MS);
  const name = input.name.trim();
  if (!name) throw new ApiError("Department name is required.");
  const team: Team = {
    id: generateId("team"),
    name,
    color: input.color,
    memberIds: input.memberIds,
    excludedUserIds: input.excludedUserIds ?? [],
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), team]);
  return team;
}

export async function updateTeam(id: string, patch: Partial<Pick<Team, "name" | "color" | "memberIds" | "excludedUserIds">>): Promise<Team> {
  await delay(NETWORK_DELAY_MS);
  const items = readAll();
  const index = items.findIndex((t) => t.id === id);
  if (index === -1) throw new ApiError("Department not found.");
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
