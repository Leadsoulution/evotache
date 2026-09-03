"use client";

import useSWR from "swr";
import { fetchBiometricHolidays } from "@/services/biometricHolidayApi";
import type { BiometricHoliday } from "@/types/biometric";

export function useBiometricHolidays() {
  const { data, mutate } = useSWR<BiometricHoliday[]>("biometric-holidays", fetchBiometricHolidays);
  return { holidays: data ?? [], refetch: () => mutate() };
}
