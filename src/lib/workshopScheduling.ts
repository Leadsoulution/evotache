import { db } from "@/lib/db";

// Buffer between two consecutive prestations for the same mechanic — time
// to wrap up one job and get set up on the next.
const GAP_MINUTES = 5;

/** Each mechanic has one running queue across every repair assigned to
 * them — not one queue per repair. A new service scheduled for mechanic M
 * starts GAP_MINUTES after the end of M's last-scheduled service
 * (scheduledDate + its own durationMinutes), or at the repair's own
 * entryDate if M has no scheduled services yet or is already free by
 * then. Computed once, at creation time, from durationMinutes estimates —
 * never recalculated afterwards even if the real work over/underruns
 * those estimates (a deliberate simplification, not a bug).
 *
 * Callers creating several services for the same mechanic in one request
 * must `await` each one's creation before computing the next — this
 * reads the previous one back from the DB, it doesn't track in-memory
 * state of its own. */
export async function computeNextServiceStart(mechanicId: string | null, repairEntryDate: Date): Promise<Date> {
  if (!mechanicId) return repairEntryDate;

  const lastScheduled = await db.workshopService.findFirst({
    where: { repair: { mechanicId }, scheduledDate: { not: null } },
    orderBy: { scheduledDate: "desc" },
    select: { scheduledDate: true, durationMinutes: true },
  });

  if (!lastScheduled?.scheduledDate) return repairEntryDate;

  const queueEnd = new Date(lastScheduled.scheduledDate.getTime() + (lastScheduled.durationMinutes ?? 0) * 60_000);
  const candidateStart = new Date(queueEnd.getTime() + GAP_MINUTES * 60_000);
  return candidateStart > repairEntryDate ? candidateStart : repairEntryDate;
}

/** Auto-starts the chrono on any service whose computed scheduledDate has
 * arrived — hit periodically by /api/cron/workshop-auto-start (an
 * external cron, this project has no in-process scheduler) rather than
 * waiting for a mechanic to click "Démarrer" themselves. `runningSince`
 * is backdated to the service's own scheduledDate (not "now") so the
 * displayed chrono is correct immediately even though the cron only
 * discovers it up to a minute late. Never touches a service that's
 * already started (has any session), done, or whose repair has already
 * reached a terminal status. */
export async function runWorkshopAutoStart(): Promise<{ started: number }> {
  const now = new Date();
  const due = await db.workshopService.findMany({
    where: {
      status: "waiting",
      scheduledDate: { lte: now },
      sessions: { none: {} },
      repair: { status: { notIn: ["picked_up", "cancelled", "ready"] }, mechanicId: { not: null } },
    },
    include: { repair: true },
  });

  let started = 0;
  // Two due services can belong to the same repair in one batch — track
  // which repairs this run already bumped so it doesn't write the
  // "→ in_progress" history entry twice for the same transition.
  const bumpedRepairIds = new Set<string>();
  for (const service of due) {
    const { repair } = service;
    if (!repair.mechanicId || !service.scheduledDate) continue; // can't happen given the query above, but keeps this block type-safe

    await db.workshopSession.create({
      data: { serviceId: service.id, mechanicId: repair.mechanicId, startedAt: service.scheduledDate, runningSince: service.scheduledDate },
    });
    await db.workshopService.update({ where: { id: service.id }, data: { status: "in_progress" } });
    if (repair.status !== "in_progress" && !bumpedRepairIds.has(repair.id)) {
      bumpedRepairIds.add(repair.id);
      await db.workshopStatusHistory.create({ data: { repairId: repair.id, oldStatus: repair.status, newStatus: "in_progress", changedBy: null } });
      await db.workshopRepair.update({ where: { id: repair.id }, data: { status: "in_progress" } });
    }
    started += 1;
  }

  return { started };
}
