import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { label?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.priorityDef.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Priority not found." }, { status: 404 });

  const priority = await db.priorityDef.update({
    where: { id },
    data: { ...(body.label !== undefined && { label: body.label }), ...(body.color !== undefined && { color: body.color }) },
  });
  return NextResponse.json(priority);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const total = await db.priorityDef.count();
  if (total <= 1) return NextResponse.json({ error: "At least one priority is required." }, { status: 400 });

  const inUse = await db.task.count({ where: { priority: id } });
  if (inUse > 0) return NextResponse.json({ error: "This priority is used by existing tasks. Reassign those tasks first." }, { status: 409 });

  await db.priorityDef.delete({ where: { id } }).catch(() => {});
  const remaining = await db.priorityDef.findMany({ orderBy: { order: "asc" } });
  await Promise.all(remaining.map((p, index) => db.priorityDef.update({ where: { id: p.id }, data: { order: index } })));
  return NextResponse.json({ ok: true });
}
