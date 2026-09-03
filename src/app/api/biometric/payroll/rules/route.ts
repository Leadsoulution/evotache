import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canManageUsers, canManageWorkflow } from "@/config/roleMeta";

// One tier of the lateness penalty table ("at least N minutes late costs X
// DH") — see penaltyForLateMinutes in biometricStats.ts for how a given
// arrival picks its tier.
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(sessionUser.role) && !canManageWorkflow(sessionUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const fromMinutes = Number(body?.fromMinutes);
  const amount = Number(body?.amount);
  if (!Number.isInteger(fromMinutes) || fromMinutes < 0) {
    return NextResponse.json({ error: "Le seuil doit être un nombre entier de minutes." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Le montant doit être un nombre positif." }, { status: 400 });
  }

  const rule = await db.biometricLatePenaltyRule.create({ data: { fromMinutes, amount } });
  return NextResponse.json(rule, { status: 201 });
}
