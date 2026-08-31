import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toWorkshopTvRepair } from "@/lib/publicWorkshop";

// Deliberately public — no getSessionUser check. This feeds the client-
// facing TV display (/atelier/tv), meant to run unattended in the shop's
// waiting area with no login. toWorkshopTvRepair() is what actually
// enforces the safe-fields allowlist (no customer name/phone/price/notes/
// mechanic chrono) — this route can never leak more than that shape,
// independent of whatever the TV page itself renders.
export async function GET() {
  const repairs = await db.workshopRepair.findMany({
    where: { status: { notIn: ["picked_up", "cancelled"] } },
    orderBy: { entryDate: "asc" },
  });
  return NextResponse.json(repairs.map(toWorkshopTvRepair));
}
