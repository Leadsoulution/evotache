import type { PhoneCall } from "@/types/call";

export interface CallStats {
  total: number;
  answered: number;
  missed: number;
  avgTalk: number;
  totalTalk: number;
}

export interface CallsResponse {
  calls: PhoneCall[];
  stats: CallStats;
}

const EMPTY_STATS: CallStats = { total: 0, answered: 0, missed: 0, avgTalk: 0, totalTalk: 0 };

export async function fetchCalls(): Promise<CallsResponse> {
  const response = await fetch("/api/calls");
  if (!response.ok) return { calls: [], stats: EMPTY_STATS };
  return response.json();
}
