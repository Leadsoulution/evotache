import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { restoreArchivedItem } from "@/lib/archive";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const restored = await restoreArchivedItem(id);
  if (!restored) return NextResponse.json({ error: "Archived item not found or its data is missing." }, { status: 404 });
  return NextResponse.json({ success: true });
}
