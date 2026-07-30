"use client";

import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { fetchMessages, markConversationRead, sendMessage } from "@/services/chatApi";
import { useToast } from "@/components/ui/Toast";

const POLL_MS = 4_000;

type LoadState = "loading" | "success" | "error";

interface OutgoingAttachment {
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const toast = useToast();

  const { data, error, isLoading, mutate } = useSWR(
    conversationId ? ["chat-messages", conversationId] : null,
    () => fetchMessages(conversationId as string),
    { refreshInterval: POLL_MS }
  );
  const messages = useMemo(() => data ?? [], [data]);
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";

  // Mark the thread read whenever it's open and has messages — covers both
  // the initial open and any message that arrives while it stays open.
  useEffect(() => {
    if (!conversationId || !user || messages.length === 0) return;
    markConversationRead(conversationId, user.id).catch(() => {});
  }, [conversationId, user, messages.length]);

  const send = useCallback(
    async (text: string, attachments: OutgoingAttachment[]) => {
      if (!conversationId || !user) return false;
      try {
        const message = await sendMessage({ conversationId, senderId: user.id, senderName: user.name, text, attachments });
        await mutate([...messages, message], { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send the message.");
        return false;
      }
    },
    [conversationId, user, messages, mutate, toast]
  );

  return { messages, loadState, send };
}
