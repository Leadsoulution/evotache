// Keys intentionally left untouched: the session (evotasks.session.v1) and
// theme (evotasks.theme) preferences, so resetting demo data doesn't sign
// the user out or flip their theme.
const RESETTABLE_KEYS = [
  "evotasks.tasks.v1",
  "evotasks.users.v1",
  "evotasks.projects.v1",
  "evotasks.statuses.v1",
  "evotasks.priorities.v1",
  "evotasks.customfields.v1",
  "evotasks.attachments.v1",
  "evotasks.viewprefs.v1",
];

export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  for (const key of RESETTABLE_KEYS) {
    window.localStorage.removeItem(key);
  }
}
