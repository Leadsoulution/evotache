import type { Conversation as DbConversation, Message as DbMessage } from "@/generated/prisma/client";
import type { Conversation, Message, MessageAttachment } from "@/types/chat";

export function toPublicConversation(conversation: DbConversation): Conversation {
  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    participantIds: conversation.participantIds,
    avatarDataUrl: conversation.avatarDataUrl,
    createdBy: conversation.createdBy,
    createdAt: conversation.createdAt.toISOString(),
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    lastMessagePreview: conversation.lastMessagePreview,
    lastReadAt: (conversation.lastReadAt as Record<string, string>) ?? {},
  };
}

export function toPublicMessage(message: DbMessage): Message {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    text: message.text,
    attachments: (message.attachments as unknown as MessageAttachment[]) ?? [],
    createdAt: message.createdAt.toISOString(),
    editedAt: message.editedAt ? message.editedAt.toISOString() : null,
    deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
  };
}
