import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { disconnectBiometric, getBiometricStatus, setBiometricConnection } from "@/lib/biometricAuth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getBiometricStatus());
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const baseUrl = typeof body?.baseUrl === "string" ? body.baseUrl.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!baseUrl || !username || !password) return NextResponse.json({ error: "L'URL, le nom d'utilisateur et le mot de passe sont requis." }, { status: 400 });

  try {
    await setBiometricConnection(baseUrl, username, password, sessionUser.id);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Échec de la connexion au système biométrique." }, { status: 400 });
  }
  return NextResponse.json(await getBiometricStatus());
}

export async function DELETE() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await disconnectBiometric();
  return NextResponse.json(await getBiometricStatus());
}
