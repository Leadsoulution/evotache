import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let orderedIds: string[];
  try {
    const body = await request.json();
    orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  await Promise.all(orderedIds.map((id, index) => db.libraryDoc.update({ where: { id }, data: { order: index } })));
  return NextResponse.json({ ok: true });
}
