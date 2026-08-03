import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runBackup } from "@/lib/sheetBackup";

/** Hit by an external cron (Hostinger hPanel Cron Job, `curl`), not a
 * logged-in browser — auth is a shared secret query token, not a session. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runBackup();
    return NextResponse.json(result);
  } catch (err) {
    // Not linked yet is expected before an admin sets it up — a clean 200
    // keeps the cron from logging it as a failure every run.
    const message = err instanceof Error ? err.message : "Backup failed.";
    return NextResponse.json({ skipped: true, message });
  }
}
