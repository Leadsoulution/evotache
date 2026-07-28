"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPurchaseItem,
  deletePurchaseItem,
  fetchPurchaseItems,
  updatePurchaseItem,
  updatePurchaseItemAssignees,
  updatePurchaseItemExcludedUsers,
} from "@/services/purchaseApi";
import type { PurchaseItemScope } from "@/services/purchaseApi";
import { useToast } from "@/components/ui/Toast";
import type { PurchaseItem } from "@/types/purchase";

type LoadState = "loading" | "success" | "error";

interface UsePurchaseItemsResult {
  items: PurchaseItem[];
  loadState: LoadState;
  addItem: () => Promise<void>;
  updateItemValues: (id: string, values: Record<string, string>) => Promise<void>;
  updateItemAssignees: (id: string, assigneeIds: string[]) => Promise<void>;
  updateItemExcludedUsers: (id: string, excludedUserIds: string[]) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export function usePurchaseItems(scope: PurchaseItemScope | null): UsePurchaseItemsResult {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();
  const itemsRef = useRef<PurchaseItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const userId = scope?.userId;
  const isAdmin = scope?.isAdmin ?? false;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchPurchaseItems({ userId, isAdmin })
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setLoadState("success");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, isAdmin]);

  const addItem = useCallback(async () => {
    try {
      const created = await createPurchaseItem();
      setItems((current) => [...current, created]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add row.");
    }
  }, [toast]);

  const updateItemValues = useCallback(
    async (id: string, values: Record<string, string>) => {
      const previous = itemsRef.current;
      setItems(previous.map((item) => (item.id === id ? { ...item, values: { ...item.values, ...values }, updatedAt: new Date().toISOString() } : item)));
      try {
        const updated = await updatePurchaseItem(id, values);
        setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      } catch (err) {
        setItems(previous);
        toast.error(err instanceof Error ? err.message : "Failed to save the change.");
      }
    },
    [toast]
  );

  const updateItemAssignees = useCallback(
    async (id: string, assigneeIds: string[]) => {
      const previous = itemsRef.current;
      setItems(previous.map((item) => (item.id === id ? { ...item, assigneeIds, updatedAt: new Date().toISOString() } : item)));
      try {
        const updated = await updatePurchaseItemAssignees(id, assigneeIds);
        setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      } catch (err) {
        setItems(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update assignees.");
      }
    },
    [toast]
  );

  const updateItemExcludedUsers = useCallback(
    async (id: string, excludedUserIds: string[]) => {
      const previous = itemsRef.current;
      setItems(previous.map((item) => (item.id === id ? { ...item, excludedUserIds, updatedAt: new Date().toISOString() } : item)));
      try {
        const updated = await updatePurchaseItemExcludedUsers(id, excludedUserIds);
        setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      } catch (err) {
        setItems(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update exclusions.");
      }
    },
    [toast]
  );

  const removeItem = useCallback(
    async (id: string) => {
      const previous = itemsRef.current;
      setItems(previous.filter((item) => item.id !== id));
      try {
        await deletePurchaseItem(id);
      } catch (err) {
        setItems(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete row.");
      }
    },
    [toast]
  );

  return { items, loadState, addItem, updateItemValues, updateItemAssignees, updateItemExcludedUsers, removeItem };
}
