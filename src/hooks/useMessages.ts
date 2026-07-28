"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchMessages, markConversationRead, sendMessage } from "@/services/chatApi";
import { useToast } from "@/components/ui/Toast";
import type { Message } from "@/types/chat";

const MESSAGES_STORAGE_KEY = "evotasks.chatMessages.v1";

type LoadState = "loading" | "success" | "error";

interface OutgoingAttachment {
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    fetchMessages(conversationId)
      .then((list) => {
        if (cancelled) return;
        setMessages(list);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Cross-tab live sync, same mechanism as useConversations.
  useEffect(() => {
    if (!conversationId) return;
    function onStorage(event: StorageEvent) {
      if (event.key !== MESSAGES_STORAGE_KEY) return;
      fetchMessages(conversationId as string)
        .then((list) => setMessages(list))
        .catch(() => {});
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [conversationId]);

  // Mark the thread read whenever it's open and has messages — covers both
  // the initial open and any message that arrives (own or via storage sync)
  // while it stays open.
  useEffect(() => {
    if (!conversationId || !user || messages.length === 0) return;
    markConversationRead(conversationId, user.id).catch(() => {});
  }, [conversationId, user, messages.length]);

  const send = useCallback(
    async (text: string, attachments: OutgoingAttachment[]) => {
      if (!conversationId || !user) return false;
      try {
        const message = await sendMessage({ conversationId, senderId: user.id, senderName: user.name, text, attachments });
        setMessages((current) => [...current, message]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send the message.");
        return false;
      }
    },
    [conversationId, user, toast]
  );

  return { messages, loadState, send };
}
