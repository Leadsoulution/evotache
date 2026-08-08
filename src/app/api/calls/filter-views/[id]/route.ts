import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  // Scoped to userId, not just id — a saved view is private, so this also
  // stops one user deleting another's by guessing/reusing an id.
  await db.callFilterView.deleteMany({ where: { id, userId: sessionUser.id } });
  return NextResponse.json({ ok: true });
}
