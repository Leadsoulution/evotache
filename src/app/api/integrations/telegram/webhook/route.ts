import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegramBot";
import { runAgentTurn } from "@/lib/agent/runAgentTurn";
import type { Conversation } from "@/generated/prisma/client";

const LINK_COMMAND = /^\/link\s+(\S+)$/i;
// Not a real User row — the Telegram side of the conversation has no
// corresponding app account, this id is only ever compared against the
// agent's own id when runAgentTurn builds chat history (role: user vs assistant).
const TELEGRAM_SENDER_ID = "telegram";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
  };
}

async function findOrCreateAgentTelegramConversation(agentId: string): Promise<Conversation> {
  const existing = await db.conversation.findFirst({ where: { type: "direct", participantIds: { equals: [agentId] }, name: "Telegram" } });
  if (existing) return existing;
  const now = new Date();
  return db.conversation.create({
    data: {
      type: "direct",
      name: "Telegram",
      participantIds: [agentId],
      avatarDataUrl: null,
      createdBy: agentId,
      lastMessageAt: now,
      lastMessagePreview: null,
      lastReadAt: {},
    },
  });
}

async function handleLinkCommand(chatId: number, code: string): Promise<void> {
  const config = await db.agentConfig.findFirst({ where: { telegramLinkCode: code }, include: { user: true } });
  if (!config) {
    await sendTelegramMessage(String(chatId), "Code invalide ou expiré.");
    return;
  }
  await db.agentConfig.update({ where: { id: config.id }, data: { telegramChatId: String(chatId), telegramLinkCode: null } });
  await sendTelegramMessage(String(chatId), `✅ Ce chat est maintenant lié à l'agent "${config.user.name}".`);
}

async function handleIncomingMessage(chatId: number, text: string): Promise<void> {
  const config = await db.agentConfig.findFirst({ where: { telegramChatId: String(chatId) } });
  if (!config || !config.enabledTools.includes("telegram")) return;

  const conversation = await findOrCreateAgentTelegramConversation(config.userId);
  await db.message.create({ data: { conversationId: conversation.id, senderId: TELEGRAM_SENDER_ID, text } });
  await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), lastMessagePreview: text } });

  void runAgentTurn({
    agentId: config.userId,
    conversationId: conversation.id,
    onReply: (replyText) => sendTelegramMessage(String(chatId), replyText),
  });
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || !process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  // Always ack fast — Telegram retries on non-2xx/slow responses, and any
  // real work (including the LLM round-trip) happens fire-and-forget below.
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text.trim();
  const linkMatch = LINK_COMMAND.exec(text);

  if (linkMatch) {
    try {
      await handleLinkCommand(chatId, linkMatch[1]);
    } catch (err) {
      console.error("Telegram webhook /link error:", err);
    }
  } else {
    // Fire-and-forget: the DB writes + LLM round-trip shouldn't block
    // Telegram's webhook response. .catch (not the outer try/catch, which
    // only sees synchronous throws) keeps a failure from becoming an
    // unhandled rejection.
    handleIncomingMessage(chatId, text).catch((err) => console.error("Telegram webhook message error:", err));
  }

  return NextResponse.json({ ok: true });
}
