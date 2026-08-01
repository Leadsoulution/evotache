"use client";

import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { deleteMessage, editMessage, fetchMessages, fetchTypingAgentIds, markConversationRead, sendMessage } from "@/services/chatApi";
import { useToast } from "@/components/ui/Toast";

const POLL_MS = 4_000;
// Checked much more often than messages: an agent reply (esp. gpt-4o-mini
// with no tool calls) can land in 1-2s, faster than POLL_MS, so a typing
// bubble polled on the same cadence is easily never observed at all.
const TYPING_POLL_MS = 1_200;

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

  const { data: typingAgentIds, mutate: mutateTyping } = useSWR(
    conversationId ? ["chat-typing", conversationId] : null,
    () => fetchTypingAgentIds(conversationId as string),
    { refreshInterval: TYPING_POLL_MS }
  );

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
        // The send request resolves as soon as the user's own message is
        // saved — runAgentTurn is fired-and-forgotten server-side and hasn't
        // necessarily pushed its typingAgentIds yet by this point. A quick
        // staggered burst (instead of waiting up to TYPING_POLL_MS for the
        // next scheduled poll) catches that window reliably.
        for (const delay of [300, 900, 1800]) {
          setTimeout(() => void mutateTyping(), delay);
        }
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send the message.");
        return false;
      }
    },
    [conversationId, user, messages, mutate, mutateTyping, toast]
  );

  const edit = useCallback(
    async (messageId: string, text: string) => {
      const previous = messages;
      await mutate(
        messages.map((m) => (m.id === messageId ? { ...m, text, editedAt: new Date().toISOString() } : m)),
        { revalidate: false }
      );
      try {
        await editMessage(messageId, text);
        return true;
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to edit the message.");
        return false;
      }
    },
    [messages, mutate, toast]
  );

  const remove = useCallback(
    async (messageId: string) => {
      const previous = messages;
      await mutate(
        messages.map((m) => (m.id === messageId ? { ...m, text: "", attachments: [], deletedAt: new Date().toISOString() } : m)),
        { revalidate: false }
      );
      try {
        await deleteMessage(messageId);
        return true;
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete the message.");
        return false;
      }
    },
    [messages, mutate, toast]
  );

  return { messages, loadState, send, edit, remove, typingAgentIds: typingAgentIds ?? [] };
}
