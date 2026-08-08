import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { db } from "@/lib/db";

// Mirrors telegram-link-code/route.ts exactly — excludes visually-ambiguous
// characters (0/O, 1/I/L) since this gets typed by hand into WhatsApp as
// "/link <code>".
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const agentConfig = await db.agentConfig.findUnique({ where: { userId: id } });
  if (!agentConfig) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

  const code = generateCode();
  await db.agentConfig.update({ where: { userId: id }, data: { whatsappLinkCode: code } });
  return NextResponse.json({ code });
}

// Unlinks one specific number (?chatId=...), or every linked number if omitted.
export async function DELETE(request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const chatId = new URL(request.url).searchParams.get("chatId");
  const agentConfig = await db.agentConfig.findUnique({ where: { userId: id } });
  if (!agentConfig) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

  const whatsappChatIds = chatId ? agentConfig.whatsappChatIds.filter((c) => c !== chatId) : [];
  await db.agentConfig.update({ where: { userId: id }, data: { whatsappChatIds, whatsappLinkCode: null } });
  return NextResponse.json({ ok: true });
}
