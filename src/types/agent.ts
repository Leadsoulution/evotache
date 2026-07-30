export type AgentKind = "internal" | "external";

export type AgentTool =
  | "tasks"
  | "litiges"
  | "achats"
  | "library"
  | "email"
  | "telegram"
  | "whatsapp"
  | "websearch"
  | "gmail"
  | "drive"
  | "n8n";

export interface AgentToolDef {
  id: AgentTool;
  label: string;
  description: string;
  /** Only offered to external agents — internal ones stay app-scoped. */
  externalOnly: boolean;
}

export const AGENT_TOOLS: AgentToolDef[] = [
  { id: "tasks", label: "Tasks", description: "Read and update tasks, send reminders for overdue ones.", externalOnly: false },
  { id: "litiges", label: "Litiges", description: "Read and update litiges, send reminders for overdue ones.", externalOnly: false },
  { id: "achats", label: "Achats", description: "Create and update purchase records (no real payments).", externalOnly: false },
  { id: "library", label: "Library", description: "Read company rules and reference documents (working hours, policies, ...).", externalOnly: false },
  { id: "email", label: "Email", description: "Send email notifications on the agent's behalf.", externalOnly: true },
  { id: "telegram", label: "Telegram", description: "Send and receive messages via a linked Telegram chat.", externalOnly: true },
  { id: "whatsapp", label: "WhatsApp", description: "Send and receive WhatsApp messages via Twilio.", externalOnly: true },
  { id: "websearch", label: "Web search", description: "Search the web for information.", externalOnly: true },
  { id: "gmail", label: "Gmail", description: "Send and read email through a connected Gmail account.", externalOnly: true },
  { id: "drive", label: "Google Drive", description: "List and read files from a connected Drive account.", externalOnly: true },
  { id: "n8n", label: "n8n", description: "Trigger n8n workflows and receive their callbacks.", externalOnly: true },
];

export interface Agent {
  id: string;
  name: string;
  email: string;
  color: string;
  photoDataUrl: string | null;
  kind: AgentKind;
  systemPrompt: string;
  enabledTools: AgentTool[];
  telegramChatId: string | null;
  whatsappNumber: string | null;
  createdAt: string;
}
