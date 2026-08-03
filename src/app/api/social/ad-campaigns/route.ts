import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  const campaigns = await db.adCampaign.findMany({
    where: projectId ? { projectId } : undefined,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(campaigns);
}

interface CreateAdCampaignBody {
  projectId: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  budget: number;
  amountSpent: number;
  results: number;
  revenue: number;
  reach: number;
  impressions: number;
  clicks: number;
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: CreateAdCampaignBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
  if (!body.projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });

  const campaign = await db.adCampaign.create({
    data: {
      projectId: body.projectId,
      name,
      platform: body.platform,
      objective: body.objective,
      status: body.status,
      budget: body.budget,
      amountSpent: body.amountSpent,
      results: body.results,
      revenue: body.revenue,
      reach: body.reach,
      impressions: body.impressions,
      clicks: body.clicks,
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}

/** Bulk delete, used by useAdProjects.ts's removeProject() to clean up a
 * deleted project's campaigns — matches the old deleteAdCampaignsByProject(). */
export async function DELETE(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });

  await db.adCampaign.deleteMany({ where: { projectId } });
  return NextResponse.json({ ok: true });
}
