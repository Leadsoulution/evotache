import { db } from "@/lib/db";
import { getVisibleUserIds } from "@/lib/orgChart";
import { canManageUsers } from "@/config/roleMeta";
import { toPublicUser } from "@/lib/publicUser";
import type { User as DbUser } from "@/generated/prisma/client";

export interface VisibilityScope {
  userId: string;
  isAdmin: boolean;
  visibleUserIds: string[];
}

/** Server-derived equivalent of the client-side VisibilityScope the app used
 * to build from localStorage — computed from the authenticated session user,
 * never trusted from client input. */
export async function getVisibilityScope(sessionUser: DbUser): Promise<VisibilityScope> {
  const allUsers = (await db.user.findMany()).map(toPublicUser);
  return {
    userId: sessionUser.id,
    isAdmin: canManageUsers(sessionUser.role),
    visibleUserIds: getVisibleUserIds(allUsers, sessionUser.id),
  };
}
