// A stale cached page (browser HTTP cache, or an upstream proxy/CDN cache
// on the hosting side) can keep referencing JS chunk URLs from a previous
// deploy that no longer exist on the server — that fails as an opaque error
// with no visible message, which is what a "blank page" crash usually is.
// The fix isn't more caching logic, it's detecting this one specific error
// shape and forcing a hard reload to fetch the current page fresh.
const RELOAD_GUARD_KEY = "evotasks.chunkErrorReloaded";

export function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /loading chunk [\d\w]+ failed/i.test(error.message) ||
    /failed to fetch dynamically imported module/i.test(error.message) ||
    /importing a module script failed/i.test(error.message)
  );
}

/** Reloads once per browser session for this error class — never loops if the reload itself doesn't fix it. */
export function recoverFromChunkError(): boolean {
  if (typeof window === "undefined") return false;
  if (window.sessionStorage.getItem(RELOAD_GUARD_KEY)) return false;
  window.sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  window.location.reload();
  return true;
}
