"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { deleteMessage, editMessage, fetchMessages, fetchTypingAgentIds, markConversationRead, sendMessage } from "@/services/chatApi";
import { useToast } from "@/components/ui/Toast";

const POLL_MS = 4_000;
// Checked much more often than messages: an agent reply (esp. gpt-4o-mini
// with no tool calls) can land in 1-2s, faster than POLL_MS, so a typing
// bubble polled on the same cadence is easily never observed at all.
const TYPING_POLL_MS = 1_200;
// Safety net: if an agent has been "typing" longer than this, stop showing
// it client-side even if the server still reports it — covers the case
// where a stuck/crashed turn never clears its own flag, so the bubble can
// never look permanently frozen no matter what went wrong server-side.
const MAX_TYPING_DISPLAY_MS = 60_000;

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

  const { data: rawTypingAgentIds, mutate: mutateTyping } = useSWR(
    conversationId ? ["chat-typing", conversationId] : null,
    () => fetchTypingAgentIds(conversationId as string),
    { refreshInterval: TYPING_POLL_MS }
  );

  // The app disables SWR's revalidateOnFocus globally (avoids refetch storms
  // elsewhere), but that means coming back to a backgrounded tab/PWA after a
  // push notification otherwise waits for the next poll tick — which can be
  // way more than POLL_MS if the browser throttled timers while hidden.
  // Force an immediate refresh the moment the chat is actually looked at.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      void mutate();
      void mutateTyping();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [mutate, mutateTyping]);

  // Tracks when each agentId first appeared in rawTypingAgentIds, so
  // typingAgentIds below can hide it past MAX_TYPING_DISPLAY_MS regardless
  // of what the server still reports. Naturally resets on conversation
  // switches too, since rawTypingAgentIds itself goes empty while the new
  // SWR key loads.
  const typingSinceRef = useRef<Map<string, number>>(new Map());
  const [typingAgentIds, setTypingAgentIds] = useState<string[]>([]);
  useEffect(() => {
    const ids = rawTypingAgentIds ?? [];
    const now = Date.now();
    const since = typingSinceRef.current;
    for (const id of Array.from(since.keys())) {
      if (!ids.includes(id)) since.delete(id);
    }
    for (const id of ids) {
      if (!since.has(id)) since.set(id, now);
    }
    setTypingAgentIds(ids.filter((id) => now - (since.get(id) ?? now) < MAX_TYPING_DISPLAY_MS));
  }, [rawTypingAgentIds]);

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

  return { messages, loadState, send, edit, remove, typingAgentIds };
}
