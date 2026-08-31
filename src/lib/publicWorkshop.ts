import type {
  WorkshopRepair as DbWorkshopRepair,
  WorkshopService as DbWorkshopService,
  WorkshopSession as DbWorkshopSession,
  WorkshopStatusHistory as DbWorkshopStatusHistory,
} from "@/generated/prisma/client";
import type { WorkshopRepair, WorkshopService, WorkshopServiceStatus, WorkshopSession, WorkshopStatus, WorkshopStatusHistoryEntry, WorkshopTvRepair } from "@/types/workshop";

export function toPublicWorkshopSession(session: DbWorkshopSession): WorkshopSession {
  return {
    id: session.id,
    serviceId: session.serviceId,
    mechanicId: session.mechanicId,
    startedAt: session.startedAt.toISOString(),
    runningSince: session.runningSince ? session.runningSince.toISOString() : null,
    accumulatedSeconds: session.accumulatedSeconds,
    pausedAt: session.pausedAt ? session.pausedAt.toISOString() : null,
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    totalWorkSeconds: session.totalWorkSeconds,
  };
}

/** `activeSession` is the service's most recent chrono session (running,
 * paused, or already ended) — whichever the UI needs for current/last
 * elapsed time. */
export function toPublicWorkshopService(service: DbWorkshopService, activeSession: DbWorkshopSession | null): WorkshopService {
  return {
    id: service.id,
    repairId: service.repairId,
    description: service.description,
    scheduledDate: service.scheduledDate ? service.scheduledDate.toISOString() : null,
    status: service.status as WorkshopServiceStatus,
    completedAt: service.completedAt ? service.completedAt.toISOString() : null,
    order: service.order,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
    activeSession: activeSession ? toPublicWorkshopSession(activeSession) : null,
  };
}

export function toPublicWorkshopRepair(repair: DbWorkshopRepair, services: WorkshopService[]): WorkshopRepair {
  return {
    id: repair.id,
    orderNumber: repair.orderNumber,
    brand: repair.brand,
    model: repair.model,
    year: repair.year,
    engineCc: repair.engineCc,
    registration: repair.registration,
    mechanicId: repair.mechanicId,
    status: repair.status as WorkshopStatus,
    entryDate: repair.entryDate.toISOString(),
    expectedCompletionDate: repair.expectedCompletionDate ? repair.expectedCompletionDate.toISOString() : null,
    completedDate: repair.completedDate ? repair.completedDate.toISOString() : null,
    createdBy: repair.createdBy,
    createdAt: repair.createdAt.toISOString(),
    updatedAt: repair.updatedAt.toISOString(),
    services: services.sort((a, b) => a.order - b.order),
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

/** Only the fields the public TV display is allowed to show — no order
 * number, year, customer name, phone, price, internal notes, lateness, or
 * mechanic chrono. Built here (not just hidden client-side) so the
 * unauthenticated /api/workshop/tv route can never leak more than this
 * even if the TV page's own code changes. `services` carries only job
 * names, sorted by their display order — never status/date/chrono. */
export function toWorkshopTvRepair(repair: DbWorkshopRepair, services: DbWorkshopService[]): WorkshopTvRepair {
  return {
    id: repair.id,
    brand: repair.brand,
    model: repair.model,
    engineCc: repair.engineCc,
    status: repair.status as WorkshopStatus,
    services: services
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => s.description),
  };
}
