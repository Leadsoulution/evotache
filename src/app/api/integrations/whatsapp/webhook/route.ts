import crypto from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { downloadWhatsAppMedia, sendWhatsAppMessage } from "@/lib/whatsappApi";
import { transcribeAudio } from "@/lib/transcribe";
import { runAgentTurn } from "@/lib/agent/runAgentTurn";
import type { Conversation } from "@/generated/prisma/client";

const LINK_COMMAND = /^\/link\s+(\S+)$/i;
// Not a real User row — the WhatsApp side of the conversation has no
// corresponding app account, this id is only ever compared against the
// agent's own id when runAgentTurn builds chat history (role: user vs assistant).
const WHATSAPP_SENDER_ID = "whatsapp";

interface WhatsAppMessage {
  from: string;
  type: string;
  text?: { body: string };
  audio?: { id: string; mime_type?: string };
}

interface WhatsAppWebhookPayload {
  entry?: { changes?: { value?: { messages?: WhatsAppMessage[] } }[] }[];
}

// Meta's own verification step for the webhook URL — a separate handshake
// from Telegram's (which just needs a shared secret header on every POST).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && token && process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  // Same-length check first — timingSafeEqual throws on mismatched lengths.
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

async function findOrCreateAgentWhatsAppConversation(agentId: string): Promise<Conversation> {
  const existing = await db.conversation.findFirst({ where: { type: "direct", participantIds: { equals: [agentId] }, name: "WhatsApp" } });
  if (existing) return existing;
  const now = new Date();
  return db.conversation.create({
    data: {
      type: "direct",
      name: "WhatsApp",
      participantIds: [agentId],
      avatarDataUrl: null,
      createdBy: agentId,
      lastMessageAt: now,
      lastMessagePreview: null,
      lastReadAt: {},
    },
  });
}

async function handleLinkCommand(from: string, code: string): Promise<void> {
  const config = await db.agentConfig.findFirst({ where: { whatsappLinkCode: code }, include: { user: true } });
  if (!config) {
    await sendWhatsAppMessage(from, "Code invalide ou expiré.");
    return;
  }
  const whatsappChatIds = config.whatsappChatIds.includes(from) ? config.whatsappChatIds : [...config.whatsappChatIds, from];
  await db.agentConfig.update({ where: { id: config.id }, data: { whatsappChatIds, whatsappLinkCode: null } });
  await sendWhatsAppMessage(from, `✅ Ce numéro est maintenant lié à l'agent "${config.user.name}".`);
}

async function handleIncomingMessage(from: string, text: string): Promise<void> {
  const config = await db.agentConfig.findFirst({ where: { whatsappChatIds: { has: from } } });
  if (!config || !config.enabledTools.includes("whatsapp")) return;

  const conversation = await findOrCreateAgentWhatsAppConversation(config.userId);
  await db.message.create({ data: { conversationId: conversation.id, senderId: WHATSAPP_SENDER_ID, text } });
  await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), lastMessagePreview: text } });

  void runAgentTurn({
    agentId: config.userId,
    conversationId: conversation.id,
    channel: "whatsapp",
    onReply: (replyText) => sendWhatsAppMessage(from, replyText),
  });
}

async function resolveMessageText(message: WhatsAppMessage): Promise<string | null> {
  if (message.type === "text" && message.text?.body) return message.text.body.trim();
  if (message.type === "audio" && message.audio?.id) {
    const audio = await downloadWhatsAppMedia(message.audio.id);
    const text = await transcribeAudio(audio, "voice-note.ogg");
    return text || null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
  // Always ack fast — Meta retries on non-2xx/slow responses, and any real
  // work (including the LLM round-trip) happens fire-and-forget below.
  for (const message of messages) {
    const from = message.from;
    if (!from) continue;
    const linkMatch = message.type === "text" && message.text?.body ? LINK_COMMAND.exec(message.text.body.trim()) : null;

    if (linkMatch) {
      handleLinkCommand(from, linkMatch[1]).catch((err) => console.error("WhatsApp webhook /link error:", err));
      continue;
    }
    resolveMessageText(message)
      .then((text) => (text ? handleIncomingMessage(from, text) : undefined))
      .catch((err) => console.error("WhatsApp webhook message error:", err));
  }

  return NextResponse.json({ ok: true });
}
