import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signSession, SESSION_COOKIE } from "@/lib/session";
import { toPublicUser } from "@/lib/publicUser";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof (body as Record<string, unknown>)?.email === "string" ? ((body as Record<string, unknown>).email as string) : "";
  const password = typeof (body as Record<string, unknown>)?.password === "string" ? ((body as Record<string, unknown>).password as string) : "";
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || user.isAgent) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (user.status === "disabled") {
    return NextResponse.json({ error: "This account has been disabled. Contact an admin." }, { status: 403 });
  }

  const token = await signSession(user.id);
  const response = NextResponse.json(toPublicUser(user));
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
