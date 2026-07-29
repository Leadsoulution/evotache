import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getVisibilityScope } from "@/lib/visibility";
import { toPublicPurchaseItem } from "@/lib/publicPurchase";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = await getVisibilityScope(sessionUser);
  const items = await db.purchaseItem.findMany({ orderBy: { order: "asc" } });
  const visible = scope.isAdmin ? items : items.filter((item) => !item.excludedUserIds.includes(scope.userId));
  return NextResponse.json(visible.map(toPublicPurchaseItem));
}

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const maxOrder = await db.purchaseItem.aggregate({ _max: { order: true } });
  const item = await db.purchaseItem.create({
    data: { order: (maxOrder._max.order ?? -1) + 1, values: {}, assigneeIds: [], excludedUserIds: [] },
  });
  return NextResponse.json(toPublicPurchaseItem(item), { status: 201 });
}
