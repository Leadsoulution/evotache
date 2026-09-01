import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runWorkshopAutoStart } from "@/lib/workshopScheduling";

/** Hit by an external cron (Hostinger hPanel Cron Job, same shared secret
 * as /api/cron/reminders) — needs to run at least every few minutes so a
 * mechanic's next prestation actually starts on schedule instead of
 * sitting there until someone happens to open the app. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runWorkshopAutoStart();
  return NextResponse.json(result);
}
