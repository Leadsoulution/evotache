import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";

// Upserts the override for an employee — creates it on first edit/hide,
// updates it thereafter. There's no separate delete: "removing" an
// employee from the Biometrie page means hiding it (hidden: true) so the
// underlying attendance history stays intact and it can be restored later.
export async function PATCH(request: Request, { params }: { params: Promise<{ empCode: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { empCode } = await params;
  const body = await request.json();
  const data: {
    name?: string | null;
    color?: string | null;
    hidden?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    lunchBreakStart?: string | null;
    lunchBreakEnd?: string | null;
    fridayBreakStart?: string | null;
    fridayBreakEnd?: string | null;
    saturdayEndTime?: string | null;
    saturdayOff?: boolean;
    monthlySalary?: number | null;
  } = {};
  if (typeof body.name === "string" || body.name === null) data.name = body.name;
  if (typeof body.color === "string" || body.color === null) data.color = body.color;
  if (typeof body.hidden === "boolean") data.hidden = body.hidden;
  if (typeof body.saturdayOff === "boolean") data.saturdayOff = body.saturdayOff;

  // null clears the salary (back to "not set", which keeps the employee out
  // of payroll totals) — distinct from 0, which is a real salary of zero.
  if (body.monthlySalary === null) {
    data.monthlySalary = null;
  } else if (body.monthlySalary !== undefined) {
    const salary = Number(body.monthlySalary);
    if (!Number.isFinite(salary) || salary < 0) {
      return NextResponse.json({ error: "monthlySalary doit être un nombre positif ou null." }, { status: 400 });
    }
    data.monthlySalary = salary;
  }

  // Each schedule field is either a valid "HH:mm" string (a custom hour for
  // this employee) or null (clear the override — inherit the global
  // schedule for that field again).
  const timePattern = /^\d{2}:\d{2}$/;
  const scheduleFields = ["startTime", "endTime", "lunchBreakStart", "lunchBreakEnd", "fridayBreakStart", "fridayBreakEnd", "saturdayEndTime"] as const;
  for (const field of scheduleFields) {
    const value = body[field];
    if (value === null) {
      data[field] = null;
    } else if (value !== undefined) {
      if (typeof value !== "string" || !timePattern.test(value)) {
        return NextResponse.json({ error: `${field} doit être au format HH:mm ou null.` }, { status: 400 });
      }
      data[field] = value;
    }
  }

  const override = await db.biometricEmployeeOverride.upsert({
    where: { empCode },
    create: { empCode, ...data },
    update: data,
  });
  return NextResponse.json(override);
}
