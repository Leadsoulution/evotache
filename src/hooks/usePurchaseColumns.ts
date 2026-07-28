"use client";

import { useCallback, useEffect, useState } from "react";
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

export function usePurchaseColumns(): UsePurchaseColumnsResult {
  const [columns, setColumns] = useState<PurchaseColumnDef[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchPurchaseColumns()
      .then((list) => {
        if (cancelled) return;
        setColumns(list);
        setLoadState("success");
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addColumn = useCallback(
    async (input: { name: string; type: PurchaseColumnType; options: PurchaseDropdownOption[] }) => {
      try {
        const created = await createPurchaseColumn(input);
        setColumns((current) => [...current, created]);
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add column.");
        return false;
      }
    },
    [toast]
  );

  const renameColumn = useCallback(
    async (id: string, name: string) => {
      const previous = columns;
      setColumns((current) => current.map((c) => (c.id === id ? { ...c, name } : c)));
      try {
        await updatePurchaseColumn(id, { name });
      } catch (err) {
        setColumns(previous);
        toast.error(err instanceof Error ? err.message : "Failed to rename column.");
      }
    },
    [columns, toast]
  );

  const setColumnOptions = useCallback(
    async (id: string, options: PurchaseDropdownOption[]) => {
      const previous = columns;
      setColumns((current) => current.map((c) => (c.id === id ? { ...c, options } : c)));
      try {
        await updatePurchaseColumn(id, { options });
      } catch (err) {
        setColumns(previous);
        toast.error(err instanceof Error ? err.message : "Failed to update options.");
      }
    },
    [columns, toast]
  );

  const removeColumn = useCallback(
    async (id: string) => {
      const previous = columns;
      setColumns((current) => current.filter((c) => c.id !== id));
      try {
        await deletePurchaseColumn(id);
      } catch (err) {
        setColumns(previous);
        toast.error(err instanceof Error ? err.message : "Failed to delete column.");
      }
    },
    [columns, toast]
  );

  return { columns, loadState, addColumn, renameColumn, setColumnOptions, removeColumn };
}
