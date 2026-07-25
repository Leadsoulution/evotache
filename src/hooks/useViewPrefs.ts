"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getViewPrefs, saveViewPrefs } from "@/services/viewPrefsApi";

export function useViewPrefs() {
  const { user } = useAuth();
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getViewPrefs(user.id).then((prefs) => {
      if (cancelled) return;
      setHiddenColumnIds(prefs.hiddenColumnIds);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleColumn = useCallback(
    (columnId: string) => {
      if (!user) return;
      setHiddenColumnIds((current) => {
        const next = current.includes(columnId) ? current.filter((id) => id !== columnId) : [...current, columnId];
        saveViewPrefs(user.id, { hiddenColumnIds: next });
        return next;
      });
    },
    [user]
  );

  const isColumnVisible = useCallback((columnId: string) => !hiddenColumnIds.includes(columnId), [hiddenColumnIds]);

  return { hiddenColumnIds, isColumnVisible, toggleColumn, loaded };
}
