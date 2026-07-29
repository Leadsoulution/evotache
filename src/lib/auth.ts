import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import type { User as DbUser } from "@/generated/prisma/client";

/** Reads and verifies the session cookie, returning the full DB user record (including passwordHash) or null. Route handlers that return data to the client must call toPublicUser() on the result. */
export async function getSessionUser(): Promise<DbUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = await verifySession(token);
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.status === "disabled") return null;
  return user;
}
