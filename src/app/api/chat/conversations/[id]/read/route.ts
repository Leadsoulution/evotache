import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.conversation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: true });
  if (!existing.participantIds.includes(sessionUser.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const lastReadAt = { ...((existing.lastReadAt as Record<string, string>) ?? {}), [sessionUser.id]: new Date().toISOString() };
  await db.conversation.update({ where: { id }, data: { lastReadAt } });
  return NextResponse.json({ ok: true });
}
