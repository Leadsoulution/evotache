import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessBiometrics } from "@/config/roleMeta";
import { toPublicBiometricEvent } from "@/lib/publicBiometricEvent";
import { STATUS_CHECK_IN, STATUS_CHECK_OUT } from "@/lib/biometricStats";

// Most recent events only — nothing prunes the table, so an unbounded fetch
// would only grow slower over time. `stats` below runs real aggregate
// queries (unbounded by MAX_ROWS) so the KPI tiles stay accurate once the
// table grows past this cap — the /api/calls "Total appels" freeze bug
// taught this lesson, so it's built in from the start here.
const MAX_ROWS = 2000;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessBiometrics(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [events, total, checkIns, checkOuts, employeeGroups] = await Promise.all([
    db.biometricEvent.findMany({ orderBy: { punchTime: "desc" }, take: MAX_ROWS }),
    db.biometricEvent.count(),
    db.biometricEvent.count({ where: { punchStateLabel: STATUS_CHECK_IN } }),
    db.biometricEvent.count({ where: { punchStateLabel: STATUS_CHECK_OUT } }),
    db.biometricEvent.groupBy({ by: ["empCode"] }),
  ]);

  return NextResponse.json({
    events: events.map(toPublicBiometricEvent),
    stats: { total, checkIns, checkOuts, uniqueEmployees: employeeGroups.length },
  });
}
