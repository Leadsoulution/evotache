import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";
import { toPublicPhoneCall } from "@/lib/publicPhoneCall";

// Most recent calls only — 3CX writes these continuously and nothing prunes
// the table, so an unbounded fetch would only grow slower over time.
const MAX_ROWS = 2000;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const calls = await db.phoneCall.findMany({ orderBy: { startTime: "desc" }, take: MAX_ROWS });
  return NextResponse.json(calls.map(toPublicPhoneCall));
}
