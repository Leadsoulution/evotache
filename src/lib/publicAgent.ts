import type { AgentConfig, User as DbUser } from "@/generated/prisma/client";
import type { Agent, AgentTool } from "@/types/agent";

export function toPublicAgent(user: DbUser, config: AgentConfig): Agent {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    color: user.color,
    photoDataUrl: user.photoDataUrl,
    kind: config.kind,
    systemPrompt: config.systemPrompt,
    enabledTools: config.enabledTools as AgentTool[],
    telegramChatId: config.telegramChatId,
    whatsappNumber: config.whatsappNumber,
    createdAt: user.createdAt.toISOString(),
  };
}
