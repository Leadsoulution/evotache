import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canEditWorkshopStatus } from "@/config/roleMeta";
import { toPublicWorkshopService } from "@/lib/publicWorkshop";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type SessionAction = "start" | "pause" | "resume" | "end";

// The chrono lives entirely in WorkshopSession's persisted fields
// (runningSince/accumulatedSeconds) — every action here only ever reads
// and writes those, so a page refresh always recomputes the same elapsed
// time instead of anything resetting to zero client-side. One chrono per
// *service*, not per repair — a bike with two jobs running has two
// independent chronos.
export async function PATCH(request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEditWorkshopStatus(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action as SessionAction | undefined;
  if (!action || !["start", "pause", "resume", "end"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const service = await db.workshopService.findUnique({ where: { id } });
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  const latest = await db.workshopSession.findFirst({ where: { serviceId: id }, orderBy: { startedAt: "desc" } });
  const now = new Date();

  if (action === "start") {
    if (latest && !latest.endedAt) return NextResponse.json({ error: "A session is already active for this service." }, { status: 409 });
    const repair = await db.workshopRepair.findUnique({ where: { id: service.repairId } });
    await db.workshopSession.create({
      data: { serviceId: id, mechanicId: repair?.mechanicId ?? sessionUser.id, startedAt: now, runningSince: now },
    });
    if (service.status !== "in_progress") await db.workshopService.update({ where: { id }, data: { status: "in_progress" } });
    if (repair && repair.status !== "in_progress") {
      await db.workshopStatusHistory.create({ data: { repairId: repair.id, oldStatus: repair.status, newStatus: "in_progress", changedBy: sessionUser.id } });
      await db.workshopRepair.update({ where: { id: repair.id }, data: { status: "in_progress" } });
    }
  } else if (action === "pause") {
    if (!latest || !latest.runningSince) return NextResponse.json({ error: "No running session to pause." }, { status: 409 });
    const elapsed = Math.max(0, Math.floor((now.getTime() - latest.runningSince.getTime()) / 1000));
    await db.workshopSession.update({
      where: { id: latest.id },
      data: { accumulatedSeconds: latest.accumulatedSeconds + elapsed, runningSince: null, pausedAt: now },
    });
  } else if (action === "resume") {
    if (!latest || latest.runningSince || latest.endedAt) return NextResponse.json({ error: "No paused session to resume." }, { status: 409 });
    await db.workshopSession.update({ where: { id: latest.id }, data: { runningSince: now, pausedAt: null } });
  } else {
    // end
    if (!latest || latest.endedAt) return NextResponse.json({ error: "No active session to end." }, { status: 409 });
    const elapsed = latest.runningSince ? Math.max(0, Math.floor((now.getTime() - latest.runningSince.getTime()) / 1000)) : 0;
    const totalWorkSeconds = latest.accumulatedSeconds + elapsed;
    await db.workshopSession.update({
      where: { id: latest.id },
      data: { accumulatedSeconds: totalWorkSeconds, runningSince: null, endedAt: now, totalWorkSeconds },
    });
  }

  const updatedService = await db.workshopService.findUnique({ where: { id } });
  const updatedSession = await db.workshopSession.findFirst({ where: { serviceId: id }, orderBy: { startedAt: "desc" } });
  return NextResponse.json(toPublicWorkshopService(updatedService!, updatedSession));
}
