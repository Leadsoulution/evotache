import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessBiometrics, canManageUsers, canManageWorkflow } from "@/config/roleMeta";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Company-wide public holidays — unlike /api/biometric/leaves, not scoped
// to one empCode: every employee's absence/lateness that day is excused.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessBiometrics(sessionUser)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const holidays = await db.biometricHoliday.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(holidays);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!DATE_PATTERN.test(date)) return NextResponse.json({ error: "La date doit être au format AAAA-MM-JJ." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Le nom du jour férié est requis." }, { status: 400 });

  const holiday = await db.biometricHoliday.create({ data: { date, name, createdBy: sessionUser.id } });
  return NextResponse.json(holiday, { status: 201 });
}
