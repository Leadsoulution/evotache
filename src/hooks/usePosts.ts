"use client";

import { useCallback, useEffect, useState } from "react";
import { createPost, deletePost, fetchPosts, updatePost } from "@/services/postApi";
import { useToast } from "@/components/ui/Toast";
import type { ContentPriority, ContentStageStatus, Post } from "@/types/socialMedia";

type LoadState = "loading" | "success" | "error";

interface PostInput {
  title: string;
  client: string;
  assigneeId: string | null;
  status: ContentStageStatus;
  priority: ContentPriority;
  publishingDate: string | null;
  notes: string;
  link: string | null;
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchPosts()
      .then((list) => {
        if (cancelled) return;
        setPosts(list);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addPost = useCallback(
    async (input: PostInput) => {
      try {
        const created = await createPost(input);
        setPosts((current) => [...current, created]);
        toast.success(`${created.title} was added.`);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create the post.");
        return false;
      }
    },
    [toast]
  );

  const editPost = useCallback(
    async (id: string, patch: Partial<Omit<Post, "id" | "createdAt">>) => {
      const previous = posts;
      setPosts((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      try {
        await updatePost(id, patch);
      } catch (err) {
        setPosts(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update the post.");
      }
    },
    [posts, toast]
  );

  const removePost = useCallback(
    async (id: string) => {
      const previous = posts;
      setPosts((current) => current.filter((p) => p.id !== id));
      try {
        await deletePost(id);
      } catch (err) {
        setPosts(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete the post.");
      }
    },
    [posts, toast]
  );

  return { posts, loadState, addPost, editPost, removePost };
}
