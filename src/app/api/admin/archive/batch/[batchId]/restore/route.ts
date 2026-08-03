import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { restoreArchivedBatch } from "@/lib/archive";

export async function POST(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { batchId } = await context.params;
  const restoredCount = await restoreArchivedBatch(batchId);
  return NextResponse.json({ restoredCount });
}
