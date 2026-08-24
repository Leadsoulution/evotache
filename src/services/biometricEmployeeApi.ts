import type { BiometricEmployeeOverride } from "@/lib/biometricStats";

export async function fetchBiometricEmployeeOverrides(): Promise<BiometricEmployeeOverride[]> {
  const response = await fetch("/api/biometric/employees");
  if (!response.ok) return [];
  return response.json();
}

export interface BiometricEmployeeOverridePatch {
  name?: string | null;
  color?: string | null;
  hidden?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  fridayBreakStart?: string | null;
  fridayBreakEnd?: string | null;
  saturdayEndTime?: string | null;
}

export async function saveBiometricEmployeeOverride(empCode: string, patch: BiometricEmployeeOverridePatch): Promise<BiometricEmployeeOverride> {
  const response = await fetch(`/api/biometric/employees/${encodeURIComponent(empCode)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error("Échec de la mise à jour de l'employé.");
  return response.json();
}
