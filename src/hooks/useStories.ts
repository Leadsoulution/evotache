"use client";

import { useCallback, useEffect, useState } from "react";
import { createStory, deleteStory, fetchStories, updateStory } from "@/services/storyApi";
import { useToast } from "@/components/ui/Toast";
import type { AdPlatform, ContentStageStatus, Story } from "@/types/socialMedia";

type LoadState = "loading" | "success" | "error";

interface StoryInput {
  title: string;
  client: string;
  platform: AdPlatform;
  dueDate: string | null;
  status: ContentStageStatus;
  assigneeId: string | null;
  notes: string;
  link: string | null;
}

export function useStories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchStories()
      .then((list) => {
        if (cancelled) return;
        setStories(list);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addStory = useCallback(
    async (input: StoryInput) => {
      try {
        const created = await createStory(input);
        setStories((current) => [...current, created]);
        toast.success(`${created.title} was added.`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create the story.");
        return false;
      }
    },
    [toast]
  );

  const editStory = useCallback(
    async (id: string, patch: Partial<Omit<Story, "id" | "createdAt">>) => {
      const previous = stories;
      setStories((current) => current.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      try {
        await updateStory(id, patch);
      } catch (err) {
        setStories(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update the story.");
      }
    },
    [stories, toast]
  );

  const removeStory = useCallback(
    async (id: string) => {
      const previous = stories;
      setStories((current) => current.filter((s) => s.id !== id));
      try {
        await deleteStory(id);
      } catch (err) {
        setStories(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete the story.");
      }
    },
    [stories, toast]
  );

  return { stories, loadState, addStory, editStory, removeStory };
}
