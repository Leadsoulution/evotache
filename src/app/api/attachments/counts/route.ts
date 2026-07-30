import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attachments = await db.attachment.findMany({ select: { taskId: true } });
  const counts: Record<string, number> = {};
  for (const attachment of attachments) counts[attachment.taskId] = (counts[attachment.taskId] ?? 0) + 1;
  return NextResponse.json(counts);
}
