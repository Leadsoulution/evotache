import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import type { CustomFieldOption } from "@/types/customField";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { name?: string; options?: CustomFieldOption[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.customFieldDef.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Custom field not found." }, { status: 404 });

  const field = await db.customFieldDef.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.options !== undefined && { options: body.options as unknown as Prisma.InputJsonValue }),
    },
  });
  return NextResponse.json(field);
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.customFieldDef.delete({ where: { id } }).catch(() => {});
  const remaining = await db.customFieldDef.findMany({ orderBy: { order: "asc" } });
  await Promise.all(remaining.map((f, index) => db.customFieldDef.update({ where: { id: f.id }, data: { order: index } })));
  return NextResponse.json({ ok: true });
}
