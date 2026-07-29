import type { VisibilityScope } from "@/lib/orgChart";
import type { Team } from "@/types/team";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

// Stable id so seed tasks/projects (prisma/seed.ts) can reference this team directly.
export const SEED_TEAM_WEB = "team-web";

/** Visibility-scoped list for the UI: admins see all teams; everyone else sees only teams a visible user (self or subordinate) belongs to, minus any team that has explicitly excluded them. The `scope` argument is accepted for call-site compatibility but the server independently re-derives the real scope from the authenticated session. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility, see doc comment above
export async function fetchTeams(_scope: VisibilityScope): Promise<Team[]> {
  const response = await fetch("/api/teams");
  if (!response.ok) return [];
  return response.json();
}

/** Internal use only (e.g. syncing a user's team memberships across every team when their profile is edited) — bypasses visibility scope entirely, unlike the public fetchTeams above. Now handled server-side in the users API routes, but kept here in case any caller still needs the full list; admins always pass the isAdmin scope check. */
export async function fetchAllTeamsUnscoped(): Promise<Team[]> {
  const response = await fetch("/api/teams");
  if (!response.ok) return [];
  return response.json();
}

export async function createTeam(input: { name: string; color: string; memberIds: string[]; excludedUserIds?: string[] }): Promise<Team> {
  const response = await fetch("/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateTeam(id: string, patch: Partial<Pick<Team, "name" | "color" | "memberIds" | "excludedUserIds">>): Promise<Team> {
  const response = await fetch(`/api/teams/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteTeam(id: string): Promise<void> {
  const response = await fetch(`/api/teams/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
