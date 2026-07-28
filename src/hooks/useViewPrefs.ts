"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getViewPrefs, saveViewPrefs } from "@/services/viewPrefsApi";
import type { ViewPrefs } from "@/services/viewPrefsApi";

const EMPTY_PREFS: ViewPrefs = { hiddenColumnIds: [], columnWidths: {}, columnOrder: [], pageSize: 25 };

export function useViewPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ViewPrefs>(EMPTY_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getViewPrefs(user.id).then((loadedPrefs) => {
      if (cancelled) return;
      setPrefs(loadedPrefs);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleColumn = useCallback(
    (columnId: string) => {
      if (!user) return;
      setPrefs((current) => {
        const hiddenColumnIds = current.hiddenColumnIds.includes(columnId)
          ? current.hiddenColumnIds.filter((id) => id !== columnId)
          : [...current.hiddenColumnIds, columnId];
        const next = { ...current, hiddenColumnIds };
        saveViewPrefs(user.id, next);
        return next;
      });
    },
    [user]
  );

  // `persist` is false while a resize drag is in progress (live visual
  // feedback only) and true once on release, so we don't hammer localStorage
  // on every pixel of mouse movement.
  const setColumnWidth = useCallback(
    (columnId: string, width: number, persist: boolean) => {
      if (!user) return;
      setPrefs((current) => {
        const next = { ...current, columnWidths: { ...current.columnWidths, [columnId]: Math.round(width) } };
        if (persist) saveViewPrefs(user.id, next);
        return next;
      });
    },
    [user]
  );

  const isColumnVisible = useCallback((columnId: string) => !prefs.hiddenColumnIds.includes(columnId), [prefs.hiddenColumnIds]);

  const reorderColumns = useCallback(
    (nextOrder: string[]) => {
      if (!user) return;
      setPrefs((current) => {
        const next = { ...current, columnOrder: nextOrder };
        saveViewPrefs(user.id, next);
        return next;
      });
    },
    [user]
  );

  const setPageSize = useCallback(
    (pageSize: number | "all") => {
      if (!user) return;
      setPrefs((current) => {
        const next = { ...current, pageSize };
        saveViewPrefs(user.id, next);
        return next;
      });
    },
    [user]
  );

  return {
    hiddenColumnIds: prefs.hiddenColumnIds,
    columnWidths: prefs.columnWidths,
    columnOrder: prefs.columnOrder,
    pageSize: prefs.pageSize,
    isColumnVisible,
    toggleColumn,
    setColumnWidth,
    reorderColumns,
    setPageSize,
    loaded,
  };
}
