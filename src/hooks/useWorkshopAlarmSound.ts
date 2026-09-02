"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { fetchWorkshopRepairs } from "@/services/workshopApi";
import type { WorkshopRepair } from "@/types/workshop";

const POLL_MS = 15_000;

// Fixed — same Ghassan id as workshopNotify.ts's server-side push trigger.
const GHASSAN_USER_ID = "cms7ibezf00015e4kgybk5ugs";

interface RepairSnapshot {
  status: string;
  serviceIds: Set<string>;
}

/** Plays a loud alarm beep (synthesized via Web Audio — no audio file to
 * ship) whenever this poll notices something relevant to the current
 * user just happened in the Atelier — complements the push notification
 * (workshopNotify.ts), which only carries the phone's quiet default
 * sound since browsers dropped custom push sounds years ago. Only fires
 * while a page is actually open (a beep needs a live AudioContext), so
 * it's the "app left open on a tablet at the workstation" case, not the
 * "phone in a pocket" one — that one still gets the push notification.
 * Mounted globally in AppShell (not just on /atelier) so it fires no
 * matter which page is open; shares useWorkshopRepairs' own SWR key so
 * this doesn't double the poll. */
export function useWorkshopAlarmSound() {
  const { user } = useAuth();
  const { data } = useSWR<WorkshopRepair[]>(user ? "workshop-repairs" : null, fetchWorkshopRepairs, { refreshInterval: POLL_MS });
  const prevRef = useRef<Map<string, RepairSnapshot> | null>(null);

  useEffect(() => {
    if (!user || !data) return;
    const prev = prevRef.current;

    // Skip the very first tick after mount/login — nothing is "new" yet,
    // it's just the baseline to diff future polls against.
    if (prev) {
      let shouldBeep = false;
      for (const repair of data) {
        const before = prev.get(repair.id);

        if (repair.mechanicId === user.id) {
          for (const service of repair.services) {
            if (!before?.serviceIds.has(service.id)) shouldBeep = true;
          }
        }

        if (before && before.status !== repair.status) {
          if (repair.status === "waiting_part" && user.id === GHASSAN_USER_ID) shouldBeep = true;
          if ((repair.status === "waiting_client" || repair.status === "ready") && user.id === repair.createdBy) shouldBeep = true;
        }
      }
      if (shouldBeep) playAlarmBeep();
    }

    prevRef.current = new Map(data.map((r) => [r.id, { status: r.status, serviceIds: new Set(r.services.map((s) => s.id)) }]));
  }, [data, user]);
}

function playAlarmBeep(): void {
  try {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;
    // Three short alternating-pitch beeps — reads as an alert, not a chime.
    [0, 0.35, 0.7].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    });
    setTimeout(() => ctx.close(), 1300);
  } catch {
    // Autoplay policy can keep an AudioContext suspended until the page
    // has seen at least one user gesture — nothing actionable here beyond
    // that; the push notification's own (quiet) sound still gets through.
  }
}
