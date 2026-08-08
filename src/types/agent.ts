export type AgentKind = "internal" | "external";

export type AgentTool =
  | "tasks"
  | "litiges"
  | "achats"
  | "projects"
  | "teams"
  | "library"
  | "reminders"
  | "biometric"
  | "calls"
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
  { id: "achats", label: "Achats", description: "Create, update, and delete purchase records (no real payments).", externalOnly: false },
  { id: "projects", label: "Projects", description: "Create, update, and delete projects.", externalOnly: false },
  { id: "teams", label: "Departments", description: "Create, update, and delete departments, and manage their members.", externalOnly: false },
  { id: "library", label: "Library", description: "Read, create, update, and delete company rules and reference documents.", externalOnly: false },
  { id: "reminders", label: "Reminders", description: "Create, update, and delete scheduled reminder rules (overdue-task escalations, meeting reminders).", externalOnly: false },
  { id: "biometric", label: "Biométrie", description: "Read attendance reports from the fingerprint pointeuse (présences, absents, retards).", externalOnly: false },
  { id: "calls", label: "Appels", description: "Read phone call reports from 3CX (répondus, manqués, durée, non traités).", externalOnly: false },
  { id: "email", label: "Email", description: "Send email notifications on the agent's behalf.", externalOnly: true },
  { id: "telegram", label: "Telegram", description: "Send and receive messages via a linked Telegram chat.", externalOnly: true },
  { id: "whatsapp", label: "WhatsApp", description: "Send and receive WhatsApp messages via the Meta WhatsApp Cloud API.", externalOnly: true },
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
  telegramChatIds: string[];
  whatsappChatIds: string[];
  createdAt: string;
}

/** A standing fact/instruction this agent remembers across conversations —
 * see AgentMemory in schema.prisma. */
export interface AgentMemory {
  id: string;
  agentId: string;
  content: string;
  createdAt: string;
}

export type AgentReportType = "calls_unhandled" | "biometric_today";

export const AGENT_REPORT_TYPES: { id: AgentReportType; label: string }[] = [
  { id: "calls_unhandled", label: "Appels manqués non traités" },
  { id: "biometric_today", label: "Rapport biométrique du jour" },
];

/** A recurring report this agent sends to one specific person via chat, at
 * fixed times each day — see AgentReportSchedule in schema.prisma. */
export interface AgentReportSchedule {
  id: string;
  agentId: string;
  recipientId: string;
  recipientName: string;
  timesOfDay: string[];
  reportTypes: AgentReportType[];
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
}
