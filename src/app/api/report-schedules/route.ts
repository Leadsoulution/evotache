import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";

// Lists every agent's scheduled reports in one call — the per-agent
// /api/agents/[id]/report-schedules routes still own create/toggle/delete,
// this just avoids the Reminders page (which isn't scoped to one agent)
// having to fetch every agent's schedules one at a time.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const schedules = await db.agentReportSchedule.findMany({ orderBy: { createdAt: "asc" } });
  const userIds = Array.from(new Set(schedules.flatMap((s) => [s.agentId, s.recipientId])));
  const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return NextResponse.json(
    schedules.map((s) => ({ ...s, agentName: nameById.get(s.agentId) ?? "Unknown", recipientName: nameById.get(s.recipientId) ?? "Unknown" }))
  );
}
