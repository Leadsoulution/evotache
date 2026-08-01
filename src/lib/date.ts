const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isCurrentYear(date: Date): boolean {
  return date.getFullYear() === new Date().getFullYear();
}

export function formatDueDate(iso: string | null): string {
  if (!iso) return "No due date";
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: isCurrentYear(date) ? undefined : "numeric",
  });
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const due = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  return due.getTime() < today.getTime();
}

export function isDueToday(iso: string | null): boolean {
  if (!iso) return false;
  const due = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  return due.getTime() === today.getTime();
}

export function isToday(iso: string): boolean {
  return startOfDay(new Date(iso)).getTime() === startOfDay(new Date()).getTime();
}

export function isDueSoon(iso: string | null): boolean {
  if (!iso) return false;
  const due = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const diff = due.getTime() - today.getTime();
  return diff >= 0 && diff <= DAY_MS * 2;
}

export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  // Read back the *local* calendar date, not a naive slice of the UTC
  // string — fromDateInputValue() stores local midnight converted to UTC,
  // so in any timezone ahead of UTC that UTC string's date is one day
  // earlier than what the user picked.
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toISOString();
}

/** Same local-time reasoning as toDateInputValue(), extended with hours/minutes for `<input type="datetime-local">`. */
export function toDateTimeInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDateTimeInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDueDate(iso);
}
