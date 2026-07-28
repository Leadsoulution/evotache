import { generateId } from "@/lib/id";
import type { Conversation, ConversationType, Message, MessageAttachment, MessageAttachmentKind } from "@/types/chat";

const CONVERSATIONS_KEY = "evotasks.chatConversations.v1";
const MESSAGES_KEY = "evotasks.chatMessages.v1";
const NETWORK_DELAY_MS = 150;
export const MAX_CHAT_FILE_BYTES = 6 * 1024 * 1024;
const MAX_FILE_BYTES = MAX_CHAT_FILE_BYTES;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

export class ApiError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

function createSeedConversations(): Conversation[] {
  return [
    {
      id: "conv-1",
      type: "direct",
      name: null,
      participantIds: ["u1", "u4"],
      avatarDataUrl: null,
      createdBy: "u1",
      createdAt: daysFromToday(-3),
      lastMessageAt: daysFromToday(-0.02),
      lastMessagePreview: "Yassine: Ça avance bien, je t'envoie ça demain matin.",
      lastReadAt: { u1: daysFromToday(-0.02), u4: daysFromToday(-0.02) },
    },
    {
      id: "conv-2",
      type: "group",
      name: "Équipe Web",
      participantIds: ["u1", "u2", "u3", "u4"],
      avatarDataUrl: null,
      createdBy: "u1",
      createdAt: daysFromToday(-10),
      lastMessageAt: daysFromToday(-0.3),
      lastMessagePreview: "Mouad: Le design system est à jour sur Figma.",
      lastReadAt: { u1: daysFromToday(-0.3), u2: daysFromToday(-1), u3: daysFromToday(-0.3), u4: daysFromToday(-2) },
    },
  ];
}

function createSeedMessages(): Message[] {
  return [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "u1",
      text: "Salut Yassine, où en est le catalogue LPR ?",
      attachments: [],
      createdAt: daysFromToday(-3),
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      senderId: "u4",
      text: "Ça avance bien, je t'envoie ça demain matin.",
      attachments: [],
      createdAt: daysFromToday(-0.02),
    },
    {
      id: "msg-3",
      conversationId: "conv-2",
      senderId: "u2",
      text: "Bienvenue dans le groupe Équipe Web 👋",
      attachments: [],
      createdAt: daysFromToday(-10),
    },
    {
      id: "msg-4",
      conversationId: "conv-2",
      senderId: "u3",
      text: "Le design system est à jour sur Figma.",
      attachments: [],
      createdAt: daysFromToday(-0.3),
    },
  ];
}

