"use client";

import { useCallback, useState } from "react";
import { EMPTY_GLOBAL_FILTERS } from "@/lib/globalFilters";
import type { GlobalFilters } from "@/lib/globalFilters";

export interface UseGlobalFiltersResult {
  filters: GlobalFilters;
  setTeamIds: (value: string[]) => void;
  setUserIds: (value: string[]) => void;
  setProjectIds: (value: string[]) => void;
  setPriorities: (value: string[]) => void;
  setStatuses: (value: string[]) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  selectUser: (userId: string | null) => void;
  clearAll: () => void;
}

export function useGlobalFilters(): UseGlobalFiltersResult {
  const [filters, setFilters] = useState<GlobalFilters>(EMPTY_GLOBAL_FILTERS);

  const setTeamIds = useCallback((value: string[]) => setFilters((f) => ({ ...f, teamIds: value })), []);
  const setUserIds = useCallback((value: string[]) => setFilters((f) => ({ ...f, userIds: value })), []);
  const setProjectIds = useCallback((value: string[]) => setFilters((f) => ({ ...f, projectIds: value })), []);
  const setPriorities = useCallback((value: string[]) => setFilters((f) => ({ ...f, priorities: value })), []);
  const setStatuses = useCallback((value: string[]) => setFilters((f) => ({ ...f, statuses: value })), []);
  const setDateRange = useCallback((from: string | null, to: string | null) => setFilters((f) => ({ ...f, dateFrom: from, dateTo: to })), []);

  // Shared by the horizontal user-avatar strip: "All" clears it, clicking a
  // person sets it to exactly that one id (a single-select shortcut for the
  // same userIds dimension the User filter dropdown edits).
  const selectUser = useCallback((userId: string | null) => setFilters((f) => ({ ...f, userIds: userId ? [userId] : [] })), []);

  const clearAll = useCallback(() => setFilters(EMPTY_GLOBAL_FILTERS), []);

  return { filters, setTeamIds, setUserIds, setProjectIds, setPriorities, setStatuses, setDateRange, selectUser, clearAll };
}
