import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";

interface RouteContext {
  params: Promise<{ id: string; scheduleId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, scheduleId } = await params;
  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.agentReportSchedule.findFirst({ where: { id: scheduleId, agentId: id } });
  if (!existing) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });

  const schedule = await db.agentReportSchedule.update({
    where: { id: scheduleId },
    data: { ...(body.enabled !== undefined && { enabled: body.enabled }) },
  });
  return NextResponse.json(schedule);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, scheduleId } = await params;
  await db.agentReportSchedule.deleteMany({ where: { id: scheduleId, agentId: id } });
  return NextResponse.json({ ok: true });
}
