import { fetchUserById, verifyCredentials } from "@/services/userApi";
import type { AppUser } from "@/types/user";

const SESSION_KEY = "evotasks.session.v1";

export class AuthError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(email: string, password: string): Promise<AppUser> {
  await delay(300);
  const user = await verifyCredentials(email, password);
  if (!user) throw new AuthError("Invalid email or password.");
  if (user.status === "disabled") throw new AuthError("This account has been disabled. Contact an admin.");
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, user.id);
  }
  return user;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export async function restoreSession(): Promise<AppUser | null> {
  if (typeof window === "undefined") return null;
  const userId = window.localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  const user = await fetchUserById(userId);
  if (!user || user.status === "disabled") {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return user;
}
