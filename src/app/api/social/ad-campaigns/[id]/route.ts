import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";
import type { Prisma } from "@/generated/prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateAdCampaignBody {
  name?: string;
  platform?: string;
  objective?: string;
  status?: string;
  budget?: number;
  amountSpent?: number;
  results?: number;
  revenue?: number;
  reach?: number;
  impressions?: number;
  clicks?: number;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: UpdateAdCampaignBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.adCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const data: Prisma.AdCampaignUpdateInput = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.platform !== undefined && { platform: body.platform }),
    ...(body.objective !== undefined && { objective: body.objective }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.budget !== undefined && { budget: body.budget }),
    ...(body.amountSpent !== undefined && { amountSpent: body.amountSpent }),
    ...(body.results !== undefined && { results: body.results }),
    ...(body.revenue !== undefined && { revenue: body.revenue }),
    ...(body.reach !== undefined && { reach: body.reach }),
    ...(body.impressions !== undefined && { impressions: body.impressions }),
    ...(body.clicks !== undefined && { clicks: body.clicks }),
  };

  const campaign = await db.adCampaign.update({ where: { id }, data });
  return NextResponse.json(campaign);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.adCampaign.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
