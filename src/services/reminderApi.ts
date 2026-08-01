import type { ReminderRule, ReminderRuleInput } from "@/types/reminder";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchReminderRules(): Promise<ReminderRule[]> {
  const response = await fetch("/api/reminders");
  if (!response.ok) return [];
  return response.json();
}

export async function createReminderRule(input: ReminderRuleInput): Promise<ReminderRule> {
  const response = await fetch("/api/reminders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateReminderRule(id: string, patch: Partial<ReminderRuleInput> & { resetLastRun?: boolean }): Promise<ReminderRule> {
  const response = await fetch(`/api/reminders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteReminderRule(id: string): Promise<void> {
  const response = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
