"use client";

import useSWR from "swr";
import { fetchBiometricPayrollAdjustments } from "@/services/biometricPayrollAdjustmentApi";
import type { BiometricPayrollAdjustment } from "@/types/biometric";

export function useBiometricPayrollAdjustments(monthKey: string) {
  const { data, mutate } = useSWR<BiometricPayrollAdjustment[]>(["biometric-payroll-adjustments", monthKey], () => fetchBiometricPayrollAdjustments(monthKey));
  return { adjustments: data ?? [], refetch: () => mutate() };
}
