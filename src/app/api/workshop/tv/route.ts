import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toWorkshopTvRepair } from "@/lib/publicWorkshop";

// Deliberately public — no getSessionUser check. This feeds the client-
// facing TV display (/atelier/tv), meant to run unattended in the shop's
// waiting area with no login. toWorkshopTvRepair() is what actually
// enforces the safe-fields allowlist (brand/model/cc/status/service-names
// only — no order number, year, customer name/phone/price/notes, mechanic
// chrono, or lateness, which is an internal-only signal) — this route can
// never leak more than that shape, independent of whatever the TV page
// itself renders.
export async function GET() {
  const repairs = await db.workshopRepair.findMany({
    where: { status: { notIn: ["picked_up", "cancelled"] } },
    orderBy: { entryDate: "asc" },
  });
  const services = await db.workshopService.findMany({ where: { repairId: { in: repairs.map((r) => r.id) } } });
  const servicesByRepairId = new Map<string, typeof services>();
  for (const service of services) {
    const list = servicesByRepairId.get(service.repairId) ?? [];
    list.push(service);
    servicesByRepairId.set(service.repairId, list);
  }

  // Customer-friendly ticket number: this bike's rank among every repair
  // (any status) entered since the 1st of the current month, oldest
  // first — derived at read time (never stored) so it can't drift out of
  // sync, same "computed, not persisted" pattern as isWorkshopRepairLate.
  // Kept stable across the shift as earlier tickets finish and drop off
  // the TV: it's each bike's own entry rank, not its position in this
  // filtered list.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEntries = await db.workshopRepair.findMany({
    where: { entryDate: { gte: startOfMonth } },
    orderBy: { entryDate: "asc" },
    select: { id: true },
  });
  const monthlyNumberById = new Map(monthEntries.map((r, i) => [r.id, i + 1]));

  return NextResponse.json(repairs.map((repair) => toWorkshopTvRepair(repair, servicesByRepairId.get(repair.id) ?? [], monthlyNumberById.get(repair.id) ?? null)));
}
