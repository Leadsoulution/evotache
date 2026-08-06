import type { BiometricEmployeeOverride } from "@/lib/biometricStats";

export async function fetchBiometricEmployeeOverrides(): Promise<BiometricEmployeeOverride[]> {
  const response = await fetch("/api/biometric/employees");
  if (!response.ok) return [];
  return response.json();
}

export async function saveBiometricEmployeeOverride(
  empCode: string,
  patch: { name?: string | null; color?: string | null; hidden?: boolean }
): Promise<BiometricEmployeeOverride> {
  const response = await fetch(`/api/biometric/employees/${encodeURIComponent(empCode)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error("Échec de la mise à jour de l'employé.");
  return response.json();
}
