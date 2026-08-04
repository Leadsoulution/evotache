"use client";

import useSWR from "swr";
import { fetchCalls } from "@/services/callApi";
import type { PhoneCall } from "@/types/call";

const POLL_MS = 30_000;

export function useCalls() {
  const { data, error, isLoading } = useSWR<PhoneCall[]>("phone-calls", fetchCalls, { refreshInterval: POLL_MS });
  return { calls: data ?? [], loading: isLoading, error: Boolean(error) };
}
