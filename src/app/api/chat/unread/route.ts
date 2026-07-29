import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await db.conversation.findMany({ where: { participantIds: { has: sessionUser.id } } });
  const counts: Record<string, number> = {};
  for (const conversation of conversations) {
    const lastReadAtRaw = (conversation.lastReadAt as Record<string, string>)?.[sessionUser.id];
    const lastRead = lastReadAtRaw ? new Date(lastReadAtRaw).getTime() : 0;
    const count = await db.message.count({
      where: { conversationId: conversation.id, senderId: { not: sessionUser.id }, createdAt: { gt: new Date(lastRead) } },
    });
    if (count > 0) counts[conversation.id] = count;
  }
  return NextResponse.json(counts);
}
