import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canCreateWorkshopRepairs, canDeleteWorkshopRepairs, canEditWorkshopStatus } from "@/config/roleMeta";
import { toPublicWorkshopRepair, toPublicWorkshopService } from "@/lib/publicWorkshop";
import { callGhassanForMissingPart } from "@/lib/workshopCallAutomation";
import type { WorkshopRepair } from "@/types/workshop";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function loadPublicRepair(id: string) {
  const repair = await db.workshopRepair.findUnique({ where: { id } });
  if (!repair) return null;
  const services = await db.workshopService.findMany({ where: { repairId: id } });
  const sessions = await db.workshopSession.findMany({ where: { serviceId: { in: services.map((s) => s.id) } }, orderBy: { startedAt: "desc" } });
  const latestByServiceId = new Map<string, (typeof sessions)[number]>();
  for (const session of sessions) if (!latestByServiceId.has(session.serviceId)) latestByServiceId.set(session.serviceId, session);
  return toPublicWorkshopRepair(
    repair,
    services.map((s) => toPublicWorkshopService(s, latestByServiceId.get(s.id) ?? null))
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let patch: Partial<WorkshopRepair>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.workshopRepair.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Repair not found." }, { status: 404 });

  // Status/mechanic changes (the status dropdown, "Démarrer"/assign) only
  // need the lighter edit_status capability, available to every role —
  // that's what lets a mechanic (who can't create/edit repair details)
  // still move their own work through the workflow. Anything else (brand,
  // model, dates, ...) reuses the same role set as creating a repair.
  const patchKeys = Object.keys(patch);
  const isStatusOnly = patchKeys.every((k) => k === "status" || k === "mechanicId");
  const allowed = isStatusOnly ? canEditWorkshopStatus(sessionUser.role) : canCreateWorkshopRepairs(sessionUser.role);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude these server-owned/derived fields from the update payload
  const { id: _id, createdBy: _createdBy, createdAt: _createdAt, updatedAt: _updatedAt, services: _services, expectedCompletionDate, completedDate, ...rest } = patch;

  const data: Record<string, unknown> = { ...rest };
  if (expectedCompletionDate !== undefined) data.expectedCompletionDate = expectedCompletionDate ? new Date(expectedCompletionDate) : null;
  if (completedDate !== undefined) data.completedDate = completedDate ? new Date(completedDate) : null;

  if (patch.status && patch.status !== existing.status) {
    await db.workshopStatusHistory.create({
      data: { repairId: id, oldStatus: existing.status, newStatus: patch.status, changedBy: sessionUser.id },
    });
    // Reaching a terminal "picked up" status stamps completedDate automatically if not already set.
    if (patch.status === "picked_up" && !existing.completedDate && completedDate === undefined) {
      data.completedDate = new Date();
    }
    // Automated internal notification — never let a failed/misconfigured
    // call block the status change itself, just log it server-side.
    if (patch.status === "waiting_part") {
      callGhassanForMissingPart(`${existing.orderNumber} — ${existing.brand} ${existing.model}`).catch((err) =>
        console.error("callGhassanForMissingPart threw unexpectedly", err)
      );
    }
  }

  await db.workshopRepair.update({ where: { id }, data });
  const publicRepair = await loadPublicRepair(id);
  return NextResponse.json(publicRepair);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDeleteWorkshopRepairs(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.workshopRepair.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
