"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createLibraryDoc, deleteLibraryDoc, fetchLibraryDocs, reorderLibraryDocs, updateLibraryDoc } from "@/services/libraryApi";
import { useToast } from "@/components/ui/Toast";
import type { LibraryDoc } from "@/types/library";

type LoadState = "loading" | "success" | "error";

interface UseLibraryResult {
  docs: LibraryDoc[];
  loadState: LoadState;
  errorMessage: string | null;
  refetch: () => void;
  addDoc: (title: string) => Promise<LibraryDoc | null>;
  editDoc: (id: string, patch: Partial<Pick<LibraryDoc, "title" | "content">>) => Promise<boolean>;
  removeDoc: (id: string) => Promise<void>;
  reorderDocs: (orderedIds: string[]) => Promise<void>;
}

export function useLibrary(): UseLibraryResult {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const docsRef = useRef<LibraryDoc[]>([]);

  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);

  const load = useCallback(() => {
    setLoadState("loading");
    setErrorMessage(null);
    fetchLibraryDocs()
      .then((list) => {
        setDocs(list);
        setLoadState("success");
      })
      .catch((err: unknown) => {
        setLoadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchLibraryDocs()
      .then((list) => {
        if (cancelled) return;
        setDocs(list);
        setLoadState("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addDoc = useCallback(
    async (title: string) => {
      try {
        const created = await createLibraryDoc({ title, content: "" });
        setDocs((current) => [...current, created]);
        return created;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add document.");
        return null;
      }
    },
    [toast]
  );

  const editDoc = useCallback(
    async (id: string, patch: Partial<Pick<LibraryDoc, "title" | "content">>) => {
      const previous = docsRef.current;
      setDocs((current) => current.map((d) => (d.id === id ? { ...d, ...patch } : d)));
      try {
        const updated = await updateLibraryDoc(id, patch);
        setDocs((current) => current.map((d) => (d.id === id ? updated : d)));
        return true;
      } catch (err) {
        setDocs(previous);
        toast.error(err instanceof Error ? err.message : "Failed to save changes.");
        return false;
      }
    },
    [toast]
  );

  const removeDoc = useCallback(
    async (id: string) => {
      const previous = docsRef.current;
      setDocs(previous.filter((d) => d.id !== id).map((d, index) => ({ ...d, order: index })));
      try {
        await deleteLibraryDoc(id);
      } catch (err) {
        setDocs(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete document.");
      }
    },
    [toast]
  );

  const reorderDocs = useCallback(
    async (orderedIds: string[]) => {
      const previous = docsRef.current;
      const byId = new Map(previous.map((d) => [d.id, d]));
      const reordered = orderedIds.map((id, index) => ({ ...(byId.get(id) as LibraryDoc), order: index }));
      setDocs(reordered);
      try {
        await reorderLibraryDocs(orderedIds);
      } catch (err) {
        setDocs(previous);
        toast.error(err instanceof Error ? err.message : "Failed to reorder documents.");
      }
    },
    [toast]
  );

  return { docs, loadState, errorMessage, refetch: load, addDoc, editDoc, removeDoc, reorderDocs };
}
