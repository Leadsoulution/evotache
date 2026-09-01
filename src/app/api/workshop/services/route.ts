import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canCreateWorkshopRepairs } from "@/config/roleMeta";
import { toPublicWorkshopService } from "@/lib/publicWorkshop";
import { computeNextServiceStart } from "@/lib/workshopScheduling";
import { notifyMechanicNewService } from "@/lib/workshopNotify";

// Adds one more service (job) to an existing repair — same capability as
// creating the repair itself, since this is still "defining what work is
// needed", not day-to-day status/chrono handling.
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateWorkshopRepairs(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const repairId = body?.repairId as string | undefined;
  const description = (body?.description as string | undefined)?.trim();
  if (!repairId || !description) return NextResponse.json({ error: "repairId and description are required." }, { status: 400 });

  const repair = await db.workshopRepair.findUnique({ where: { id: repairId } });
  if (!repair) return NextResponse.json({ error: "Repair not found." }, { status: 404 });

  const durationMinutes = typeof body?.durationMinutes === "number" ? body.durationMinutes : null;
  const maxOrder = await db.workshopService.aggregate({ where: { repairId }, _max: { order: true } });
  const scheduledDate = await computeNextServiceStart(repair.mechanicId, repair.entryDate);
  const service = await db.workshopService.create({
    data: {
      repairId,
      description,
      durationMinutes,
      scheduledDate,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  notifyMechanicNewService(repair.mechanicId, repair, description);

  return NextResponse.json(toPublicWorkshopService(service, null), { status: 201 });
}
