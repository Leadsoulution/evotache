import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";

interface RouteContext {
  params: Promise<{ id: string; memoryId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, memoryId } = await params;
  await db.agentMemory.deleteMany({ where: { id: memoryId, agentId: id } });
  return NextResponse.json({ ok: true });
}
