const STORAGE_KEY = "evotasks.lastViewed.v1";
const NETWORK_DELAY_MS = 100;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readMap(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, Record<string, string>>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Per-user, per-module "I last looked at this" timestamps — drives the WhatsApp-style unread badges in the nav. */
export async function getLastViewed(userId: string): Promise<Record<string, string>> {
  await delay(NETWORK_DELAY_MS);
  return readMap()[userId] ?? {};
}

export async function markViewed(userId: string, moduleKey: string): Promise<void> {
  await delay(NETWORK_DELAY_MS);
  const map = readMap();
  map[userId] = { ...(map[userId] ?? {}), [moduleKey]: new Date().toISOString() };
  writeMap(map);
}
