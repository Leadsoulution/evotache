import type { AppUser, Role, UserStatus } from "@/types/user";
import type { Assignee } from "@/types/task";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchUsers(): Promise<AppUser[]> {
  const response = await fetch("/api/users");
  if (!response.ok) return [];
  return response.json();
}

export async function fetchUserById(id: string): Promise<AppUser | null> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) return null;
  return response.json();
}

export async function fetchAssignees(): Promise<Assignee[]> {
  const users = await fetchUsers();
  return users.filter((u) => u.status === "active").map((u) => ({ id: u.id, name: u.name, color: u.color, photoDataUrl: u.photoDataUrl }));
}

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  color: string;
  photoDataUrl?: string | null;
  managerIds?: string[];
  teamIds?: string[];
  visibleSectionHrefs?: string[] | null;
  hiddenColumnIds?: string[];
}

export async function createUserRequest(input: CreateUserInput): Promise<AppUser> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
  color?: string;
  photoDataUrl?: string | null;
  managerIds?: string[];
  teamIds?: string[];
  visibleSectionHrefs?: string[] | null;
  hiddenColumnIds?: string[];
}

export async function updateUserRequest(id: string, patch: UpdateUserInput): Promise<AppUser> {
  const response = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteUserRequest(id: string): Promise<void> {
  const response = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
