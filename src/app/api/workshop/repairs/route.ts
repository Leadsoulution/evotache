import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canCreateWorkshopRepairs } from "@/config/roleMeta";
import { toPublicWorkshopRepair } from "@/lib/publicWorkshop";
import type { WorkshopRepairDraft } from "@/types/workshop";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repairs = await db.workshopRepair.findMany({ orderBy: { createdAt: "desc" } });
  const sessions = await db.workshopSession.findMany({
    where: { repairId: { in: repairs.map((r) => r.id) } },
    orderBy: { startedAt: "desc" },
  });
  const latestSessionByRepairId = new Map<string, (typeof sessions)[number]>();
  for (const session of sessions) {
    if (!latestSessionByRepairId.has(session.repairId)) latestSessionByRepairId.set(session.repairId, session);
  }

  return NextResponse.json(repairs.map((repair) => toPublicWorkshopRepair(repair, latestSessionByRepairId.get(repair.id) ?? null)));
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateWorkshopRepairs(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let draft: WorkshopRepairDraft;
  try {
    draft = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!draft.orderNumber?.trim()) return NextResponse.json({ error: "Order number is required." }, { status: 400 });
  if (!draft.brand?.trim()) return NextResponse.json({ error: "Brand is required." }, { status: 400 });
  if (!draft.model?.trim()) return NextResponse.json({ error: "Model is required." }, { status: 400 });

  const repair = await db.workshopRepair.create({
    data: {
      orderNumber: draft.orderNumber.trim(),
      brand: draft.brand.trim(),
      model: draft.model.trim(),
      year: draft.year ?? null,
      engineCc: draft.engineCc ?? null,
      registration: draft.registration?.trim() || null,
      workDescription: draft.workDescription ?? "",
      mechanicId: draft.mechanicId ?? null,
      status: "waiting",
      expectedCompletionDate: draft.expectedCompletionDate ? new Date(draft.expectedCompletionDate) : null,
      createdBy: sessionUser.id,
    },
  });

  await db.workshopStatusHistory.create({
    data: { repairId: repair.id, oldStatus: null, newStatus: "waiting", changedBy: sessionUser.id },
  });

  return NextResponse.json(toPublicWorkshopRepair(repair, null), { status: 201 });
}
