"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PlusIcon, SearchIcon, UsersIcon } from "@/components/ui/icons";
import { formatRelativeTime } from "@/lib/date";
import { getConversationDisplay } from "@/lib/chatDisplay";
import { cn } from "@/lib/cn";
import type { Conversation } from "@/types/chat";
import type { AppUser } from "@/types/user";

interface ConversationListProps {
  conversations: Conversation[];
  unreadCounts: Record<string, number>;
  users: AppUser[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNewConversation: () => void;
}

export function ConversationList({ conversations, unreadCounts, users, currentUserId, selectedId, onSelect, onNewConversation }: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const display = getConversationDisplay(c, users, currentUserId);
    return display.name.toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <div className="flex h-full flex-col border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Chat</h1>
        <button
          type="button"
          onClick={onNewConversation}
          aria-label="New chat"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <label className="relative mx-3 mb-2 block">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search conversations…"
          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
        />
      </label>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">No conversations yet</p>}
        {filtered.map((conversation) => {
          const display = getConversationDisplay(conversation, users, currentUserId);
          const unread = unreadCounts[conversation.id] ?? 0;
          const active = conversation.id === selectedId;
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left",
                active ? "bg-indigo-50 dark:bg-indigo-950" : "hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {display.photoDataUrl || conversation.type === "direct" ? (
                <Avatar name={display.name} color={display.color} photoDataUrl={display.photoDataUrl} size="md" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  <UsersIcon className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", unread > 0 ? "font-semibold text-slate-900 dark:text-slate-50" : "font-medium text-slate-700 dark:text-slate-200")}>
                    {display.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(conversation.lastMessageAt)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-xs", unread > 0 ? "font-medium text-slate-600 dark:text-slate-300" : "text-slate-400")}>
                    {conversation.lastMessagePreview ?? "No messages yet"}
                  </span>
                  {unread > 0 && (
                    <span className="flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
