import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { previewArchiveCount } from "@/lib/archive";
import type { ArchiveFilters } from "@/types/archive";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const moduleParam = params.get("module");
  if (!moduleParam || !["task", "dispute", "achat", "conversation"].includes(moduleParam)) {
    return NextResponse.json({ error: "A valid module is required." }, { status: 400 });
  }
  const filters: ArchiveFilters = {
    module: moduleParam as ArchiveFilters["module"],
    statusId: params.get("statusId") || undefined,
    beforeDate: params.get("beforeDate") || undefined,
  };

  const count = await previewArchiveCount(filters);
  return NextResponse.json({ count });
}
