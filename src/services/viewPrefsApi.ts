const STORAGE_KEY = "evotasks.viewprefs.v1";

export interface ViewPrefs {
  hiddenColumnIds: string[];
}

const DEFAULT_PREFS: ViewPrefs = { hiddenColumnIds: [] };

function readMap(): Record<string, ViewPrefs> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ViewPrefs>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, ViewPrefs>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function getViewPrefs(userId: string): Promise<ViewPrefs> {
  const map = readMap();
  return map[userId] ?? DEFAULT_PREFS;
}

export async function saveViewPrefs(userId: string, prefs: ViewPrefs): Promise<void> {
  const map = readMap();
  map[userId] = prefs;
  writeMap(map);
}
