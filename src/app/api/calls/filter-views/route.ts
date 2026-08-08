import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canAccessCalls } from "@/config/roleMeta";

// Private per-user, not shared org-wide — a saved view is just "this
// user's own filter combination, remembered", same access gate as the
// Calls page itself.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCalls(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const views = await db.callFilterView.findMany({ where: { userId: sessionUser.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(views);
}

interface CreateCallFilterViewBody {
  name: string;
  search?: string;
  statusFilter?: string[];
  directionFilter?: string[];
  dateFrom?: string;
  dateTo?: string;
  dateRangeLabel?: string;
  timeFrom?: string;
  timeTo?: string;
  businessHoursOnly?: boolean;
  timeRangeLabel?: string;
  selectedUserDn?: string | null;
  unhandledOnly?: boolean;
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessCalls(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateCallFilterViewBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const view = await db.callFilterView.create({
    data: {
      userId: sessionUser.id,
      name,
      search: body.search ?? "",
      statusFilter: body.statusFilter ?? [],
      directionFilter: body.directionFilter ?? [],
      dateFrom: body.dateFrom ?? "",
      dateTo: body.dateTo ?? "",
      dateRangeLabel: body.dateRangeLabel ?? "Toutes les dates",
      timeFrom: body.timeFrom ?? "",
      timeTo: body.timeTo ?? "",
      businessHoursOnly: body.businessHoursOnly ?? false,
      timeRangeLabel: body.timeRangeLabel ?? "Toute la journée",
      selectedUserDn: body.selectedUserDn ?? null,
      unhandledOnly: body.unhandledOnly ?? false,
    },
  });
  return NextResponse.json(view, { status: 201 });
}
