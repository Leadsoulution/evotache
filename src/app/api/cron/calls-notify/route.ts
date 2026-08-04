import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";

// 3CX writes call rows directly to Postgres — no app code runs at insert
// time, so there's nothing to hook synchronously. This polls for recently
// missed calls instead, on a window wider than the recommended 5-minute
// cron interval so a single delayed/skipped tick doesn't drop a call
// (occasionally re-notifying about the same missed call on overlap is a
// minor annoyance, not a correctness problem).
const LOOKBACK_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - LOOKBACK_MS);
  const missedCalls = await db.phoneCall.findMany({ where: { callType: "Missed", createdAt: { gte: since } } });
  if (missedCalls.length === 0) return NextResponse.json({ notified: 0 });

  const users = await db.user.findMany({ where: { status: "active" } });
  const recipients = users.filter((u) => canManageUsers(u.role) || canManageWorkflow(u.role));

  for (const call of missedCalls) {
    for (const recipient of recipients) {
      void notifyUser(recipient.id, {
        title: "Appel manqué",
        body: `Appel manqué de ${call.contactNumber} (poste ${call.agentExtension})`,
        url: "/calls",
      });
    }
  }

  return NextResponse.json({ notified: missedCalls.length * recipients.length });
}
