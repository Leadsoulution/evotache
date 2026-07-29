import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orderedIds: string[];
  try {
    const body = await request.json();
    orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  await Promise.all(orderedIds.map((id, index) => db.priorityDef.update({ where: { id }, data: { order: index } })));
  const priorities = await db.priorityDef.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(priorities);
}
