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

export function isDueSoon(iso: string | null): boolean {
  if (!iso) return false;
  const due = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const diff = due.getTime() - today.getTime();
  return diff >= 0 && diff <= DAY_MS * 2;
}

export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toISOString();
}
