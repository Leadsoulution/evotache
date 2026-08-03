import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { getMetaAuthUrl } from "@/lib/metaAuth";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    return NextResponse.redirect(getMetaAuthUrl());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Meta OAuth isn't configured." }, { status: 500 });
  }
}
