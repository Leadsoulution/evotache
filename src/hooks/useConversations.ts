"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { createGroupConversation, fetchConversations, fetchUnreadCounts, findOrCreateDirectConversation } from "@/services/chatApi";
import { useToast } from "@/components/ui/Toast";

const POLL_MS = 8_000;

type LoadState = "loading" | "success" | "error";

async function loadConversationsData(userId: string) {
  const [conversations, unreadCounts] = await Promise.all([fetchConversations(userId), fetchUnreadCounts(userId)]);
  return { conversations, unreadCounts };
}

export function useConversations() {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id;

  const { data, error, isLoading, mutate } = useSWR(userId ? ["chat-conversations", userId] : null, () => loadConversationsData(userId as string), {
    refreshInterval: POLL_MS,
  });

  const conversations = data?.conversations ?? [];
  const unreadCounts = data?.unreadCounts ?? {};
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";

  const refetch = useCallback(() => {
    void mutate();
  }, [mutate]);

  const startDirectConversation = useCallback(
    async (otherUserId: string) => {
      if (!user) return null;
      try {
        const conversation = await findOrCreateDirectConversation(user.id, otherUserId);
        refetch();
        return conversation;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start the conversation.");
        return null;
      }
    },
    [user, refetch, toast]
  );

  const startGroup = useCallback(
    async (input: { name: string; participantIds: string[]; avatarDataUrl: string | null }) => {
      if (!user) return null;
      try {
        const conversation = await createGroupConversation({
          name: input.name,
          avatarDataUrl: input.avatarDataUrl,
          participantIds: Array.from(new Set([...input.participantIds, user.id])),
          createdBy: user.id,
        });
        refetch();
        return conversation;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create the group.");
        return null;
      }
    },
    [user, refetch, toast]
  );

  return { conversations, unreadCounts, loadState, refetch, startDirectConversation, startGroup };
}
