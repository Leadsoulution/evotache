import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";
import { syncProject } from "@/lib/metaAdsSync";
import { META_DATE_PRESET_OPTIONS, DEFAULT_META_DATE_PRESET } from "@/config/metaAds";
import type { MetaDatePreset } from "@/config/metaAds";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_PRESETS = new Set(META_DATE_PRESET_OPTIONS.map((o) => o.value));

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const project = await db.adProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!project.metaAdAccountId) return NextResponse.json({ error: "This project isn't linked to a Meta ad account." }, { status: 400 });

  let body: { datePreset?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine, use the default
  }
  const datePreset: MetaDatePreset = body.datePreset && VALID_PRESETS.has(body.datePreset as MetaDatePreset) ? (body.datePreset as MetaDatePreset) : DEFAULT_META_DATE_PRESET;

  try {
    const syncedCampaigns = await syncProject(project, datePreset);
    return NextResponse.json({ syncedCampaigns });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed." }, { status: 500 });
  }
}
