import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";

// Upserts the override for a 3CX extension — creates it on first edit/hide,
// updates it thereafter. There's no separate delete: "removing" a user from
// the Calls page means hiding it (hidden: true) so the underlying call
// history stays intact and the extension can be restored later.
export async function PATCH(request: Request, { params }: { params: Promise<{ dn: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { dn } = await params;
  const body = await request.json();
  const data: { name?: string | null; color?: string | null; hidden?: boolean } = {};
  if (typeof body.name === "string" || body.name === null) data.name = body.name;
  if (typeof body.color === "string" || body.color === null) data.color = body.color;
  if (typeof body.hidden === "boolean") data.hidden = body.hidden;

  const override = await db.threeCxUser.upsert({
    where: { dn },
    create: { dn, ...data },
    update: data,
  });
  return NextResponse.json(override);
}
