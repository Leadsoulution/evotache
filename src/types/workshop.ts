export type WorkshopStatus = "waiting" | "in_progress" | "waiting_part" | "waiting_client" | "ready" | "picked_up" | "cancelled";

export interface WorkshopRepair {
  id: string;
  orderNumber: string;
  brand: string;
  model: string;
  year: number | null;
  engineCc: number | null;
  registration: string | null;
  workDescription: string;
  mechanicId: string | null;
  status: WorkshopStatus;
  entryDate: string;
  expectedCompletionDate: string | null;
  completedDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** The repair's own chrono session, if one has ever been started — null until DÉMARRER is first clicked. */
  activeSession: WorkshopSession | null;
}

export interface WorkshopSession {
  id: string;
  repairId: string;
  mechanicId: string;
  startedAt: string;
  runningSince: string | null;
  accumulatedSeconds: number;
  pausedAt: string | null;
  endedAt: string | null;
  totalWorkSeconds: number | null;
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

export type WorkshopRepairDraft = Partial<Omit<WorkshopRepair, "brand" | "model" | "orderNumber">> &
  Pick<WorkshopRepair, "brand" | "model" | "orderNumber">;

/** Public-facing shape served to the unauthenticated TV display — only
 * the fields explicitly allowed to be shown to a customer in the shop. */
export interface WorkshopTvRepair {
  id: string;
  orderNumber: string;
  brand: string;
  model: string;
  year: number | null;
  engineCc: number | null;
  status: WorkshopStatus;
  isLate: boolean;
}
