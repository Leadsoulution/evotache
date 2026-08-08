import type { Agent, AgentKind, AgentMemory, AgentReportSchedule, AgentReportType, AgentTool } from "@/types/agent";

export class ApiError extends Error {}

async function parseErrorOrThrow(response: Response): Promise<never> {
  const body = await response.json().catch(() => null);
  throw new ApiError(body?.error ?? "Something went wrong.");
}

export async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch("/api/agents");
  if (!response.ok) return [];
  return response.json();
}

export interface CreateAgentInput {
  name: string;
  email: string;
  color: string;
  photoDataUrl?: string | null;
  kind: AgentKind;
  systemPrompt: string;
  enabledTools: AgentTool[];
}

export async function createAgentRequest(input: CreateAgentInput): Promise<Agent> {
  const response = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export interface UpdateAgentInput {
  name?: string;
  email?: string;
  color?: string;
  photoDataUrl?: string | null;
  kind?: AgentKind;
  systemPrompt?: string;
  enabledTools?: AgentTool[];
}

export async function updateAgentRequest(id: string, patch: UpdateAgentInput): Promise<Agent> {
  const response = await fetch(`/api/agents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteAgentRequest(id: string): Promise<void> {
  const response = await fetch(`/api/agents/${id}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function generateTelegramLinkCode(agentId: string): Promise<string> {
  const response = await fetch(`/api/agents/${agentId}/telegram-link-code`, { method: "POST" });
  if (!response.ok) return parseErrorOrThrow(response);
  const data: { code: string } = await response.json();
  return data.code;
}

export async function unlinkTelegram(agentId: string, chatId: string): Promise<void> {
  const response = await fetch(`/api/agents/${agentId}/telegram-link-code?chatId=${encodeURIComponent(chatId)}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function generateWhatsAppLinkCode(agentId: string): Promise<string> {
  const response = await fetch(`/api/agents/${agentId}/whatsapp-link-code`, { method: "POST" });
  if (!response.ok) return parseErrorOrThrow(response);
  const data: { code: string } = await response.json();
  return data.code;
}

export async function unlinkWhatsApp(agentId: string, chatId: string): Promise<void> {
  const response = await fetch(`/api/agents/${agentId}/whatsapp-link-code?chatId=${encodeURIComponent(chatId)}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function fetchAgentMemory(agentId: string): Promise<AgentMemory[]> {
  const response = await fetch(`/api/agents/${agentId}/memory`);
  if (!response.ok) return [];
  return response.json();
}

export async function createAgentMemory(agentId: string, content: string): Promise<AgentMemory> {
  const response = await fetch(`/api/agents/${agentId}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteAgentMemory(agentId: string, memoryId: string): Promise<void> {
  const response = await fetch(`/api/agents/${agentId}/memory/${memoryId}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}

export async function fetchAgentReportSchedules(agentId: string): Promise<AgentReportSchedule[]> {
  const response = await fetch(`/api/agents/${agentId}/report-schedules`);
  if (!response.ok) return [];
  return response.json();
}

export async function createAgentReportSchedule(
  agentId: string,
  input: { recipientId: string; timesOfDay: string[]; reportTypes: AgentReportType[] }
): Promise<AgentReportSchedule> {
  const response = await fetch(`/api/agents/${agentId}/report-schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function setAgentReportScheduleEnabled(agentId: string, scheduleId: string, enabled: boolean): Promise<AgentReportSchedule> {
  const response = await fetch(`/api/agents/${agentId}/report-schedules/${scheduleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteAgentReportSchedule(agentId: string, scheduleId: string): Promise<void> {
  const response = await fetch(`/api/agents/${agentId}/report-schedules/${scheduleId}`, { method: "DELETE" });
  if (!response.ok) return parseErrorOrThrow(response);
}
