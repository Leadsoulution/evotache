"use client";

import { useCallback, useEffect, useState } from "react";
import { rankProducts } from "@/lib/productRanking";
import type { ColumnMapping, RankedProduct } from "@/types/googleSheet";

type LoadState = "idle" | "loading" | "success" | "error";

interface SheetDataResponse {
  headers: string[];
  rows: Record<string, string>[];
}

async function parseResponse(res: Response): Promise<SheetDataResponse> {
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? "Failed to load products.");
  return data as SheetDataResponse;
}

export function useSheetProducts(columnMapping: ColumnMapping | null, enabled: boolean) {
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/social/sheet-data")
      .then(parseResponse)
      .then((data) => {
        if (cancelled) return;
        setRawRows(data.rows ?? []);
        setLastSyncedAt(new Date());
        setLoadState("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Failed to load products.");
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const refetch = useCallback(() => {
    setLoadState("loading");
    setErrorMessage(null);
    fetch("/api/social/sheet-data")
      .then(parseResponse)
      .then((data) => {
        setRawRows(data.rows ?? []);
        setLastSyncedAt(new Date());
        setLoadState("success");
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load products.");
        setLoadState("error");
      });
  }, []);

  const rankedProducts: RankedProduct[] = columnMapping ? rankProducts(rawRows, columnMapping) : [];

  return { rankedProducts, loadState, errorMessage, lastSyncedAt, refetch };
}
