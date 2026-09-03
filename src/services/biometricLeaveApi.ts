import type { BiometricLeave } from "@/types/biometric";

export async function fetchBiometricLeaves(): Promise<BiometricLeave[]> {
  const response = await fetch("/api/biometric/leaves");
  if (!response.ok) return [];
  return response.json();
}

export interface BiometricLeaveDraft {
  empCode: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

export async function createBiometricLeave(draft: BiometricLeaveDraft): Promise<BiometricLeave> {
  const response = await fetch("/api/biometric/leaves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Échec de l'enregistrement du congé.");
  }
  return response.json();
}

export async function deleteBiometricLeave(id: string): Promise<void> {
  const response = await fetch(`/api/biometric/leaves/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Échec de la suppression du congé.");
}
