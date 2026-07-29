import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicPurchaseColumn } from "@/lib/publicPurchase";
import type { Prisma } from "@/generated/prisma/client";
import type { PurchaseColumnType, PurchaseDropdownOption } from "@/types/purchase";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const columns = await db.purchaseColumnDef.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(columns.map(toPublicPurchaseColumn));
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name: string; type: PurchaseColumnType; options: PurchaseDropdownOption[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Column name is required." }, { status: 400 });

  const count = await db.purchaseColumnDef.count();
  const column = await db.purchaseColumnDef.create({
    data: {
      name,
      type: body.type,
      options: (body.type === "dropdown" ? (body.options ?? []).filter((o) => o.label.trim()) : []) as unknown as Prisma.InputJsonValue,
      order: count,
    },
  });
  return NextResponse.json(toPublicPurchaseColumn(column), { status: 201 });
}
