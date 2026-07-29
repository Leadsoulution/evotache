import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow, canManageUsers } from "@/config/roleMeta";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateTeamBody {
  name?: string;
  color?: string;
  memberIds?: string[];
  excludedUserIds?: string[];
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role) && !canManageUsers(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: UpdateTeamBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.team.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Department not found." }, { status: 404 });

  const team = await db.team.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.memberIds !== undefined && { memberIds: body.memberIds }),
      ...(body.excludedUserIds !== undefined && { excludedUserIds: body.excludedUserIds }),
    },
  });
  return NextResponse.json(team);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role) && !canManageUsers(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.team.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
