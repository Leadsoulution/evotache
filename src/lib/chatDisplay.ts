import type { Conversation } from "@/types/chat";
import type { AppUser } from "@/types/user";

export interface ConversationDisplay {
  name: string;
  photoDataUrl: string | null;
  color: string;
  /** Only set for direct conversations. */
  otherUser: AppUser | null;
}

export function getConversationDisplay(conversation: Conversation, users: AppUser[], currentUserId: string): ConversationDisplay {
  if (conversation.type === "group") {
    return { name: conversation.name ?? "Group", photoDataUrl: conversation.avatarDataUrl, color: "#6366f1", otherUser: null };
  }
  const otherId = conversation.participantIds.find((id) => id !== currentUserId);
  const otherUser = users.find((u) => u.id === otherId) ?? null;
  return {
    name: otherUser?.name ?? "Unknown user",
    photoDataUrl: otherUser?.photoDataUrl ?? null,
    color: otherUser?.color ?? "#64748b",
    otherUser,
  };
}
