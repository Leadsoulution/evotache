import { notifyUser } from "@/lib/notify";

// Fixed — Ghassan handles parts, notified directly rather than through
// whoever happens to be the repair's mechanic/commercial.
const GHASSAN_USER_ID = "cms7ibezf00015e4kgybk5ugs";

interface RepairLike {
  orderNumber: string;
  brand: string;
  model: string;
}

function repairLabel(repair: RepairLike): string {
  return `${repair.brand} ${repair.model} (${repair.orderNumber})`;
}

/** "Chaque prestation ajoutée sonne l'app du mécanicien" — fired once per
 * new service, not batched, so the mechanic sees exactly what was just
 * added. No-op if the repair has no mechanic assigned yet. `alarm: true`
 * makes the push stickier (vibrate pattern, stays until dismissed) —
 * these are meant to actually get someone's attention, not blend into
 * routine notifications like a chat message. */
export function notifyMechanicNewService(mechanicId: string | null, repair: RepairLike, serviceDescription: string): void {
  if (!mechanicId) return;
  void notifyUser(mechanicId, { title: "Nouvelle prestation", body: `${repairLabel(repair)} — ${serviceDescription}`, url: "/atelier", alarm: true });
}

/** "En attente de pièce" → Ghassan, in-app (no phone call — 3CX's Call
 * Control API needed for that is Enterprise-only, see the removed
 * workshopCallAutomation.ts). */
export function notifyGhassanMissingPart(repair: RepairLike): void {
  void notifyUser(GHASSAN_USER_ID, { title: "Pièce nécessaire", body: `${repairLabel(repair)} est en attente de pièce.`, url: "/atelier", alarm: true });
}

/** "En attente client" → the commercial who created the repair (not the
 * client — the client is never pushed to directly, they have no EvoTasks
 * account), asking them to reach out. */
export function notifyCommercialWaitingClient(commercialId: string | null, repair: RepairLike): void {
  if (!commercialId) return;
  void notifyUser(commercialId, { title: "En attente client", body: `${repairLabel(repair)} — merci de contacter le client.`, url: "/atelier", alarm: true });
}

/** "Terminé" → same idea: the commercial, asked to tell the client
 * themselves (matches the exact wording requested). */
export function notifyCommercialReady(commercialId: string | null, repair: RepairLike): void {
  if (!commercialId) return;
  void notifyUser(commercialId, {
    title: "Prestation terminée",
    body: `${repairLabel(repair)} est terminée — merci de le dire au client.`,
    url: "/atelier",
    alarm: true,
  });
}
