"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
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

const PURCHASE_ITEMS_KEY = "purchase-items";

export function usePurchaseItems(scope: PurchaseItemScope | null): UsePurchaseItemsResult {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<PurchaseItem[]>(
    scope ? PURCHASE_ITEMS_KEY : null,
    () => fetchPurchaseItems(scope as PurchaseItemScope)
  );
  const items = useMemo(() => data ?? [], [data]);
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";

  const addItem = useCallback(async () => {
    try {
      const created = await createPurchaseItem();
      await mutate([...items, created], { revalidate: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add row.");
    }
  }, [items, mutate, toast]);

  const updateItemValues = useCallback(
    async (id: string, values: Record<string, string>) => {
      const previous = items;
      await mutate(
        previous.map((item) => (item.id === id ? { ...item, values: { ...item.values, ...values }, updatedAt: new Date().toISOString() } : item)),
        { revalidate: false }
      );
      try {
        const updated = await updatePurchaseItem(id, values);
        await mutate((current) => (current ?? previous).map((item) => (item.id === id ? updated : item)), { revalidate: false });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to save the change.");
      }
    },
    [items, mutate, toast]
  );

  const updateItemAssignees = useCallback(
    async (id: string, assigneeIds: string[]) => {
      const previous = items;
      await mutate(previous.map((item) => (item.id === id ? { ...item, assigneeIds, updatedAt: new Date().toISOString() } : item)), { revalidate: false });
      try {
        const updated = await updatePurchaseItemAssignees(id, assigneeIds);
        await mutate((current) => (current ?? previous).map((item) => (item.id === id ? updated : item)), { revalidate: false });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update assignees.");
      }
    },
    [items, mutate, toast]
  );

  const updateItemExcludedUsers = useCallback(
    async (id: string, excludedUserIds: string[]) => {
      const previous = items;
      await mutate(previous.map((item) => (item.id === id ? { ...item, excludedUserIds, updatedAt: new Date().toISOString() } : item)), {
        revalidate: false,
      });
      try {
        const updated = await updatePurchaseItemExcludedUsers(id, excludedUserIds);
        await mutate((current) => (current ?? previous).map((item) => (item.id === id ? updated : item)), { revalidate: false });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update exclusions.");
      }
    },
    [items, mutate, toast]
  );

  const removeItem = useCallback(
    async (id: string) => {
      const previous = items;
      await mutate(previous.filter((item) => item.id !== id), { revalidate: false });
      try {
        await deletePurchaseItem(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete row.");
      }
    },
    [items, mutate, toast]
  );

  return { items, loadState, addItem, updateItemValues, updateItemAssignees, updateItemExcludedUsers, removeItem };
}
