"use client";

import useSWR from "swr";
import { fetchBiometricLeaves } from "@/services/biometricLeaveApi";
import type { BiometricLeave } from "@/types/biometric";

export function useBiometricLeaves() {
  const { data, mutate } = useSWR<BiometricLeave[]>("biometric-leaves", fetchBiometricLeaves);
  return { leaves: data ?? [], refetch: () => mutate() };
}
