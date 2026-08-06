"use client";

import useSWR from "swr";
import { fetchBiometricEvents } from "@/services/biometricApi";
import type { BiometricEventsResponse } from "@/services/biometricApi";

// No manual "sync now" button on this page — data arrives via a local
// script pushing to /api/biometric/ingest, so this poll is the only way
// the page picks up fresh data on its own. Matches the "toutes les
// minutes" text shown in the page header.
const POLL_MS = 60_000;

export function useBiometricEvents() {
  const { data, error, isLoading, mutate } = useSWR<BiometricEventsResponse>("biometric-events", fetchBiometricEvents, { refreshInterval: POLL_MS });
  return {
    events: data?.events ?? [],
    stats: data?.stats ?? { total: 0, checkIns: 0, checkOuts: 0, uniqueEmployees: 0 },
    loading: isLoading,
    error: Boolean(error),
    refetch: () => mutate(),
  };
}
