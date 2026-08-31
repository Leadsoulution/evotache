import type { WorkshopRepair as DbWorkshopRepair, WorkshopSession as DbWorkshopSession, WorkshopStatusHistory as DbWorkshopStatusHistory } from "@/generated/prisma/client";
import type { WorkshopRepair, WorkshopSession, WorkshopStatus, WorkshopStatusHistoryEntry, WorkshopTvRepair } from "@/types/workshop";
import { isWorkshopRepairLate } from "@/lib/workshopStats";

export function toPublicWorkshopSession(session: DbWorkshopSession): WorkshopSession {
  return {
    id: session.id,
    repairId: session.repairId,
    mechanicId: session.mechanicId,
    startedAt: session.startedAt.toISOString(),
    runningSince: session.runningSince ? session.runningSince.toISOString() : null,
    accumulatedSeconds: session.accumulatedSeconds,
    pausedAt: session.pausedAt ? session.pausedAt.toISOString() : null,
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    totalWorkSeconds: session.totalWorkSeconds,
  };
}

/** `activeSession` is the repair's most recent chrono session (running,
 * paused, or already ended) — whichever the UI needs to show current/last
 * elapsed time, so callers don't have to fetch sessions separately for the
 * common case of "one session per repair". */
export function toPublicWorkshopRepair(repair: DbWorkshopRepair, activeSession: DbWorkshopSession | null): WorkshopRepair {
  return {
    id: repair.id,
    orderNumber: repair.orderNumber,
    brand: repair.brand,
    model: repair.model,
    year: repair.year,
    engineCc: repair.engineCc,
    registration: repair.registration,
    workDescription: repair.workDescription,
    mechanicId: repair.mechanicId,
    status: repair.status as WorkshopStatus,
    entryDate: repair.entryDate.toISOString(),
    expectedCompletionDate: repair.expectedCompletionDate ? repair.expectedCompletionDate.toISOString() : null,
    completedDate: repair.completedDate ? repair.completedDate.toISOString() : null,
    createdBy: repair.createdBy,
    createdAt: repair.createdAt.toISOString(),
    updatedAt: repair.updatedAt.toISOString(),
    activeSession: activeSession ? toPublicWorkshopSession(activeSession) : null,
  };
}

export function toPublicWorkshopStatusHistoryEntry(entry: DbWorkshopStatusHistory): WorkshopStatusHistoryEntry {
  return {
    id: entry.id,
    repairId: entry.repairId,
    oldStatus: entry.oldStatus as WorkshopStatus | null,
    newStatus: entry.newStatus as WorkshopStatus,
    changedBy: entry.changedBy,
    changedAt: entry.changedAt.toISOString(),
  };
}

/** Only the fields the public TV display is allowed to show — no customer
 * name, phone, price, internal notes, or mechanic chrono. Built here (not
 * just hidden client-side) so the unauthenticated /api/workshop/tv route
 * can never leak more than this even if the TV page's own code changes. */
export function toWorkshopTvRepair(repair: DbWorkshopRepair): WorkshopTvRepair {
  const status = repair.status as WorkshopStatus;
  return {
    id: repair.id,
    orderNumber: repair.orderNumber,
    brand: repair.brand,
    model: repair.model,
    year: repair.year,
    engineCc: repair.engineCc,
    status,
    isLate: isWorkshopRepairLate({ status, expectedCompletionDate: repair.expectedCompletionDate ? repair.expectedCompletionDate.toISOString() : null }),
  };
}
