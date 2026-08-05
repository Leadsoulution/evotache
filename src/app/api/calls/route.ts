import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import { toPublicPhoneCall } from "@/lib/publicPhoneCall";

// Most recent calls only — 3CX writes these continuously and nothing prunes
// the table, so an unbounded fetch would only grow slower over time. `stats`
// below is computed via real aggregate queries instead, so the KPI tiles
// stay accurate even once the table has grown past MAX_ROWS (otherwise
// "Total appels" would freeze at MAX_ROWS forever once the real count
// passed it).
const MAX_ROWS = 2000;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [calls, total, answered, missed, talkAgg] = await Promise.all([
    db.phoneCall.findMany({ orderBy: { startTime: "desc" }, take: MAX_ROWS }),
    db.phoneCall.count(),
    db.phoneCall.count({ where: { answered: true } }),
    db.phoneCall.count({ where: { status: "Unanswered" } }),
    db.phoneCall.aggregate({ _avg: { talkSeconds: true }, where: { answered: true } }),
  ]);

  return NextResponse.json({
    calls: calls.map(toPublicPhoneCall),
    stats: { total, answered, missed, avgTalk: Math.round(talkAgg._avg.talkSeconds ?? 0) },
  });
}
