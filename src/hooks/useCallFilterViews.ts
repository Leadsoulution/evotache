"use client";

import useSWR from "swr";
import { fetchCallFilterViews } from "@/services/callFilterViewApi";
import type { CallFilterView } from "@/types/callFilterView";

export function useCallFilterViews() {
  const { data, mutate } = useSWR<CallFilterView[]>("call-filter-views", fetchCallFilterViews);
  return { views: data ?? [], refetch: () => mutate() };
}
