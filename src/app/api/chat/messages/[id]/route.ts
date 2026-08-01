import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicMessage } from "@/lib/publicChat";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** True if `messageId` is the most recent message in its conversation — if so, the conversation's denormalized preview needs updating too. */
async function isLatestMessage(conversationId: string, messageId: string): Promise<boolean> {
  const latest = await db.message.findFirst({ where: { conversationId }, orderBy: { createdAt: "desc" } });
  return latest?.id === messageId;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "Message text is required." }, { status: 400 });

  const existing = await db.message.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Message not found." }, { status: 404 });
  if (existing.deletedAt) return NextResponse.json({ error: "This message was deleted." }, { status: 400 });
  if (existing.senderId !== sessionUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await db.message.update({ where: { id }, data: { text, editedAt: new Date() } });

  if (await isLatestMessage(existing.conversationId, id)) {
    await db.conversation.update({ where: { id: existing.conversationId }, data: { lastMessagePreview: text } });
  }

  return NextResponse.json(toPublicMessage(message));
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.message.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Message not found." }, { status: 404 });
  if (existing.senderId !== sessionUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const wasLatest = await isLatestMessage(existing.conversationId, id);
  const message = await db.message.update({ where: { id }, data: { text: "", attachments: [], deletedAt: new Date() } });

  if (wasLatest) {
    await db.conversation.update({ where: { id: existing.conversationId }, data: { lastMessagePreview: "Message deleted" } });
  }

  return NextResponse.json(toPublicMessage(message));
}
