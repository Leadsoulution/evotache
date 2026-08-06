"use client";

import useSWR from "swr";
import { fetchBiometricEmployeeOverrides } from "@/services/biometricEmployeeApi";
import type { BiometricEmployeeOverride } from "@/lib/biometricStats";

export function useBiometricEmployees() {
  const { data, mutate } = useSWR<BiometricEmployeeOverride[]>("biometric-employee-overrides", fetchBiometricEmployeeOverrides);
  return { overrides: data ?? [], refetch: () => mutate() };
}
