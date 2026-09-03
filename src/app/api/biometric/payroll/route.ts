import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";

// Salary figures are management data, not general attendance data — unlike
// the rest of /api/biometric/* (which a view-only granted user can read),
// everything here is admin/manager-only on both read and write.
function canSeePayroll(role: Parameters<typeof canManageUsers>[0]): boolean {
  return canManageUsers(role) || canManageWorkflow(role);
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeePayroll(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [config, rules] = await Promise.all([
    db.biometricPayrollConfig.findFirst(),
    db.biometricLatePenaltyRule.findMany({ orderBy: { fromMinutes: "asc" } }),
  ]);
  return NextResponse.json({ config: { absenceDeduction: config?.absenceDeduction ?? 0 }, rules });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeePayroll(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const absenceDeduction = Number(body?.absenceDeduction);
  if (!Number.isFinite(absenceDeduction) || absenceDeduction < 0) {
    return NextResponse.json({ error: "Le montant par absence doit être un nombre positif." }, { status: 400 });
  }

  const existing = await db.biometricPayrollConfig.findFirst();
  const config = existing
    ? await db.biometricPayrollConfig.update({ where: { id: existing.id }, data: { absenceDeduction } })
    : await db.biometricPayrollConfig.create({ data: { absenceDeduction } });
  return NextResponse.json({ absenceDeduction: config.absenceDeduction });
}
