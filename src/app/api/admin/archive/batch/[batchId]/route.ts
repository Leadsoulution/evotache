import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { deleteArchivedBatch } from "@/lib/archive";

export async function DELETE(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { batchId } = await context.params;
  const deletedCount = await deleteArchivedBatch(batchId);
  if (deletedCount === 0) return NextResponse.json({ error: "Archive batch not found." }, { status: 404 });
  return NextResponse.json({ deletedCount });
}
