import type { BiometricLatePenaltyRule, BiometricPayrollConfig } from "@/types/biometric";

export interface BiometricPayrollSettings {
  config: BiometricPayrollConfig;
  rules: BiometricLatePenaltyRule[];
}

const EMPTY: BiometricPayrollSettings = { config: { absenceDeduction: 0 }, rules: [] };

/** Payroll settings are admin/manager-only server-side — a 403 here just
 * means "this viewer doesn't get the Salaires section", so it falls back to
 * empty settings rather than throwing and breaking the whole page. */
export async function fetchBiometricPayrollSettings(): Promise<BiometricPayrollSettings> {
  const response = await fetch("/api/biometric/payroll");
  if (!response.ok) return EMPTY;
  return response.json();
}

export async function saveBiometricPayrollConfig(absenceDeduction: number): Promise<BiometricPayrollConfig> {
  const response = await fetch("/api/biometric/payroll", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ absenceDeduction }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Échec de la mise à jour.");
  }
  return response.json();
}

export async function createBiometricLatePenaltyRule(fromMinutes: number, amount: number): Promise<BiometricLatePenaltyRule> {
  const response = await fetch("/api/biometric/payroll/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromMinutes, amount }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Échec de l'ajout de la règle.");
  }
  return response.json();
}

export async function deleteBiometricLatePenaltyRule(id: string): Promise<void> {
  const response = await fetch(`/api/biometric/payroll/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Échec de la suppression de la règle.");
}
