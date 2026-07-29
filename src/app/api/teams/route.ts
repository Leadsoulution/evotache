import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getVisibilityScope } from "@/lib/visibility";
import { canManageWorkflow, canManageUsers } from "@/config/roleMeta";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = await getVisibilityScope(sessionUser);
  const all = await db.team.findMany({ orderBy: { createdAt: "asc" } });
  if (scope.isAdmin) return NextResponse.json(all);

  const visible = all.filter(
    (t) => t.memberIds.some((id) => scope.visibleUserIds.includes(id)) && !t.excludedUserIds.includes(scope.userId)
  );
  return NextResponse.json(visible);
}

interface CreateTeamBody {
  name: string;
  color: string;
  memberIds: string[];
  excludedUserIds?: string[];
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role) && !canManageUsers(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateTeamBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Department name is required." }, { status: 400 });

  const team = await db.team.create({
    data: { name, color: body.color, memberIds: body.memberIds ?? [], excludedUserIds: body.excludedUserIds ?? [] },
  });
  return NextResponse.json(team, { status: 201 });
}
