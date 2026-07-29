import type { VisibilityScope } from "@/lib/orgChart";
import type { Project } from "@/types/project";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

// Stable id so seed tasks (prisma/seed.ts) can reference this project directly.
export const SEED_PROJECT_LPR = "proj-lpr-maroc";

/** Visibility-scoped list for the UI. The `scope` argument is accepted for call-site compatibility but the server independently re-derives the real scope from the authenticated session. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility, see doc comment above
export async function fetchProjects(_scope: VisibilityScope): Promise<Project[]> {
  const response = await fetch("/api/projects");
  if (!response.ok) return [];
  return response.json();
}

export async function createProject(input: {
  name: string;
  description: string;
  color: string;
  logoDataUrl?: string | null;
  teamIds?: string[];
  excludedUserIds?: string[];
}): Promise<Project> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, "name" | "description" | "color" | "logoDataUrl" | "teamIds" | "excludedUserIds">>
): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
