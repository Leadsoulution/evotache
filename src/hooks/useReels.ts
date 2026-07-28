"use client";

import { useCallback, useEffect, useState } from "react";
import { createReel, deleteReel, fetchReels, updateReel } from "@/services/reelApi";
import { useToast } from "@/components/ui/Toast";
import type { ApprovalStatus, ContentPriority, Reel, ReelEditingStatus } from "@/types/socialMedia";

type LoadState = "loading" | "success" | "error";

interface ReelInput {
  title: string;
  client: string;
  assigneeId: string | null;
  script: string;
  shootingDate: string | null;
  editingStatus: ReelEditingStatus;
  approvalStatus: ApprovalStatus;
  publishingDate: string | null;
  priority: ContentPriority;
  notes: string;
  link: string | null;
}

export function useReels() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchReels()
      .then((list) => {
        if (cancelled) return;
        setReels(list);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addReel = useCallback(
    async (input: ReelInput) => {
      try {
        const created = await createReel(input);
        setReels((current) => [...current, created]);
        toast.success(`${created.title} was added.`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create the reel.");
        return false;
      }
    },
    [toast]
  );

  const editReel = useCallback(
    async (id: string, patch: Partial<Omit<Reel, "id" | "createdAt">>) => {
      const previous = reels;
      setReels((current) => current.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      try {
        await updateReel(id, patch);
      } catch (err) {
        setReels(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update the reel.");
      }
    },
    [reels, toast]
  );

  const removeReel = useCallback(
    async (id: string) => {
      const previous = reels;
      setReels((current) => current.filter((r) => r.id !== id));
      try {
        await deleteReel(id);
      } catch (err) {
        setReels(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete the reel.");
      }
    },
    [reels, toast]
  );

  return { reels, loadState, addReel, editReel, removeReel };
}
