import type { BiometricPayrollAdjustment } from "@/types/biometric";

export async function fetchBiometricPayrollAdjustments(monthKey: string): Promise<BiometricPayrollAdjustment[]> {
  const response = await fetch(`/api/biometric/payroll-adjustments?month=${encodeURIComponent(monthKey)}`);
  if (!response.ok) return [];
  return response.json();
}

export async function saveBiometricPayrollAdjustment(
  empCode: string,
  monthKey: string,
  patch: { advance?: number; bonus?: number }
): Promise<BiometricPayrollAdjustment> {
  const response = await fetch("/api/biometric/payroll-adjustments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ empCode, monthKey, ...patch }),
  });
  if (!response.ok) throw new Error("Échec de la mise à jour.");
  return response.json();
}
