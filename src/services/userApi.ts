import { generateId } from "@/lib/id";
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
  const rows: Omit<StoredUser, "createdAt">[] = [
    { id: "u1", name: "Amine Bahazzaz", email: "amine@evotasks.com", password: "admin123", role: "admin", color: "#6366f1", status: "active" },
    { id: "u2", name: "Sarah Chen", email: "sarah@evotasks.com", password: "member123", role: "member", color: "#ec4899", status: "active" },
    { id: "u3", name: "Marcus Lee", email: "marcus@evotasks.com", password: "member123", role: "member", color: "#22c55e", status: "active" },
    { id: "u4", name: "Priya Patel", email: "priya@evotasks.com", password: "limited123", role: "member_limited", color: "#f59e0b", status: "active" },
    { id: "u5", name: "Diego Alvarez", email: "diego@evotasks.com", password: "viewer123", role: "viewer", color: "#06b6d4", status: "active" },
  ];
  return rows.map((row) => ({ ...row, createdAt: now }));
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
    status: user.status,
    createdAt: user.createdAt,
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
    .map((u) => ({ id: u.id, name: u.name, color: u.color }));
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
    status: "active",
    createdAt: new Date().toISOString(),
  };
  writeStore([...users, user]);
  return toPublicUser(user);
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
  password?: string;
}

export async function updateUserRequest(id: string, patch: UpdateUserInput): Promise<AppUser> {
  await delay(NETWORK_DELAY_MS);
  maybeFail("update user");
  const users = readStore();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw new ApiError("User not found.");
  const updated: StoredUser = { ...users[index], ...patch };
  const next = [...users];
  next[index] = updated;
  writeStore(next);
  return toPublicUser(updated);
}

export async function deleteUserRequest(id: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  maybeFail("delete user");
  const users = readStore();
  writeStore(users.filter((u) => u.id !== id));
}
