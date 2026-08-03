import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers } from "@/config/roleMeta";
import { exchangeCodeForTokens } from "@/lib/googleAuth";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || !canManageUsers(sessionUser.role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError || !code) {
    return NextResponse.redirect(new URL(`/admin/backup?google=error&message=${encodeURIComponent(oauthError ?? "No authorization code returned.")}`, request.url));
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL("/admin/backup?google=connected", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to connect Google.";
    return NextResponse.redirect(new URL(`/admin/backup?google=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
