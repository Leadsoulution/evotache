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
  const data: { name?: string | null; color?: string | null; hidden?: boolean } = {};
  if (typeof body.name === "string" || body.name === null) data.name = body.name;
  if (typeof body.color === "string" || body.color === null) data.color = body.color;
  if (typeof body.hidden === "boolean") data.hidden = body.hidden;

  const override = await db.biometricEmployeeOverride.upsert({
    where: { empCode },
    create: { empCode, ...data },
    update: data,
  });
  return NextResponse.json(override);
}
