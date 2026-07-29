import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow, canManageUsers } from "@/config/roleMeta";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateProjectBody {
  name?: string;
  description?: string;
  color?: string;
  logoDataUrl?: string | null;
  teamIds?: string[];
  excludedUserIds?: string[];
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role) && !canManageUsers(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body: UpdateProjectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const project = await db.project.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.logoDataUrl !== undefined && { logoDataUrl: body.logoDataUrl }),
      ...(body.teamIds !== undefined && { teamIds: body.teamIds }),
      ...(body.excludedUserIds !== undefined && { excludedUserIds: body.excludedUserIds }),
    },
  });
  return NextResponse.json(project);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role) && !canManageUsers(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.project.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
