"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createGroupConversation, fetchConversations, fetchUnreadCounts, findOrCreateDirectConversation } from "@/services/chatApi";
import { useToast } from "@/components/ui/Toast";
import type { Conversation } from "@/types/chat";

const CONVERSATIONS_STORAGE_KEY = "evotasks.chatConversations.v1";
const MESSAGES_STORAGE_KEY = "evotasks.chatMessages.v1";

type LoadState = "loading" | "success" | "error";

async function loadConversationsData(userId: string) {
  const [conversations, unreadCounts] = await Promise.all([fetchConversations(userId), fetchUnreadCounts(userId)]);
  return { conversations, unreadCounts };
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    loadConversationsData(userId)
      .then((data) => {
        if (cancelled) return;
        setConversations(data.conversations);
        setUnreadCounts(data.unreadCounts);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Cross-tab live sync — the `storage` event only fires in OTHER tabs of the
  // same origin, never the tab that made the write, so this is exactly the
  // signal we want: "someone else just sent a message, refresh the list."
  useEffect(() => {
    if (!userId) return;
    function onStorage(event: StorageEvent) {
      if (event.key !== CONVERSATIONS_STORAGE_KEY && event.key !== MESSAGES_STORAGE_KEY) return;
      loadConversationsData(userId as string)
        .then((data) => {
          setConversations(data.conversations);
          setUnreadCounts(data.unreadCounts);
        })
        .catch(() => {});
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  const refetch = useCallback(() => {
    if (!userId) return;
    loadConversationsData(userId)
      .then((data) => {
        setConversations(data.conversations);
        setUnreadCounts(data.unreadCounts);
        setLoadState("success");
      })
      .catch(() => setLoadState("error"));
  }, [userId]);

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
