import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncCalls } from "@/lib/threeCxSync";

/** Hit by an external cron (Hostinger hPanel Cron Job, same shared secret
 * as /api/cron/reminders), so calls stay fresh without needing the
 * "Synchroniser" button pressed manually. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncCalls();
  return NextResponse.json(result);
}
