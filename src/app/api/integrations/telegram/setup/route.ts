import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { getBotInfo, getWebhookInfo, registerWebhook } from "@/lib/telegramBot";

interface TelegramSetupStatus {
  tokenConfigured: boolean;
  botUsername: string | null;
  webhookRegistered: boolean;
  error: string | null;
}

async function getStatus(): Promise<TelegramSetupStatus> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { tokenConfigured: false, botUsername: null, webhookRegistered: false, error: null };
  }
  try {
    const [bot, webhook] = await Promise.all([getBotInfo(), getWebhookInfo()]);
    return { tokenConfigured: true, botUsername: bot.username, webhookRegistered: Boolean(webhook.url), error: null };
  } catch (err) {
    return { tokenConfigured: true, botUsername: null, webhookRegistered: false, error: err instanceof Error ? err.message : "Failed to reach Telegram." };
  }
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getStatus());
}

export async function POST() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not configured." }, { status: 400 });
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) return NextResponse.json({ error: "TELEGRAM_WEBHOOK_SECRET is not configured." }, { status: 400 });

  try {
    await registerWebhook(process.env.TELEGRAM_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to register the webhook." }, { status: 500 });
  }
  return NextResponse.json(await getStatus());
}
