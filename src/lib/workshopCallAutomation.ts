import { makeThreeCxCall } from "@/lib/threeCxApi";

// Fixed to this shop's actual 3CX numbering plan (confirmed with the
// owner directly, not user-configurable — these don't change day to day
// the way a repair's own mechanic/customer does):
//   100 = "Standard" (front-desk extension)
//   105 = Ghassan (parts)
const STANDARD_DN = "100";
const GHASSAN_DN = "105";

/** "En attente de pièce": have the Standard extension (100) call Ghassan
 * (105) directly — a plain two-party internal call, no automated message
 * involved (unlike the customer-facing statuses, this one was never
 * meant to play a recording). Never throws into the caller: a status
 * change must always succeed even if the phone call side of it fails
 * (3CX down, Ghassan's line busy, etc.) — this only logs server-side.
 * Returns whether the call was actually placed, so the caller can
 * surface a toast without treating it as a hard error. */
export async function callGhassanForMissingPart(repairLabel: string): Promise<boolean> {
  try {
    await makeThreeCxCall(STANDARD_DN, GHASSAN_DN, `Atelier — pièce nécessaire (${repairLabel})`);
    return true;
  } catch (err) {
    console.error("3CX: failed to call Ghassan for a missing-part status change", err);
    return false;
  }
}

// NOTE — "En attente client" and "Terminé" are meant to auto-call the
// customer and, once they answer, play a recorded message (a different
// one per status). 3CX's Call Control API cannot play a file over an
// active call by itself — reaching that customer's phone from `makecall`
// only gets Standard's own extension on the line, not a message. The
// documented way to get an automatic message is: place the call, then
// once answered, bridge/transfer it to a Digital Receptionist extension
// configured in the 3CX admin console to play that one fixed file.
// Blocked for now on: (1) the two audio files (not ready yet), and
// (2) creating those two Digital Receptionists in the 3CX admin panel.
// Once both exist, this file is where their call-and-transfer logic
// belongs — same shape as callGhassanForMissingPart, plus a
// transfer-on-answer step this simpler case doesn't need.
