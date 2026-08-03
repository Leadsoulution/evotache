import type { AdProject, AdProjectStatus, AdPlatform } from "@/types/socialMedia";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchAdProjects(): Promise<AdProject[]> {
  const response = await fetch("/api/social/ad-projects");
  if (!response.ok) return [];
  return response.json();
}

export async function fetchAdProjectById(id: string): Promise<AdProject | null> {
  const projects = await fetchAdProjects();
  return projects.find((p) => p.id === id) ?? null;
}

interface CreateAdProjectInput {
  name: string;
  client: string;
  platform: AdPlatform;
  status: AdProjectStatus;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
  metaAdAccountId?: string | null;
}

export async function createAdProject(input: CreateAdProjectInput): Promise<AdProject> {
  const response = await fetch("/api/social/ad-projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateAdProject(id: string, patch: Partial<Omit<AdProject, "id" | "createdAt">>): Promise<AdProject> {
  const response = await fetch(`/api/social/ad-projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteAdProject(id: string): Promise<void> {
  const response = await fetch(`/api/social/ad-projects/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
