import { db } from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import type { Conversation, Message, Prisma } from "@/generated/prisma/client";
import type { ConversationType, MessageAttachment } from "@/types/chat";

function previewFor(senderName: string, text: string, attachmentCount: number, conversationType: ConversationType): string {
  const prefix = conversationType === "group" ? `${senderName}: ` : "";
  if (text.trim()) return `${prefix}${text.trim()}`;
  if (attachmentCount > 1) return `${prefix}sent ${attachmentCount} files`;
  return `${prefix}sent an attachment`;
}

interface SendMessageAsUserInput {
  conversation: Conversation;
  senderId: string;
  senderName: string;
  text: string;
  attachments?: MessageAttachment[];
}

/** Persists a message, updates the conversation's preview/lastMessageAt/lastReadAt,
 * and notifies every other participant — shared by the human send path
 * (POST /api/chat/messages) and the agent auto-reply path (runAgentTurn), so
 * an agent's reply behaves identically to a human sending. */
export async function sendMessageAsUser({ conversation, senderId, senderName, text, attachments = [] }: SendMessageAsUserInput): Promise<Message> {
  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      senderId,
      text: text.trim(),
      attachments: attachments as unknown as Prisma.InputJsonValue,
    },
  });

  const lastReadAt = { ...((conversation.lastReadAt as Record<string, string>) ?? {}), [senderId]: message.createdAt.toISOString() };
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: message.createdAt,
      lastMessagePreview: previewFor(senderName, text, attachments.length, conversation.type),
      lastReadAt,
    },
  });

  for (const participantId of conversation.participantIds) {
    if (participantId === senderId) continue;
    void notifyUser(participantId, { title: senderName, body: message.text || "Sent an attachment", url: "/chat" });
  }

  return message;
}
