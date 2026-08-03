import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageWorkflow } from "@/config/roleMeta";
import { listAdAccounts } from "@/lib/metaApi";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageWorkflow(sessionUser.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    return NextResponse.json(await listAdAccounts());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to list Meta ad accounts." }, { status: 500 });
  }
}
