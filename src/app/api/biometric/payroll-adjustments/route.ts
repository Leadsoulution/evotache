import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canViewPayroll } from "@/config/roleMeta";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

// Avance sur salaire / prime — Salaires-only, same as everything else
// touching monthlySalary/monthlyVirement. GET is scoped to one month at a
// time (?month=YYYY-MM), same convention as the rest of the payroll page.
export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewPayroll(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const monthKey = request.nextUrl.searchParams.get("month") ?? "";
  if (!MONTH_PATTERN.test(monthKey)) return NextResponse.json({ error: "month doit être au format AAAA-MM." }, { status: 400 });

  const adjustments = await db.biometricPayrollAdjustment.findMany({ where: { monthKey } });
  return NextResponse.json(adjustments);
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewPayroll(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const empCode = typeof body?.empCode === "string" ? body.empCode : "";
  const monthKey = typeof body?.monthKey === "string" ? body.monthKey : "";
  if (!empCode || !MONTH_PATTERN.test(monthKey)) {
    return NextResponse.json({ error: "empCode et monthKey (AAAA-MM) sont requis." }, { status: 400 });
  }

  const data: { advance?: number; bonus?: number } = {};
  for (const field of ["advance", "bonus"] as const) {
    const value = body[field];
    if (value === undefined) continue;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      return NextResponse.json({ error: `${field} doit être un nombre positif.` }, { status: 400 });
    }
    data[field] = num;
  }

  const adjustment = await db.biometricPayrollAdjustment.upsert({
    where: { empCode_monthKey: { empCode, monthKey } },
    create: { empCode, monthKey, advance: data.advance ?? 0, bonus: data.bonus ?? 0 },
    update: data,
  });
  return NextResponse.json(adjustment);
}
