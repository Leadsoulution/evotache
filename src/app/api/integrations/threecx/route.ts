import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { disconnectThreeCx, getThreeCxStatus, setThreeCxConnection } from "@/lib/threeCxAuth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getThreeCxStatus());
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const pbxUrl = typeof body?.pbxUrl === "string" ? body.pbxUrl.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!pbxUrl || !username || !password) return NextResponse.json({ error: "PBX URL, username, and password are required." }, { status: 400 });

  try {
    await setThreeCxConnection(pbxUrl, username, password, sessionUser.id);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to connect to 3CX." }, { status: 400 });
  }
  return NextResponse.json(await getThreeCxStatus());
}

export async function DELETE() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await disconnectThreeCx();
  return NextResponse.json(await getThreeCxStatus());
}
