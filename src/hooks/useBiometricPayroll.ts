"use client";

import useSWR from "swr";
import { fetchBiometricPayrollSettings } from "@/services/biometricPayrollApi";
import type { BiometricPayrollSettings } from "@/services/biometricPayrollApi";

const EMPTY: BiometricPayrollSettings = { config: { absenceDeduction: 0 }, rules: [] };

export function useBiometricPayroll() {
  const { data, mutate } = useSWR<BiometricPayrollSettings>("biometric-payroll", fetchBiometricPayrollSettings);
  return { config: data?.config ?? EMPTY.config, rules: data?.rules ?? EMPTY.rules, refetch: () => mutate() };
}
