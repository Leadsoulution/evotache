"use client";

import useSWR from "swr";
import { fetchBiometricSchedule } from "@/services/biometricScheduleApi";
import type { BiometricSchedule } from "@/types/biometric";

const DEFAULT_SCHEDULE: BiometricSchedule = { startTime: "09:30", endTime: "19:00", fridayBreakStart: "13:00", fridayBreakEnd: "15:00", saturdayEndTime: "18:00" };

export function useBiometricSchedule() {
  const { data, mutate } = useSWR<BiometricSchedule>("biometric-schedule", fetchBiometricSchedule);
  return { schedule: data ?? DEFAULT_SCHEDULE, refetch: () => mutate() };
}
