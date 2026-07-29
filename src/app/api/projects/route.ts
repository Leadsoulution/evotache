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
  const all = await db.project.findMany({ orderBy: { createdAt: "asc" } });
  if (scope.isAdmin) return NextResponse.json(all);

  const allTeams = await db.team.findMany();
  const visibleTeamIds = new Set(
    allTeams
      .filter((t) => t.memberIds.some((id) => scope.visibleUserIds.includes(id)) && !t.excludedUserIds.includes(scope.userId))
      .map((t) => t.id)
  );
  const visible = all.filter(
    (p) => (p.teamIds.length === 0 || p.teamIds.some((id) => visibleTeamIds.has(id))) && !p.excludedUserIds.includes(scope.userId)
  );
  return NextResponse.json(visible);
}

interface CreateProjectBody {
  name: string;
  description: string;
  color: string;
  logoDataUrl?: string | null;
  teamIds?: string[];
  excludedUserIds?: string[];
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role) && !canManageUsers(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateProjectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

  const project = await db.project.create({
    data: {
      name,
      description: (body.description ?? "").trim(),
      color: body.color,
      logoDataUrl: body.logoDataUrl ?? null,
      teamIds: body.teamIds ?? [],
      excludedUserIds: body.excludedUserIds ?? [],
    },
  });
  return NextResponse.json(project, { status: 201 });
}
