import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const priorities = await db.priorityDef.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(priorities);
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { label: string; color: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const label = (body.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "Priority name is required." }, { status: 400 });

  const count = await db.priorityDef.count();
  const priority = await db.priorityDef.create({ data: { label, color: body.color, order: count } });
  return NextResponse.json(priority, { status: 201 });
}
