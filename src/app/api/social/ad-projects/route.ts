import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await db.adProject.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(projects);
}

interface CreateAdProjectBody {
  name: string;
  client: string;
  platform: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalBudget: number;
  metaAdAccountId?: string | null;
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: CreateAdProjectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

  const project = await db.adProject.create({
    data: {
      name,
      client: (body.client ?? "").trim(),
      platform: body.platform,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      totalBudget: body.totalBudget,
      metaAdAccountId: body.metaAdAccountId ?? null,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
