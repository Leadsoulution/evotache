import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicWorkshopStatusHistoryEntry } from "@/lib/publicWorkshop";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entries = await db.workshopStatusHistory.findMany({ where: { repairId: id }, orderBy: { changedAt: "desc" } });
  return NextResponse.json(entries.map(toPublicWorkshopStatusHistoryEntry));
}
