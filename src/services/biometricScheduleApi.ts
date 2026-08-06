import type { BiometricSchedule } from "@/types/biometric";

const DEFAULT_SCHEDULE: BiometricSchedule = { startTime: "09:30", endTime: "19:00", fridayBreakStart: "13:00", fridayBreakEnd: "15:00" };

export async function fetchBiometricSchedule(): Promise<BiometricSchedule> {
  const response = await fetch("/api/biometric/schedule");
  if (!response.ok) return DEFAULT_SCHEDULE;
  return response.json();
}

export async function saveBiometricSchedule(schedule: BiometricSchedule): Promise<BiometricSchedule> {
  const response = await fetch("/api/biometric/schedule", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(schedule),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Échec de la mise à jour des horaires.");
  }
  return response.json();
}
