"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { ConversationList } from "./ConversationList";
import { NewConversationDialog } from "./NewConversationDialog";
import { MessageThread } from "./MessageThread";
import { MessageComposer } from "./MessageComposer";
import { GroupInfoPanel } from "./GroupInfoPanel";
import { Avatar } from "@/components/ui/Avatar";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { ArrowLeftIcon, DotsHorizontalIcon, UsersIcon } from "@/components/ui/icons";
import { getConversationDisplay } from "@/lib/chatDisplay";
import { addParticipants, removeParticipant, renameGroup, updateGroupAvatar } from "@/services/chatApi";
import { cn } from "@/lib/cn";
import type { Conversation } from "@/types/chat";

export function ChatView() {
  const { user } = useAuth();
  const { users } = useUsers();
  const { conversations, unreadCounts, loadState, refetch, startDirectConversation, startGroup } = useConversations();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [showListOnMobile, setShowListOnMobile] = useState(true);

  const liveSelected = selectedConversation ? (conversations.find((c) => c.id === selectedConversation.id) ?? selectedConversation) : null;
  const { messages, send } = useMessages(liveSelected?.id ?? null);

  async function handleSend(text: string, attachments: Parameters<typeof send>[1]) {
    const ok = await send(text, attachments);
    if (ok) refetch();
    return ok;
  }

  if (!user) return null;
  const currentUserId = user.id;

  function selectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    setShowListOnMobile(false);
  }

  async function handleRename(name: string) {
    if (!liveSelected) return;
    await renameGroup(liveSelected.id, name);
    refetch();
  }
  async function handleUpdateAvatar(avatarDataUrl: string | null) {
    if (!liveSelected) return;
    await updateGroupAvatar(liveSelected.id, avatarDataUrl);
    refetch();
  }
  async function handleAddMembers(userIds: string[]) {
    if (!liveSelected) return;
    await addParticipants(liveSelected.id, userIds);
    refetch();
  }
  async function handleRemoveMember(userId: string) {
    if (!liveSelected) return;
    await removeParticipant(liveSelected.id, userId);
    refetch();
  }
  async function handleLeave() {
    if (!liveSelected) return;
    await removeParticipant(liveSelected.id, currentUserId);
    setInfoPanelOpen(false);
    setSelectedConversation(null);
    refetch();
  }

  const display = liveSelected ? getConversationDisplay(liveSelected, users, currentUserId) : null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className={cn("w-full sm:w-80 sm:shrink-0", !showListOnMobile && "hidden sm:block")}>
        {loadState === "loading" ? (
          <div className="p-4">
            <TaskListSkeleton />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            unreadCounts={unreadCounts}
            users={users}
            currentUserId={currentUserId}
            selectedId={liveSelected?.id ?? null}
            onSelect={selectConversation}
            onNewConversation={() => setDialogOpen(true)}
          />
        )}
      </div>

      <div className={cn("flex flex-1 flex-col", showListOnMobile && "hidden sm:flex")}>
        {!liveSelected && <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select a conversation or start a new one.</div>}

        {liveSelected && display && (
          <>
            <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <button type="button" className="shrink-0 sm:hidden" onClick={() => setShowListOnMobile(true)} aria-label="Back to conversations">
                <ArrowLeftIcon className="h-4 w-4 text-slate-500" />
              </button>
              <button
                type="button"
                onClick={() => liveSelected.type === "group" && setInfoPanelOpen(true)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                {liveSelected.type === "direct" || display.photoDataUrl ? (
                  <Avatar name={display.name} color={display.color} photoDataUrl={display.photoDataUrl} size="md" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    <UsersIcon className="h-4 w-4" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{display.name}</span>
                  {liveSelected.type === "group" && <span className="block text-xs text-slate-400">{liveSelected.participantIds.length} members</span>}
                </span>
              </button>
              {liveSelected.type === "group" && (
                <button
                  type="button"
                  onClick={() => setInfoPanelOpen(true)}
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Group info"
                >
                  <DotsHorizontalIcon className="h-4 w-4" />
                </button>
              )}
            </header>

            <MessageThread messages={messages} users={users} currentUserId={currentUserId} conversationType={liveSelected.type} />
            <MessageComposer onSend={handleSend} />
          </>
        )}
      </div>

      <NewConversationDialog
        open={dialogOpen}
        users={users}
        currentUserId={currentUserId}
        onClose={() => setDialogOpen(false)}
        onStartDirect={startDirectConversation}
        onStartGroup={startGroup}
        onCreated={selectConversation}
      />

      <GroupInfoPanel
        open={infoPanelOpen && liveSelected?.type === "group"}
        conversation={liveSelected}
        users={users}
        currentUserId={currentUserId}
        onClose={() => setInfoPanelOpen(false)}
        onRename={handleRename}
        onUpdateAvatar={handleUpdateAvatar}
        onAddMembers={handleAddMembers}
        onRemoveMember={handleRemoveMember}
        onLeave={handleLeave}
      />
    </div>
  );
}
