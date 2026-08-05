import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const overrides = await db.threeCxUser.findMany();
  return NextResponse.json(overrides);
}
