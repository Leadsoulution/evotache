import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { toPublicMessage } from "@/lib/publicChat";
import { notifyUser } from "@/lib/notify";
import type { Prisma } from "@/generated/prisma/client";
import type { ConversationType, MessageAttachmentKind } from "@/types/chat";

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

function inferMessageAttachmentKind(mimeType: string): MessageAttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "file";
}

function previewFor(senderName: string, text: string, attachmentCount: number, conversationType: ConversationType): string {
  const prefix = conversationType === "group" ? `${senderName}: ` : "";
  if (text.trim()) return `${prefix}${text.trim()}`;
  if (attachmentCount > 1) return `${prefix}sent ${attachmentCount} files`;
  return `${prefix}sent an attachment`;
}

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "conversationId query param is required." }, { status: 400 });

  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  if (!conversation.participantIds.includes(sessionUser.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(messages.map(toPublicMessage));
}

interface SendMessageBody {
  conversationId: string;
  text: string;
  attachments: { name: string; mimeType: string; sizeBytes: number; dataUrl: string }[];
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: SendMessageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.text?.trim() && (body.attachments ?? []).length === 0) return NextResponse.json({ error: "Message is empty." }, { status: 400 });

  const conversation = await db.conversation.findUnique({ where: { id: body.conversationId } });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  if (!conversation.participantIds.includes(sessionUser.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  for (const file of body.attachments ?? []) {
    if (file.sizeBytes > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `"${file.name}" is too large (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB per file in this demo).` }, { status: 400 });
    }
  }
  const existingMessages = await db.message.findMany({ select: { attachments: true } });
  const currentTotal = existingMessages.reduce(
    (sum, m) => sum + ((m.attachments as { sizeBytes: number }[]) ?? []).reduce((s, a) => s + a.sizeBytes, 0),
    0
  );
  const incomingTotal = (body.attachments ?? []).reduce((sum, a) => sum + a.sizeBytes, 0);
  if (currentTotal + incomingTotal > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: "Storage limit reached for this demo's chat. Try smaller files." }, { status: 400 });
  }

  const attachments = (body.attachments ?? []).map((file) => ({
    id: `chatfile-${crypto.randomUUID()}`,
    kind: inferMessageAttachmentKind(file.mimeType),
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    dataUrl: file.dataUrl,
  }));

  const message = await db.message.create({
    data: {
      conversationId: body.conversationId,
      senderId: sessionUser.id,
      text: (body.text ?? "").trim(),
      attachments: attachments as unknown as Prisma.InputJsonValue,
    },
  });

  const lastReadAt = { ...((conversation.lastReadAt as Record<string, string>) ?? {}), [sessionUser.id]: message.createdAt.toISOString() };
  await db.conversation.update({
    where: { id: body.conversationId },
    data: {
      lastMessageAt: message.createdAt,
      lastMessagePreview: previewFor(sessionUser.name, body.text ?? "", attachments.length, conversation.type),
      lastReadAt,
    },
  });

  for (const participantId of conversation.participantIds) {
    if (participantId === sessionUser.id) continue;
    void notifyUser(participantId, { title: sessionUser.name, body: message.text || "Sent an attachment", url: "/chat" });
  }

  return NextResponse.json(toPublicMessage(message), { status: 201 });
}
