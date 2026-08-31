export type WorkshopStatus = "waiting" | "in_progress" | "waiting_part" | "waiting_client" | "ready" | "picked_up" | "cancelled";

export type WorkshopServiceStatus = "waiting" | "in_progress" | "done";

export interface WorkshopSession {
  id: string;
  serviceId: string;
  mechanicId: string;
  startedAt: string;
  runningSince: string | null;
  accumulatedSeconds: number;
  pausedAt: string | null;
  endedAt: string | null;
  totalWorkSeconds: number | null;
}

/** One concrete job within a repair (e.g. "Plaquettes", "Pneus") — its own
 * description, mechanic-set scheduled date/time, status, and chrono. A
 * repair can have several running independently. */
export interface WorkshopService {
  id: string;
  repairId: string;
  description: string;
  scheduledDate: string | null;
  status: WorkshopServiceStatus;
  completedAt: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  /** This service's own chrono session, if one has ever been started. */
  activeSession: WorkshopSession | null;
}

export interface WorkshopRepair {
  id: string;
  orderNumber: string;
  brand: string;
  model: string;
  year: number | null;
  engineCc: number | null;
  registration: string | null;
  mechanicId: string | null;
  status: WorkshopStatus;
  entryDate: string;
  expectedCompletionDate: string | null;
  completedDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  services: WorkshopService[];
}

export interface WorkshopStatusHistoryEntry {
  id: string;
  repairId: string;
  oldStatus: WorkshopStatus | null;
  newStatus: WorkshopStatus;
  /** Raw user id — resolved to a display name client-side against the
   * already-loaded assignees list, same pattern as task assignees. */
  changedBy: string | null;
  changedAt: string;
}

export interface WorkshopServiceDraft {
  description: string;
  scheduledDate: string | null;
}

export type WorkshopRepairDraft = Partial<Omit<WorkshopRepair, "brand" | "model" | "orderNumber" | "services">> &
  Pick<WorkshopRepair, "brand" | "model" | "orderNumber"> & { services?: WorkshopServiceDraft[] };

/** Public-facing shape served to the unauthenticated TV display — only
 * what a customer in the shop is meant to see. No order number (internal
 * reference), no year, no lateness (that's an internal signal only), no
 * mechanic/price/notes/chrono. `services` is just the list of job names
 * (e.g. "Changement des pneus") — never their status, date, or chrono.
 * `displayNumber` is this bike's 1-based position in the TV list (oldest
 * entry first) — plain "1st, 2nd, 3rd" ordering of what's on screen right
 * now, not a persisted ticket number, so it shifts if an earlier one
 * leaves the list. */
export interface WorkshopTvRepair {
  id: string;
  brand: string;
  model: string;
  engineCc: number | null;
  status: WorkshopStatus;
  services: string[];
  displayNumber: number;
}
