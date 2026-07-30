import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { toPublicArchivedItem } from "@/lib/publicArchivedItem";
import { runArchive } from "@/lib/archive";
import type { ArchiveFilters } from "@/types/archive";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const moduleFilter = request.nextUrl.searchParams.get("module");
  const items = await db.archivedItem.findMany({
    where: moduleFilter ? { module: moduleFilter } : undefined,
    orderBy: { archivedAt: "desc" },
  });
  return NextResponse.json(items.map(toPublicArchivedItem));
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let filters: ArchiveFilters;
  try {
    const body = await request.json();
    if (!["task", "dispute", "achat", "conversation"].includes(body.module)) {
      return NextResponse.json({ error: "A valid module is required." }, { status: 400 });
    }
    filters = { module: body.module, statusId: body.statusId || undefined, beforeDate: body.beforeDate || undefined };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const archivedCount = await runArchive(filters, sessionUser.id);
  return NextResponse.json({ archivedCount }, { status: 201 });
}
