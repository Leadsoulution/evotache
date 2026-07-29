import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicPurchaseItem } from "@/lib/publicPurchase";
import { notifyUser } from "@/lib/notify";
import type { Prisma } from "@/generated/prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  values?: Record<string, string>;
  assigneeIds?: string[];
  excludedUserIds?: string[];
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.purchaseItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Purchase item not found." }, { status: 404 });

  const mergedValues = body.values !== undefined ? { ...(existing.values as Record<string, string>), ...body.values } : undefined;

  const item = await db.purchaseItem.update({
    where: { id },
    data: {
      ...(mergedValues !== undefined && { values: mergedValues as unknown as Prisma.InputJsonValue }),
      ...(body.assigneeIds !== undefined && { assigneeIds: body.assigneeIds }),
      ...(body.excludedUserIds !== undefined && { excludedUserIds: body.excludedUserIds }),
    },
  });

  if (body.assigneeIds !== undefined) {
    const newlyAssigned = item.assigneeIds.filter((assigneeId) => !existing.assigneeIds.includes(assigneeId));
    for (const assigneeId of newlyAssigned) {
      void notifyUser(assigneeId, { title: "You were assigned a purchase", body: "A purchase row was assigned to you", url: "/achats" });
    }
  }

  return NextResponse.json(toPublicPurchaseItem(item));
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.purchaseItem.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
