const WEBHOOK_PATH = "/api/integrations/telegram/webhook";

function apiBase(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return `https://api.telegram.org/bot${token}`;
}

async function telegramFetch(method: string, body?: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${apiBase()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`Telegram API ${method} failed: ${data.description ?? response.statusText}`);
  return data.result;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  await telegramFetch("sendMessage", { chat_id: chatId, text });
}

export interface TelegramBotInfo {
  id: number;
  username: string;
  firstName: string;
}

export async function getBotInfo(): Promise<TelegramBotInfo> {
  const result = (await telegramFetch("getMe")) as { id: number; username: string; first_name: string };
  return { id: result.id, username: result.username, firstName: result.first_name };
}

export async function registerWebhook(secretToken: string): Promise<void> {
  const appUrl = "https://evotasks.app";
  await telegramFetch("setWebhook", { url: `${appUrl}${WEBHOOK_PATH}`, secret_token: secretToken });
}

export interface TelegramWebhookStatus {
  url: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
}

export async function getWebhookInfo(): Promise<TelegramWebhookStatus> {
  const result = (await telegramFetch("getWebhookInfo")) as { url: string; has_custom_certificate: boolean; pending_update_count: number };
  return { url: result.url, hasCustomCertificate: result.has_custom_certificate, pendingUpdateCount: result.pending_update_count };
}
