import type { User as DbUser } from "@/generated/prisma/client";
import type { AppUser } from "@/types/user";

/** Strips passwordHash and normalizes DB types (Date -> ISO string) before a user record ever reaches the client. */
export function toPublicUser(user: DbUser): AppUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    color: user.color,
    photoDataUrl: user.photoDataUrl,
    status: user.status,
    managerIds: user.managerIds,
    createdAt: user.createdAt.toISOString(),
    visibleSectionHrefs: (user.visibleSectionHrefs as string[] | null) ?? null,
    extraSectionHrefs: user.extraSectionHrefs,
    hiddenColumnIds: user.hiddenColumnIds,
    isAgent: user.isAgent,
  };
}
