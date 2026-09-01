import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getThreeCxStatus } from "@/lib/threeCxAuth";

// Deliberately open to any logged-in user (not gated behind canManageUsers
// like /api/integrations/threecx) — a PBX hostname isn't sensitive, and
// every workshop role needs it to build a "call via 3CX" link. Only the
// hostname is returned, never the stored username/password.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { connected, pbxUrl } = await getThreeCxStatus();
  return NextResponse.json({ pbxUrl: connected ? pbxUrl : null });
}
