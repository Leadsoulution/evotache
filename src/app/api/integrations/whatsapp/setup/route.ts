import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { getWhatsAppStatus } from "@/lib/whatsappApi";

// Unlike Telegram's setup route, there's no POST here — Meta only accepts
// webhook registration through the App dashboard UI, not an API call, so
// this is read-only status.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getWhatsAppStatus());
}
