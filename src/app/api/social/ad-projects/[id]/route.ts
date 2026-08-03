import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";
import type { Prisma } from "@/generated/prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateAdProjectBody {
  name?: string;
  client?: string;
  platform?: string;
  status?: string;
  archived?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  totalBudget?: number;
  metaAdAccountId?: string | null;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: UpdateAdProjectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.adProject.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const data: Prisma.AdProjectUpdateInput = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.client !== undefined && { client: body.client }),
    ...(body.platform !== undefined && { platform: body.platform }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.archived !== undefined && { archived: body.archived }),
    ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
    ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
    ...(body.totalBudget !== undefined && { totalBudget: body.totalBudget }),
    ...(body.metaAdAccountId !== undefined && { metaAdAccountId: body.metaAdAccountId }),
  };

  const project = await db.adProject.update({ where: { id }, data });
  return NextResponse.json(project);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  // Campaign cleanup is a separate call from the client
  // (deleteAdCampaignsByProject), matching the pre-existing two-step
  // delete flow in useAdProjects.ts's removeProject().
  await db.adProject.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
