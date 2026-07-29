import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const statuses = await db.statusDef.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(statuses);
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
  if (!label) return NextResponse.json({ error: "Status name is required." }, { status: 400 });

  const count = await db.statusDef.count();
  const status = await db.statusDef.create({ data: { label, color: body.color, order: count } });
  return NextResponse.json(status, { status: 201 });
}
