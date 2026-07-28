export type ConversationType = "direct" | "group";

export interface Conversation {
  id: string;
  type: ConversationType;
  /** Group display name; always null for direct conversations (name is derived from the other participant). */
  name: string | null;
  participantIds: string[];
  avatarDataUrl: string | null;
  createdBy: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  /** userId -> ISO timestamp of the last message that user has seen, for unread counts and read receipts. */
  lastReadAt: Record<string, string>;
}

export type MessageAttachmentKind = "image" | "video" | "pdf" | "file";

export interface MessageAttachment {
  id: string;
  kind: MessageAttachmentKind;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments: MessageAttachment[];
  createdAt: string;
}
