"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { createPurchaseColumn, deletePurchaseColumn, fetchPurchaseColumns, updatePurchaseColumn } from "@/services/purchaseApi";
import { useToast } from "@/components/ui/Toast";
import type { PurchaseColumnDef, PurchaseColumnType, PurchaseDropdownOption } from "@/types/purchase";

type LoadState = "loading" | "success" | "error";

interface UsePurchaseColumnsResult {
  columns: PurchaseColumnDef[];
  loadState: LoadState;
  addColumn: (input: { name: string; type: PurchaseColumnType; options: PurchaseDropdownOption[] }) => Promise<boolean>;
  renameColumn: (id: string, name: string) => Promise<void>;
  setColumnOptions: (id: string, options: PurchaseDropdownOption[]) => Promise<void>;
  removeColumn: (id: string) => Promise<void>;
}

const PURCHASE_COLUMNS_KEY = "purchase-columns";

export function usePurchaseColumns(): UsePurchaseColumnsResult {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<PurchaseColumnDef[]>(PURCHASE_COLUMNS_KEY, fetchPurchaseColumns);
  const columns = useMemo(() => data ?? [], [data]);
  const loadState: LoadState = error ? "error" : isLoading ? "loading" : "success";

  const addColumn = useCallback(
    async (input: { name: string; type: PurchaseColumnType; options: PurchaseDropdownOption[] }) => {
      try {
        const created = await createPurchaseColumn(input);
        await mutate([...columns, created], { revalidate: false });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add column.");
        return false;
      }
    },
    [columns, mutate, toast]
  );

  const renameColumn = useCallback(
    async (id: string, name: string) => {
      const previous = columns;
      await mutate(previous.map((c) => (c.id === id ? { ...c, name } : c)), { revalidate: false });
      try {
        await updatePurchaseColumn(id, { name });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to rename column.");
      }
    },
    [columns, mutate, toast]
  );

  const setColumnOptions = useCallback(
    async (id: string, options: PurchaseDropdownOption[]) => {
      const previous = columns;
      await mutate(previous.map((c) => (c.id === id ? { ...c, options } : c)), { revalidate: false });
      try {
        await updatePurchaseColumn(id, { options });
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to update options.");
      }
    },
    [columns, mutate, toast]
  );

  const removeColumn = useCallback(
    async (id: string) => {
      const previous = columns;
      await mutate(previous.filter((c) => c.id !== id), { revalidate: false });
      try {
        await deletePurchaseColumn(id);
      } catch (err) {
        await mutate(previous, { revalidate: false });
        toast.error(err instanceof Error ? err.message : "Failed to delete column.");
      }
    },
    [columns, mutate, toast]
  );

  return { columns, loadState, addColumn, renameColumn, setColumnOptions, removeColumn };
}
