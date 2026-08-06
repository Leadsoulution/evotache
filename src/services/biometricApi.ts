import type { BiometricEvent } from "@/types/biometric";

export interface BiometricStats {
  total: number;
  checkIns: number;
  checkOuts: number;
  uniqueEmployees: number;
}

export interface BiometricEventsResponse {
  events: BiometricEvent[];
  stats: BiometricStats;
}

const EMPTY_STATS: BiometricStats = { total: 0, checkIns: 0, checkOuts: 0, uniqueEmployees: 0 };

export async function fetchBiometricEvents(): Promise<BiometricEventsResponse> {
  const response = await fetch("/api/biometric");
  if (!response.ok) return { events: [], stats: EMPTY_STATS };
  return response.json();
}
