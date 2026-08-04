import type { PhoneCall } from "@/types/call";

export async function fetchCalls(): Promise<PhoneCall[]> {
  const response = await fetch("/api/calls");
  if (!response.ok) return [];
  return response.json();
}
