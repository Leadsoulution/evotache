import type { AppUser } from "@/types/user";

export class AuthError extends Error {}

export async function login(email: string, password: string): Promise<AppUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AuthError(body?.error ?? "Unable to sign in.");
  }
  return response.json();
}

export function logout(): void {
  // Fire-and-forget: the httpOnly session cookie is cleared server-side;
  // the caller (useAuth) clears its own in-memory state immediately.
  fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}

export async function restoreSession(): Promise<AppUser | null> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) return null;
  return response.json();
}
