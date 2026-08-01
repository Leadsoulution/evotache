import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Polled by the client (same cadence as message polling) to show a
 * "typing…" bubble while an agent's fire-and-forget reply is in flight —
 * see src/lib/agent/runAgentTurn.ts, which pushes/clears its own id here. */
export async function GET(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await db.conversation.findUnique({ where: { id }, select: { participantIds: true, typingAgentIds: true } });
  if (!conversation) return NextResponse.json({ typingAgentIds: [] });
  if (!conversation.participantIds.includes(sessionUser.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ typingAgentIds: conversation.typingAgentIds });
}
