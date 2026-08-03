import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncMetaAdProjects } from "@/lib/metaAdsSync";

/** Hit by an external cron (same shared secret as /api/cron/reminders),
 * on a much longer interval — ad stats don't need minute-level freshness. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncMetaAdProjects();
  return NextResponse.json(result);
}
