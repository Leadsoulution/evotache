import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { attachmentId } = await params;
  const existing = await db.attachment.findUnique({ where: { id: attachmentId } });
  if (!existing) return NextResponse.json({ ok: true });

  await db.attachment.delete({ where: { id: attachmentId } }).catch(() => {});
  if (existing.url) void deleteFile(existing.url);
  return NextResponse.json({ ok: true });
}
