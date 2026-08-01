import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runDueReminders } from "@/lib/reminders";

/** Hit by an external cron (Hostinger hPanel Cron Job, `curl`), not a
 * logged-in browser — auth is a shared secret query token, not a session. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDueReminders();
  return NextResponse.json(result);
}
