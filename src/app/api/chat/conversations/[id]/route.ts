import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicConversation } from "@/lib/publicChat";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  name?: string;
  avatarDataUrl?: string | null;
  addParticipantIds?: string[];
  removeParticipantId?: string;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const existing = await db.conversation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  if (!existing.participantIds.includes(sessionUser.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let participantIds = existing.participantIds;
  if (body.addParticipantIds !== undefined) {
    participantIds = Array.from(new Set([...participantIds, ...body.addParticipantIds]));
  }
  if (body.removeParticipantId !== undefined) {
    participantIds = participantIds.filter((pid) => pid !== body.removeParticipantId);
  }

  const conversation = await db.conversation.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() || existing.name }),
      ...(body.avatarDataUrl !== undefined && { avatarDataUrl: body.avatarDataUrl }),
      participantIds,
    },
  });
  return NextResponse.json(toPublicConversation(conversation));
}
