import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessBiometrics, canViewPayroll } from "@/config/roleMeta";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessBiometrics(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const overrides = await db.biometricEmployeeOverride.findMany();
  // Salary/virement must never reach the browser for anyone but the
  // Salaires-capable role — stripped here (not just hidden in the UI) so
  // this route structurally can't leak more than that regardless of what
  // the client-side code does with the response.
  if (canViewPayroll(sessionUser.role)) return NextResponse.json(overrides);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to strip these two fields from the response
  const sanitized = overrides.map(({ monthlySalary: _monthlySalary, monthlyVirement: _monthlyVirement, ...rest }) => rest);
  return NextResponse.json(sanitized);
}
