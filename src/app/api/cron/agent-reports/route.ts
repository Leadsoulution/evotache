import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runDueAgentReportSchedules } from "@/lib/agentReportSchedules";

/** Hit by an external cron (Hostinger hPanel Cron Job, same shared secret
 * as /api/cron/reminders) — recommended every 5-10 min, same as reminders. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDueAgentReportSchedules();
  return NextResponse.json(result);
}
