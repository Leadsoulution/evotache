import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

const PUBLIC_ROUTES = new Set(["/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Belt-and-suspenders alongside the matcher below: never gate Next
  // internals, API routes, or static/metadata files — a bug in the matcher
  // regex must not turn into JS chunks being served as a login-page redirect.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySession(token);
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  if (!userId && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  if (userId && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const proxyConfig = {
  // Standard Next.js matcher excluding internals/API/static assets — the
  // in-function checks above are a redundant safety net on top of this.
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico).*)"],
};
