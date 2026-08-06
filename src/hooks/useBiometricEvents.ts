"use client";

import useSWR from "swr";
import { fetchBiometricEvents } from "@/services/biometricApi";
import type { BiometricEventsResponse } from "@/services/biometricApi";

const POLL_MS = 30_000;

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
