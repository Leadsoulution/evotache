import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessBiometrics, canManageUsers, canManageWorkflow } from "@/config/roleMeta";

const DEFAULTS = { startTime: "09:30", endTime: "19:00", fridayBreakStart: "13:00", fridayBreakEnd: "15:00" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessBiometrics(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schedule = await db.biometricSchedule.findFirst();
  return NextResponse.json(schedule ?? DEFAULTS);
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const timePattern = /^\d{2}:\d{2}$/;
  const fields = ["startTime", "endTime", "fridayBreakStart", "fridayBreakEnd"] as const;
  const data: Record<string, string> = {};
  for (const field of fields) {
    const value = body?.[field];
    if (typeof value !== "string" || !timePattern.test(value)) {
      return NextResponse.json({ error: `${field} doit être au format HH:mm.` }, { status: 400 });
    }
    data[field] = value;
  }

  const existing = await db.biometricSchedule.findFirst();
  const schedule = existing
    ? await db.biometricSchedule.update({ where: { id: existing.id }, data })
    : await db.biometricSchedule.create({ data });
  return NextResponse.json(schedule);
}
