import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { db } from "@/lib/db";

// Excludes visually-ambiguous characters (0/O, 1/I/L) since this gets typed
// by hand into Telegram as `/link <code>`.
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
  await db.agentConfig.update({ where: { userId: id }, data: { telegramLinkCode: code } });
  return NextResponse.json({ code });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const agentConfig = await db.agentConfig.findUnique({ where: { userId: id } });
  if (!agentConfig) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

  await db.agentConfig.update({ where: { userId: id }, data: { telegramChatId: null, telegramLinkCode: null } });
  return NextResponse.json({ ok: true });
}
