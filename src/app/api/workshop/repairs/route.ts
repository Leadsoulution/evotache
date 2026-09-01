import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canCreateWorkshopRepairs } from "@/config/roleMeta";
import { toPublicWorkshopRepair, toPublicWorkshopService } from "@/lib/publicWorkshop";
import { computeNextServiceStart } from "@/lib/workshopScheduling";
import { notifyMechanicNewService } from "@/lib/workshopNotify";
import type { WorkshopRepairDraft } from "@/types/workshop";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repairs = await db.workshopRepair.findMany({ orderBy: { createdAt: "desc" } });
  const services = await db.workshopService.findMany({ where: { repairId: { in: repairs.map((r) => r.id) } } });
  const sessions = await db.workshopSession.findMany({
    where: { serviceId: { in: services.map((s) => s.id) } },
    orderBy: { startedAt: "desc" },
  });
  const latestSessionByServiceId = new Map<string, (typeof sessions)[number]>();
  for (const session of sessions) {
    if (!latestSessionByServiceId.has(session.serviceId)) latestSessionByServiceId.set(session.serviceId, session);
  }
  const servicesByRepairId = new Map<string, ReturnType<typeof toPublicWorkshopService>[]>();
  for (const service of services) {
    const list = servicesByRepairId.get(service.repairId) ?? [];
    list.push(toPublicWorkshopService(service, latestSessionByServiceId.get(service.id) ?? null));
    servicesByRepairId.set(service.repairId, list);
  }

  return NextResponse.json(repairs.map((repair) => toPublicWorkshopRepair(repair, servicesByRepairId.get(repair.id) ?? [])));
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
      customerPhone: draft.customerPhone?.trim() || null,
      mechanicId: draft.mechanicId ?? null,
      status: "waiting",
      expectedCompletionDate: draft.expectedCompletionDate ? new Date(draft.expectedCompletionDate) : null,
      createdBy: sessionUser.id,
    },
  });

  await db.workshopStatusHistory.create({
    data: { repairId: repair.id, oldStatus: null, newStatus: "waiting", changedBy: sessionUser.id },
  });

  const serviceDrafts = (draft.services ?? []).filter((s) => s.description?.trim());
  const createdServices = [];
  for (let i = 0; i < serviceDrafts.length; i++) {
    const s = serviceDrafts[i];
    const scheduledDate = await computeNextServiceStart(repair.mechanicId, repair.entryDate);
    createdServices.push(
      await db.workshopService.create({
        data: { repairId: repair.id, description: s.description.trim(), durationMinutes: s.durationMinutes ?? null, scheduledDate, order: i },
      })
    );
    notifyMechanicNewService(repair.mechanicId, repair, s.description.trim());
  }

  return NextResponse.json(toPublicWorkshopRepair(repair, createdServices.map((s) => toPublicWorkshopService(s, null))), { status: 201 });
}
