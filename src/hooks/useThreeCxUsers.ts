"use client";

import useSWR from "swr";
import { fetchThreeCxUserOverrides } from "@/services/threeCxUserApi";
import type { ThreeCxUserOverride } from "@/lib/callStats";

export function useThreeCxUsers() {
  const { data, mutate } = useSWR<ThreeCxUserOverride[]>("threecx-user-overrides", fetchThreeCxUserOverrides);
  return { overrides: data ?? [], refetch: () => mutate() };
}
