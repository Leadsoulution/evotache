const STORAGE_KEY = "evotasks.viewprefs.v1";

export interface ViewPrefs {
  hiddenColumnIds: string[];
  columnWidths: Record<string, number>;
  /** Column ids in the user's preferred left-to-right order. Ids not listed keep their natural/default order, appended after the listed ones. */
  columnOrder: string[];
  /** Rows per page across every paginated table; "all" disables pagination. */
  pageSize: number | "all";
}

const DEFAULT_PREFS: ViewPrefs = { hiddenColumnIds: [], columnWidths: {}, columnOrder: [], pageSize: 25 };

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
  // Spread over the defaults so prefs saved before a field existed (e.g.
  // columnWidths) don't come back `undefined` and break consumers.
  return { ...DEFAULT_PREFS, ...map[userId] };
}

export async function saveViewPrefs(userId: string, prefs: ViewPrefs): Promise<void> {
  const map = readMap();
  map[userId] = prefs;
  writeMap(map);
}
