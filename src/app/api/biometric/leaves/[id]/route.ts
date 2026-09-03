import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";

// Leave periods are genuinely deleted rather than soft-hidden (unlike an
// employee): a cancelled leave must stop excusing those days' absences, and
// nothing references it by id.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.biometricLeave.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
