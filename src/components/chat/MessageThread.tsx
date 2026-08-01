"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { Avatar } from "@/components/ui/Avatar";
import type { ConversationType, Message, MessageAttachment } from "@/types/chat";
import type { AppUser } from "@/types/user";

interface MessageThreadProps {
  messages: Message[];
  users: AppUser[];
  currentUserId: string;
  conversationType: ConversationType;
  typingUsers?: AppUser[];
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function MessageThread({ messages, users, currentUserId, conversationType, typingUsers = [], onEdit, onDelete }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [openAttachment, setOpenAttachment] = useState<MessageAttachment | null>(null);
  const usersById = new Map(users.map((u) => [u.id, u]));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typingUsers.length]);

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        <p>No messages yet. Say hello 👋</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-3">
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDateDivider = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          const showSenderName = conversationType === "group" && (!previous || previous.senderId !== message.senderId);
          const isOwn = message.senderId === currentUserId;
          return (
            <div key={message.id} className="flex flex-col gap-3">
              {showDateDivider && (
                <div className="my-1 flex items-center justify-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {dayLabel(message.createdAt)}
                  </span>
                </div>
              )}
              <MessageBubble
                message={message}
                sender={usersById.get(message.senderId) ?? null}
                isOwn={isOwn}
                showSenderName={showSenderName}
                onOpenAttachment={setOpenAttachment}
                onEdit={isOwn ? onEdit : undefined}
                onDelete={isOwn ? onDelete : undefined}
              />
            </div>
          );
        })}
        {typingUsers.map((typingUser) => (
          <div key={typingUser.id} className="flex items-end gap-2">
            <Avatar name={typingUser.name} color={typingUser.color} photoDataUrl={typingUser.photoDataUrl} size="xs" className="mb-1" />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5 dark:bg-slate-800">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <AttachmentLightbox attachment={openAttachment} onClose={() => setOpenAttachment(null)} />
    </div>
  );
}
