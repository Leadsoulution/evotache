import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessBiometrics, canManageUsers, canManageWorkflow } from "@/config/roleMeta";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Booked leave (congé) per employee. Dates are "YYYY-MM-DD" Casablanca
// calendar days — same keying as absences, so a leave day and an absence day
// compare directly without re-deriving a timezone.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessBiometrics(sessionUser)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const leaves = await db.biometricLeave.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json(leaves);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const empCode = typeof body?.empCode === "string" ? body.empCode.trim() : "";
  const startDate = typeof body?.startDate === "string" ? body.startDate : "";
  const endDate = typeof body?.endDate === "string" ? body.endDate : "";
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

  if (!empCode) return NextResponse.json({ error: "empCode est requis." }, { status: 400 });
  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    return NextResponse.json({ error: "Les dates doivent être au format AAAA-MM-JJ." }, { status: 400 });
  }
  // Both ends are inclusive, so an end before the start would silently cover
  // no days at all rather than erroring later — reject it here instead.
  if (endDate < startDate) return NextResponse.json({ error: "La date de fin doit suivre la date de début." }, { status: 400 });

  const leave = await db.biometricLeave.create({ data: { empCode, startDate, endDate, reason, createdBy: sessionUser.id } });
  return NextResponse.json(leave, { status: 201 });
}
