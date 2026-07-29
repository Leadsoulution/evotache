import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/publicUser";
import { syncTeamMembership } from "@/lib/teamSync";
import { canManageUsers } from "@/config/roleMeta";
import { Prisma } from "@/generated/prisma/client";
import type { Role, UserStatus } from "@/types/user";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(toPublicUser(user));
}

interface UpdateUserBody {
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

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: UpdateUserBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const { teamIds, password, ...rest } = body;
  const user = await db.user.update({
    where: { id },
    data: {
      ...(rest.name !== undefined && { name: rest.name }),
      ...(rest.email !== undefined && { email: rest.email.trim().toLowerCase() }),
      ...(rest.role !== undefined && { role: rest.role }),
      ...(rest.status !== undefined && { status: rest.status }),
      ...(rest.color !== undefined && { color: rest.color }),
      ...(rest.photoDataUrl !== undefined && { photoDataUrl: rest.photoDataUrl }),
      ...(rest.managerIds !== undefined && { managerIds: rest.managerIds }),
      ...(rest.visibleSectionHrefs !== undefined && { visibleSectionHrefs: rest.visibleSectionHrefs ?? Prisma.JsonNull }),
      ...(rest.hiddenColumnIds !== undefined && { hiddenColumnIds: rest.hiddenColumnIds }),
      ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
    },
  });

  if (teamIds) await syncTeamMembership(id, teamIds);

  return NextResponse.json(toPublicUser(user));
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.user.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