function readConversations(): Conversation[] {
  if (typeof window === "undefined") return createSeedConversations();
  const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
  if (!raw) {
    const seeded = createSeedConversations();
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedConversations();
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeConversations(items: Conversation[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(items));
}

function readMessages(): Message[] {
  if (typeof window === "undefined") return createSeedMessages();
  const raw = window.localStorage.getItem(MESSAGES_KEY);
  if (!raw) {
    const seeded = createSeedMessages();
    window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as Message[];
    if (!Array.isArray(parsed)) throw new Error("invalid shape");
    return parsed;
  } catch {
    const seeded = createSeedMessages();
    window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeMessages(items: Message[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(items));
}

export function inferMessageAttachmentKind(mimeType: string): MessageAttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "file";
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  await delay(NETWORK_DELAY_MS);
  return readConversations()
    .filter((c) => c.participantIds.includes(userId))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  await delay(NETWORK_DELAY_MS);
  return readMessages()
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function findOrCreateDirectConversation(userId: string, otherUserId: string): Promise<Conversation> {
  await delay(NETWORK_DELAY_MS);
  const conversations = readConversations();
  const existing = conversations.find(
    (c) => c.type === "direct" && c.participantIds.length === 2 && c.participantIds.includes(userId) && c.participantIds.includes(otherUserId)
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: generateId("conv"),
    type: "direct",
    name: null,
    participantIds: [userId, otherUserId],
    avatarDataUrl: null,
    createdBy: userId,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: null,
    lastReadAt: { [userId]: now },
  };
  writeConversations([...conversations, conversation]);
  return conversation;
}

interface CreateGroupInput {
  name: string;
  participantIds: string[];
  createdBy: string;
  avatarDataUrl: string | null;
}

export async function createGroupConversation(input: CreateGroupInput): Promise<Conversation> {
  await delay(NETWORK_DELAY_MS);
  if (!input.name.trim()) throw new ApiError("Group name is required.");
  if (input.participantIds.length < 2) throw new ApiError("Pick at least one other member.");
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: generateId("conv"),
    type: "group",
    name: input.name.trim(),
    participantIds: input.participantIds,
    avatarDataUrl: input.avatarDataUrl,
    createdBy: input.createdBy,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: null,
    lastReadAt: { [input.createdBy]: now },
  };
  writeConversations([...readConversations(), conversation]);
  return conversation;
}

interface SendMessageInput {
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachments: { name: string; mimeType: string; sizeBytes: number; dataUrl: string }[];
}

function previewFor(senderName: string, text: string, attachmentCount: number, conversationType: ConversationType): string {
  const prefix = conversationType === "group" ? `${senderName}: ` : "";
  if (text.trim()) return `${prefix}${text.trim()}`;
  if (attachmentCount > 1) return `${prefix}sent ${attachmentCount} files`;
  return `${prefix}sent an attachment`;
}

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  await delay(NETWORK_DELAY_MS);
  if (!input.text.trim() && input.attachments.length === 0) throw new ApiError("Message is empty.");

  for (const file of input.attachments) {
    if (file.sizeBytes > MAX_FILE_BYTES) {
      throw new ApiError(`"${file.name}" is too large (max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB per file in this demo).`);
    }
  }
  const existingMessages = readMessages();
  const currentTotal = existingMessages.reduce((sum, m) => sum + m.attachments.reduce((s, a) => s + a.sizeBytes, 0), 0);
  const incomingTotal = input.attachments.reduce((sum, a) => sum + a.sizeBytes, 0);
  if (currentTotal + incomingTotal > MAX_TOTAL_BYTES) {
    throw new ApiError("Storage limit reached for this demo's chat. Try smaller files.");
  }

  const conversations = readConversations();
  const conversationIndex = conversations.findIndex((c) => c.id === input.conversationId);
  if (conversationIndex === -1) throw new ApiError("Conversation not found.");
  const conversation = conversations[conversationIndex];

  const message: Message = {
    id: generateId("msg"),
    conversationId: input.conversationId,
    senderId: input.senderId,
    text: input.text.trim(),
    attachments: input.attachments.map((file): MessageAttachment => ({
      id: generateId("chatfile"),
      kind: inferMessageAttachmentKind(file.mimeType),
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      dataUrl: file.dataUrl,
    })),
    createdAt: new Date().toISOString(),
  };
  writeMessages([...existingMessages, message]);

  const updatedConversation: Conversation = {
    ...conversation,
    lastMessageAt: message.createdAt,
    lastMessagePreview: previewFor(input.senderName, input.text, input.attachments.length, conversation.type),
    lastReadAt: { ...conversation.lastReadAt, [input.senderId]: message.createdAt },
  };
  const nextConversations = [...conversations];
  nextConversations[conversationIndex] = updatedConversation;
  writeConversations(nextConversations);

  return message;
}

export async function fetchUnreadCounts(userId: string): Promise<Record<string, number>> {
  await delay(80);
  const conversations = readConversations().filter((c) => c.participantIds.includes(userId));
  const messages = readMessages();
  const counts: Record<string, number> = {};
  for (const conversation of conversations) {
    const lastRead = conversation.lastReadAt[userId] ? new Date(conversation.lastReadAt[userId]).getTime() : 0;
    const count = messages.filter(
      (m) => m.conversationId === conversation.id && m.senderId !== userId && new Date(m.createdAt).getTime() > lastRead
    ).length;
    if (count > 0) counts[conversation.id] = count;
  }
  return counts;
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const conversations = readConversations();
  const index = conversations.findIndex((c) => c.id === conversationId);
  if (index === -1) return;
  const next = [...conversations];
  next[index] = { ...next[index], lastReadAt: { ...next[index].lastReadAt, [userId]: new Date().toISOString() } };
  writeConversations(next);
}

export async function renameGroup(conversationId: string, name: string): Promise<Conversation> {
  await delay(NETWORK_DELAY_MS);
  const conversations = readConversations();
  const index = conversations.findIndex((c) => c.id === conversationId);
  if (index === -1) throw new ApiError("Conversation not found.");
  const next = [...conversations];
  next[index] = { ...next[index], name: name.trim() || next[index].name };
  writeConversations(next);
  return next[index];
}

export async function updateGroupAvatar(conversationId: string, avatarDataUrl: string | null): Promise<Conversation> {
  await delay(NETWORK_DELAY_MS);
  const conversations = readConversations();
  const index = conversations.findIndex((c) => c.id === conversationId);
  if (index === -1) throw new ApiError("Conversation not found.");
  const next = [...conversations];
  next[index] = { ...next[index], avatarDataUrl };
  writeConversations(next);
  return next[index];
}

export async function addParticipants(conversationId: string, userIds: string[]): Promise<Conversation> {
  await delay(NETWORK_DELAY_MS);
  const conversations = readConversations();
  const index = conversations.findIndex((c) => c.id === conversationId);
  if (index === -1) throw new ApiError("Conversation not found.");
  const next = [...conversations];
  const merged = Array.from(new Set([...next[index].participantIds, ...userIds]));
  next[index] = { ...next[index], participantIds: merged };
  writeConversations(next);
  return next[index];
}

export async function removeParticipant(conversationId: string, userId: string): Promise<Conversation> {
  await delay(NETWORK_DELAY_MS);
  const conversations = readConversations();
  const index = conversations.findIndex((c) => c.id === conversationId);
  if (index === -1) throw new ApiError("Conversation not found.");
  const next = [...conversations];
  next[index] = { ...next[index], participantIds: next[index].participantIds.filter((id) => id !== userId) };
  writeConversations(next);
  return next[index];
}
