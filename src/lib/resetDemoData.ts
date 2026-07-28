// Keys intentionally left untouched: the session (evotasks.session.v1) and
// theme (evotasks.theme) preferences, so resetting demo data doesn't sign
// the user out or flip their theme. Everything else under the "evotasks."
// prefix is cleared — a rule, not a hardcoded list, so a new feature that
// adds a new storage key can't silently be left out of a reset (that used to
// happen: evotasks.teams.v1 was missing here until a seed-data change made
// the gap visible as stale/mismatched team membership).
const PRESERVED_KEYS = new Set(["evotasks.session.v1", "evotasks.theme"]);

export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith("evotasks.") && !PRESERVED_KEYS.has(key)) {
      window.localStorage.removeItem(key);
    }
  }
}
