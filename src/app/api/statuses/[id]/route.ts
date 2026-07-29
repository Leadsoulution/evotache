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

  const existing = await db.statusDef.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Status not found." }, { status: 404 });

  const status = await db.statusDef.update({
    where: { id },
    data: { ...(body.label !== undefined && { label: body.label }), ...(body.color !== undefined && { color: body.color }) },
  });
  return NextResponse.json(status);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const total = await db.statusDef.count();
  if (total <= 1) return NextResponse.json({ error: "At least one status is required." }, { status: 400 });

  const inUse = await db.task.count({ where: { status: id } });
  if (inUse > 0) return NextResponse.json({ error: "This status is used by existing tasks. Move those tasks first." }, { status: 409 });

  await db.statusDef.delete({ where: { id } }).catch(() => {});
  const remaining = await db.statusDef.findMany({ orderBy: { order: "asc" } });
  await Promise.all(remaining.map((s, index) => db.statusDef.update({ where: { id: s.id }, data: { order: index } })));
  return NextResponse.json({ ok: true });
}
