import type { WorkshopRepair, WorkshopService, WorkshopSession, WorkshopStatus } from "@/types/workshop";

export const WORKSHOP_STATUS_ORDER: WorkshopStatus[] = ["waiting", "in_progress", "waiting_part", "waiting_client", "ready", "picked_up", "cancelled"];

// Only these two can be assigned as a repair's mechanic — fixed by the
// shop owner, not a general "who's a mechanic" role in the app. Real user
// ids (confirmed against the live DB), not name matching, so a display
// name change doesn't silently break this.
export const WORKSHOP_ALLOWED_MECHANIC_IDS = [
  "cms7iggbz00045e4kzjrh6q5z", // Farid
  "cmt1o5plj0008q44ktlemr3wp", // B.Yassine
];

export const WORKSHOP_STATUS_LABEL: Record<WorkshopStatus, string> = {
  waiting: "En attente",
  in_progress: "En cours",
  waiting_part: "En attente de pièce",
  waiting_client: "En attente client",
  ready: "Terminé",
  picked_up: "Récupérée",
  cancelled: "Réservation annulée",
};

// Neutral / active / alert / waiting / positive / muted — matches the
// palette used elsewhere in the app (StatusMenu badges, priority colors).
export const WORKSHOP_STATUS_COLOR: Record<WorkshopStatus, string> = {
  waiting: "#94a3b8",
  in_progress: "#6366f1",
  waiting_part: "#f59e0b",
  waiting_client: "#0ea5e9",
  ready: "#22c55e",
  picked_up: "#64748b",
  cancelled: "#ef4444",
};

export const WORKSHOP_SERVICE_STATUS_LABEL: Record<WorkshopService["status"], string> = {
  waiting: "En attente",
  in_progress: "En cours",
  done: "Terminé",
};

/** Board columns — "late" isn't a stored status, it's an overlay on top of
 * one of these (see isWorkshopRepairLate), so it's not listed here as a
 * column of its own; late repairs still show in their real column, just
 * visually flagged. */
export const WORKSHOP_BOARD_STATUSES: WorkshopStatus[] = ["waiting", "in_progress", "waiting_part", "waiting_client", "ready"];

/** A repair reads as "late" once its expected completion date has passed
 * and it hasn't reached a terminal state yet — computed, not stored, same
 * idea as Task's isOverdue, so nothing has to manually move it in/out of
 * that state as work continues or the date changes. Internal use only
 * (Board/mechanic view) — the public TV never shows this. */
export function isWorkshopRepairLate(repair: Pick<WorkshopRepair, "status" | "expectedCompletionDate">): boolean {
  if (!repair.expectedCompletionDate) return false;
  if (repair.status === "ready" || repair.status === "picked_up" || repair.status === "cancelled") return false;
  return new Date(repair.expectedCompletionDate).getTime() < Date.now();
}

/** Same idea, per service: late once its own scheduledDate (the mechanic's
 * own "réalisation prévue" entry) has passed and it isn't done yet.
 * Internal only, never shown to the customer on the TV. */
export function isWorkshopServiceLate(service: Pick<WorkshopService, "status" | "scheduledDate">): boolean {
  if (!service.scheduledDate || service.status === "done") return false;
  return new Date(service.scheduledDate).getTime() < Date.now();
}

/** Live elapsed seconds for a chrono session, purely derived from
 * persisted fields + the current instant — a page refresh recomputes the
 * exact same value instead of resetting anything. */
export function workshopSessionElapsedSeconds(session: Pick<WorkshopSession, "accumulatedSeconds" | "runningSince"> | null): number {
  if (!session) return 0;
  const running = session.runningSince ? Math.max(0, Math.floor((Date.now() - new Date(session.runningSince).getTime()) / 1000)) : 0;
  return session.accumulatedSeconds + running;
}

/** "01:24:32" — a live-ticking stopwatch display, distinct from
 * biometricStats.ts's formatLateDuration (a "3h, 12 min et 5s" summary
 * string meant to be read once, not watched counting up). */
export function formatWorkshopChrono(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}
