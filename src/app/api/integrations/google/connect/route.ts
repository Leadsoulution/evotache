import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { getGoogleAuthUrl } from "@/lib/googleAuth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    return NextResponse.redirect(getGoogleAuthUrl());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Google OAuth isn't configured." }, { status: 500 });
  }
}
