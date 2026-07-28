import { generateId } from "@/lib/id";
import { fetchAllTeamsUnscoped, updateTeam } from "@/services/teamApi";
import type { AppUser, Role, UserStatus } from "@/types/user";
import type { Assignee } from "@/types/task";

const STORAGE_KEY = "evotasks.users.v1";
const NETWORK_DELAY_MS = 300;
const SIMULATED_FAILURE_RATE = 0.06;

export class ApiError extends Error {}

interface StoredUser extends AppUser {
  password: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeFail(action: string): void {
  if (Math.random() < SIMULATED_FAILURE_RATE) {
    throw new ApiError(`Failed to ${action}. The server could not be reached, please try again.`);
  }
}

function createSeedUsers(): StoredUser[] {
  const now = new Date().toISOString();
  const rows: Omit<StoredUser, "createdAt" | "visibleSectionHrefs" | "hiddenColumnIds">[] = [
    { id: "u1", name: "Elmahdi Bouzida", email: "elmahdi@evotasks.com", password: "admin123", role: "admin", color: "#a855f7", photoDataUrl: null, status: "active", managerIds: [] },
    { id: "u2", name: "Amine Bahazzaz", email: "amine@evotasks.com", password: "admin123", role: "admin", color: "#6366f1", photoDataUrl: null, status: "active", managerIds: [] },
    { id: "u3", name: "Mouad", email: "mouad@evotasks.com", password: "member123", role: "member", color: "#ec4899", photoDataUrl: null, status: "active", managerIds: ["u2"] },
    { id: "u4", name: "Yassine", email: "yassine@evotasks.com", password: "member123", role: "member", color: "#22c55e", photoDataUrl: null, status: "active", managerIds: ["u1"] },
    { id: "u5", name: "Rabie", email: "rabie@evotasks.com", password: "limited123", role: "member_limited", color: "#f59e0b", photoDataUrl: null, status: "active", managerIds: ["u3", "u4"] },
    { id: "u6", name: "Moha", email: "moha@evotasks.com", password: "limited123", role: "member_limited", color: "#ef4444", photoDataUrl: null, status: "active", managerIds: ["u3", "u4"] },
    { id: "u7", name: "Reda", email: "reda@evotasks.com", password: "viewer123", role: "viewer", color: "#06b6d4", photoDataUrl: null, status: "active", managerIds: ["u4"] },
  ];
  return rows.map((row) => ({ ...row, createdAt: now, visibleSectionHrefs: null, hiddenColumnIds: [] }));
}

function readStore(): StoredUser[] {
  if (typeof window === "undefined") return createSeedUsers();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedUsers();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedUsers();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(users: StoredUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function toPublicUser(user: StoredUser): AppUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    color: user.color,
    photoDataUrl: user.photoDataUrl,
    status: user.status,
    managerIds: user.managerIds,
    createdAt: user.createdAt,
    visibleSectionHrefs: user.visibleSectionHrefs,
    hiddenColumnIds: user.hiddenColumnIds,
  };
}

export async function fetchUsers(): Promise<AppUser[]> {
  await delay(NETWORK_DELAY_MS);
  return readStore().map(toPublicUser);
}

export async function fetchUserById(id: string): Promise<AppUser | null> {
  await delay(120);
  const user = readStore().find((u) => u.id === id);
  return user ? toPublicUser(user) : null;
}

export async function fetchAssignees(): Promise<Assignee[]> {
  await delay(120);
  return readStore()
    .filter((u) => u.status === "active")
    .map((u) => ({ id: u.id, name: u.name, color: u.color, photoDataUrl: u.photoDataUrl }));
}

export async function verifyCredentials(email: string, password: string): Promise<AppUser | null> {
  await delay(250);
  const normalizedEmail = email.trim().toLowerCase();
  const user = readStore().find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || user.password !== password) return null;
  return toPublicUser(user);
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

async function syncTeamMembership(userId: string, teamIds: string[]): Promise<void> {
  const allTeams = await fetchAllTeamsUnscoped();
  await Promise.all(
    allTeams.map((team) => {
      const shouldBeMember = teamIds.includes(team.id);
      const isMember = team.memberIds.includes(userId);
      if (shouldBeMember === isMember) return Promise.resolve();
      const memberIds = shouldBeMember ? [...team.memberIds, userId] : team.memberIds.filter((id) => id !== userId);
      return updateTeam(team.id, { memberIds });
    })
  );
}

export async function createUserRequest(input: CreateUserInput): Promise<AppUser> {
  await delay(NETWORK_DELAY_MS);
  maybeFail("create user");
  const users = readStore();
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail || !input.name.trim()) throw new ApiError("Name and email are required.");
  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new ApiError("A user with this email already exists.");
  }
  const user: StoredUser = {
    id: generateId("user"),
    name: input.name.trim(),
    email: normalizedEmail,
    password: input.password,
    role: input.role,
    color: input.color,
    photoDataUrl: input.photoDataUrl ?? null,
    status: "active",
    managerIds: input.managerIds ?? [],
    createdAt: new Date().toISOString(),
    visibleSectionHrefs: input.visibleSectionHrefs ?? null,
    hiddenColumnIds: input.hiddenColumnIds ?? [],
  };
  writeStore([...users, user]);
  if (input.teamIds?.length) await syncTeamMembership(user.id, input.teamIds);
  return toPublicUser(user);
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
  await delay(NETWORK_DELAY_MS);
  maybeFail("update user");
  const users = readStore();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw new ApiError("User not found.");
  const { teamIds, ...userPatch } = patch;
  const updated: StoredUser = { ...users[index], ...userPatch };
  const next = [...users];
  next[index] = updated;
  writeStore(next);
  if (teamIds) await syncTeamMembership(id, teamIds);
  return toPublicUser(updated);
}

export async function deleteUserRequest(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  maybeFail("delete user");
  const users = readStore();
  writeStore(users.filter((u) => u.id !== id));
}
