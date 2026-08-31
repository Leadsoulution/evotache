"use client";

import { useEffect, useState } from "react";
import { workshopSessionElapsedSeconds } from "@/lib/workshopStats";
import type { WorkshopSession } from "@/types/workshop";

/** Live-ticking elapsed seconds for a chrono session — purely a display
 * concern. The real value always lives in `session.accumulatedSeconds` /
 * `session.runningSince` (server-persisted), this just re-renders once a
 * second while running so the on-screen number keeps counting up; it never
 * invents or resets time itself. */
export function useWorkshopChrono(session: WorkshopSession | null): number {
  const [tick, setTick] = useState(0);
  const isRunning = Boolean(session?.runningSince);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // `tick` is read only to force a re-render each second — the actual
  // elapsed value is always recomputed fresh from the session.
  void tick;
  return workshopSessionElapsedSeconds(session);
}
