import type { BiometricHoliday } from "@/types/biometric";

export async function fetchBiometricHolidays(): Promise<BiometricHoliday[]> {
  const response = await fetch("/api/biometric/holidays");
  if (!response.ok) return [];
  return response.json();
}

export async function createBiometricHoliday(date: string, name: string): Promise<BiometricHoliday> {
  const response = await fetch("/api/biometric/holidays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, name }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Échec de l'enregistrement du jour férié.");
  }
  return response.json();
}

export async function deleteBiometricHoliday(id: string): Promise<void> {
  const response = await fetch(`/api/biometric/holidays/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Échec de la suppression du jour férié.");
}
