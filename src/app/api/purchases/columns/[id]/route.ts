import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicPurchaseColumn } from "@/lib/publicPurchase";
import type { Prisma } from "@/generated/prisma/client";
import type { PurchaseDropdownOption } from "@/types/purchase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { name?: string; options?: PurchaseDropdownOption[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.purchaseColumnDef.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Column not found." }, { status: 404 });

  const column = await db.purchaseColumnDef.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.options !== undefined && { options: body.options as unknown as Prisma.InputJsonValue }),
    },
  });
  return NextResponse.json(toPublicPurchaseColumn(column));
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.purchaseColumnDef.delete({ where: { id } }).catch(() => {});
  const remaining = await db.purchaseColumnDef.findMany({ orderBy: { order: "asc" } });
  await Promise.all(remaining.map((c, index) => db.purchaseColumnDef.update({ where: { id: c.id }, data: { order: index } })));

  const items = await db.purchaseItem.findMany();
  await Promise.all(
    items
      .filter((item) => id in ((item.values as Record<string, string>) ?? {}))
      .map((item) => {
        const values = { ...(item.values as Record<string, string>) };
        delete values[id];
        return db.purchaseItem.update({ where: { id: item.id }, data: { values: values as unknown as Prisma.InputJsonValue } });
      })
  );

  return NextResponse.json({ ok: true });
}
