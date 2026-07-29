import type { Agent, AgentKind, AgentTool } from "@/types/agent";

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
