"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { ColumnMapping, GoogleSheetStatus } from "@/types/googleSheet";

export function useGoogleSheetConfig() {
  const [status, setStatus] = useState<GoogleSheetStatus | null>(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/social/sheet-config")
      .then((res) => res.json())
      .then((data: GoogleSheetStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const saveConnection = useCallback(
    async (webAppUrl: string, token: string) => {
      try {
        const res = await fetch("/api/social/sheet-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ webAppUrl, token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to save.");
        setStatus(data);
        toast.success("Google Sheet connected.");
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save the connection.");
        return false;
      }
    },
    [toast]
  );

  const saveMapping = useCallback(
    async (columnMapping: ColumnMapping, productsPerDay: number) => {
      try {
        const res = await fetch("/api/social/sheet-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnMapping, productsPerDay }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to save.");
        setStatus(data);
        toast.success("Column mapping saved.");
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save the mapping.");
        return false;
      }
    },
    [toast]
  );

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch("/api/social/sheet-config", { method: "DELETE" });
      const data = await res.json();
      setStatus(data);
      toast.success("Google Sheet disconnected.");
    } catch {
      toast.error("Failed to disconnect.");
    }
  }, [toast]);

  return { status, saveConnection, saveMapping, disconnect };
}
