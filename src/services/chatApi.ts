import type { Conversation, Message, MessageAttachmentKind } from "@/types/chat";

export const MAX_CHAT_FILE_BYTES = 6 * 1024 * 1024;

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export function inferMessageAttachmentKind(mimeType: string): MessageAttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "file";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility; the server derives the current user from the session
export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const response = await fetch("/api/chat/conversations");
  if (!response.ok) return [];
  return response.json();
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const response = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
  if (!response.ok) return [];
  return response.json();
}

export async function findOrCreateDirectConversation(userId: string, otherUserId: string): Promise<Conversation> {
  const response = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "direct", otherUserId }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

interface CreateGroupInput {
  name: string;
  participantIds: string[];
  createdBy: string;
  avatarDataUrl: string | null;
}

export async function createGroupConversation(input: CreateGroupInput): Promise<Conversation> {
  const response = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "group", name: input.name, participantIds: input.participantIds, avatarDataUrl: input.avatarDataUrl }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

interface SendMessageInput {
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachments: { name: string; mimeType: string; sizeBytes: number; dataUrl: string }[];
}

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const response = await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: input.conversationId, text: input.text, attachments: input.attachments }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function editMessage(messageId: string, text: string): Promise<Message> {
  const response = await fetch(`/api/chat/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteMessage(messageId: string): Promise<Message> {
  const response = await fetch(`/api/chat/messages/${messageId}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function fetchTypingAgentIds(conversationId: string): Promise<string[]> {
  const response = await fetch(`/api/chat/conversations/${conversationId}/typing`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.typingAgentIds ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility; the server derives the current user from the session
export async function fetchUnreadCounts(userId: string): Promise<Record<string, number>> {
  const response = await fetch("/api/chat/unread");
  if (!response.ok) return {};
  return response.json();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for call-site compatibility; the server derives the current user from the session
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/chat/conversations/${conversationId}/read`, { method: "POST" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function renameGroup(conversationId: string, name: string): Promise<Conversation> {
  const response = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateGroupAvatar(conversationId: string, avatarDataUrl: string | null): Promise<Conversation> {
  const response = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarDataUrl }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function addParticipants(conversationId: string, userIds: string[]): Promise<Conversation> {
  const response = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addParticipantIds: userIds }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function removeParticipant(conversationId: string, userId: string): Promise<Conversation> {
  const response = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removeParticipantId: userId }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}
