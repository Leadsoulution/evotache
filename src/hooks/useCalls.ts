"use client";

import useSWR from "swr";
import { fetchCalls } from "@/services/callApi";
import type { CallsResponse } from "@/services/callApi";

const POLL_MS = 30_000;

export function useCalls() {
  const { data, error, isLoading, mutate } = useSWR<CallsResponse>("phone-calls", fetchCalls, { refreshInterval: POLL_MS });
  return {
    calls: data?.calls ?? [],
    stats: data?.stats ?? { total: 0, answered: 0, missed: 0, avgTalk: 0, totalTalk: 0 },
    loading: isLoading,
    error: Boolean(error),
    refetch: () => mutate(),
  };
}
