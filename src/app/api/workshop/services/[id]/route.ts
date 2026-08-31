import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canCreateWorkshopRepairs, canDeleteWorkshopRepairs, canEditWorkshopStatus } from "@/config/roleMeta";
import { toPublicWorkshopService } from "@/lib/publicWorkshop";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const existing = await db.workshopService.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Service not found." }, { status: 404 });

  // Same split as the repair route: status alone (marking a job done as
  // you go) only needs edit_status; changing what the job actually is
  // needs the fuller capability.
  const patchKeys = Object.keys(body);
  const isStatusOnly = patchKeys.every((k) => k === "status");
  const allowed = isStatusOnly ? canEditWorkshopStatus(sessionUser.role) : canCreateWorkshopRepairs(sessionUser.role);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data: Record<string, unknown> = {};
  if (typeof body.description === "string") data.description = body.description.trim();
  if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
  if (typeof body.status === "string") {
    data.status = body.status;
    if (body.status === "done" && !existing.completedAt) data.completedAt = new Date();
    if (body.status !== "done") data.completedAt = null;
  }

  const service = await db.workshopService.update({ where: { id }, data });
  const activeSession = await db.workshopSession.findFirst({ where: { serviceId: id }, orderBy: { startedAt: "desc" } });
  return NextResponse.json(toPublicWorkshopService(service, activeSession));
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDeleteWorkshopRepairs(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.workshopService.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
