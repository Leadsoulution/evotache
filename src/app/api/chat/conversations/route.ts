import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicConversation } from "@/lib/publicChat";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await db.conversation.findMany({
    where: { participantIds: { has: sessionUser.id } },
    orderBy: { lastMessageAt: "desc" },
  });
  return NextResponse.json(conversations.map(toPublicConversation));
}

interface DirectBody {
  type: "direct";
  otherUserId: string;
}

interface GroupBody {
  type: "group";
  name: string;
  participantIds: string[];
  avatarDataUrl: string | null;
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: DirectBody | GroupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.type === "direct") {
    const existing = await db.conversation.findFirst({
      where: { type: "direct", participantIds: { hasEvery: [sessionUser.id, body.otherUserId] } },
    });
    if (existing && existing.participantIds.length === 2) return NextResponse.json(toPublicConversation(existing));

    const now = new Date();
    const conversation = await db.conversation.create({
      data: {
        type: "direct",
        name: null,
        participantIds: [sessionUser.id, body.otherUserId],
        avatarDataUrl: null,
        createdBy: sessionUser.id,
        lastMessageAt: now,
        lastMessagePreview: null,
        lastReadAt: { [sessionUser.id]: now.toISOString() },
      },
    });
    return NextResponse.json(toPublicConversation(conversation), { status: 201 });
  }

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Group name is required." }, { status: 400 });
  const participantIds = Array.from(new Set([...(body.participantIds ?? []), sessionUser.id]));
  if (participantIds.length < 2) return NextResponse.json({ error: "Pick at least one other member." }, { status: 400 });

  const now = new Date();
  const conversation = await db.conversation.create({
    data: {
      type: "group",
      name,
      participantIds,
      avatarDataUrl: body.avatarDataUrl ?? null,
      createdBy: sessionUser.id,
      lastMessageAt: now,
      lastMessagePreview: null,
      lastReadAt: { [sessionUser.id]: now.toISOString() },
    },
  });
  return NextResponse.json(toPublicConversation(conversation), { status: 201 });
}
