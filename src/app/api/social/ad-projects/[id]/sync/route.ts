import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";
import { syncProject } from "@/lib/metaAdsSync";
import { META_DATE_PRESET_OPTIONS, DEFAULT_META_DATE_PRESET } from "@/config/metaAds";
import type { MetaDatePreset, MetaDateRangeParam } from "@/config/metaAds";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_PRESETS = new Set(META_DATE_PRESET_OPTIONS.map((o) => o.value));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const project = await db.adProject.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!project.metaAdAccountId) return NextResponse.json({ error: "This project isn't linked to a Meta ad account." }, { status: 400 });

  let body: { datePreset?: string; since?: string; until?: string } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine, use the default
  }

  let dateRange: MetaDateRangeParam = DEFAULT_META_DATE_PRESET;
  if (body.since && body.until) {
    if (!DATE_RE.test(body.since) || !DATE_RE.test(body.until)) {
      return NextResponse.json({ error: "since/until must be YYYY-MM-DD." }, { status: 400 });
    }
    dateRange = { since: body.since, until: body.until };
  } else if (body.datePreset && VALID_PRESETS.has(body.datePreset as MetaDatePreset)) {
    dateRange = body.datePreset as MetaDatePreset;
  }

  try {
    const syncedCampaigns = await syncProject(project, dateRange);
    return NextResponse.json({ syncedCampaigns });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed." }, { status: 500 });
  }
}
