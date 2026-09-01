"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetchWorkshopTvRepairs } from "@/services/workshopApi";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL } from "@/lib/workshopStats";
import { MinusIcon, PlusIcon, RefreshIcon } from "@/components/ui/icons";
import type { WorkshopTvRepair } from "@/types/workshop";

const REFRESH_MS = 8_000;
const ZOOM_STORAGE_KEY = "atelier-tv-zoom";
const ZOOM_STEP = 10;
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;

/** Every physical TV/screen this runs on renders CSS pixels at a
 * different apparent size (a 50" TV up close on a wall isn't the same as
 * a desktop monitor) — there's no way to ask the browser for the "right"
 * size automatically, so this is a manual, remembered-per-device zoom
 * instead of a fixed layout. Stored in this browser's localStorage (not
 * account-wide — deliberately, since it's a property of the physical
 * screen, not the person), so once someone dials it in on a given TV, it
 * stays that way across refreshes/reboots without needing to touch it
 * again. Uses the CSS `zoom` property (Chromium/Safari — what every
 * smart-TV browser and Chromecast/Fire TV stick in practice runs) so the
 * whole layout reflows instead of just visually scaling with empty gaps. */
function useTvZoom() {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const stored = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored >= ZOOM_MIN && stored <= ZOOM_MAX) setZoom(stored);
  }, []);

  function apply(next: number) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    setZoom(clamped);
    localStorage.setItem(ZOOM_STORAGE_KEY, String(clamped));
  }

  return { zoom, zoomIn: () => apply(zoom + ZOOM_STEP), zoomOut: () => apply(zoom - ZOOM_STEP), reset: () => apply(100) };
}

/** Unattended client-facing display for a TV in the shop's waiting area —
 * no login, no interaction expected, fixed light theme regardless of the
 * viewing browser's own dark-mode setting (a kiosk shouldn't flip look
 * depending on some earlier visitor's preference). Data comes from the
 * public /api/workshop/tv route, which already strips everything not
 * meant for a customer to see (no name/phone/price/notes/chrono).
 * Everything on screen at once, on a single page — no auto-rotating
 * pagination — so the numbering (1st, 2nd, 3rd…) always reads top to
 * bottom in one glance; the list itself just scrolls if it gets long. */
export function WorkshopTvView() {
  const { data } = useSWR<WorkshopTvRepair[]>("workshop-tv", fetchWorkshopTvRepairs, { refreshInterval: REFRESH_MS });
  const repairs = data ?? [];
  const { zoom, zoomIn, zoomOut, reset } = useTvZoom();

  return (
    <>
      <div className="flex h-screen flex-col gap-8 overflow-hidden bg-slate-100 px-10 py-10 text-slate-900" style={{ zoom: `${zoom}%` }}>
        <header className="flex justify-center py-2" style={{ perspective: "600px" }}>
          <h1
            className="tv-title-3d bg-gradient-to-br from-indigo-600 via-indigo-500 to-slate-700 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent"
            style={{ textShadow: "0 6px 24px rgba(79,70,229,0.25)" }}
          >
            Atelier — Suivi des réparations
          </h1>
        </header>

        {repairs.length === 0 ? (
          <p className="mt-20 text-center text-2xl text-slate-400">Aucune moto en atelier pour le moment.</p>
        ) : (
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
            {repairs.map((repair) => (
              <WorkshopTvCard key={repair.id} repair={repair} />
            ))}
          </div>
        )}
      </div>

      {/* Deliberately a sibling of the zoomed container, not inside it —
          this control must stay a consistent, usable size regardless of
          the zoom level it's adjusting. Dim and corner-tucked since a
          customer never needs it; whoever installs the TV taps it once
          and it's done. */}
      <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-1.5 text-white opacity-40 shadow-lg transition-opacity hover:opacity-100">
        <button type="button" onClick={zoomOut} aria-label="Réduire" className="rounded-full p-1.5 hover:bg-white/10">
          <MinusIcon className="h-4 w-4" />
        </button>
        <span className="min-w-[3ch] text-center text-xs font-semibold tabular-nums">{zoom}%</span>
        <button type="button" onClick={zoomIn} aria-label="Agrandir" className="rounded-full p-1.5 hover:bg-white/10">
          <PlusIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={reset} aria-label="Réinitialiser (100%)" title="Réinitialiser (100%)" className="ml-1 rounded-full p-1.5 hover:bg-white/10">
          <RefreshIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}

// Three-zone layout, thick-bordered and heavily-rounded: this bike's
// number in the list on the left, the bike + its prestations (as bullets)
// in the middle, and the status pill all the way on the right — no order
// number/year (internal reference numbers, not customer-facing) and no
// "En retard" (that's an internal-only signal, see isWorkshopRepairLate's
// docs) — just what a customer actually needs to see.
function WorkshopTvCard({ repair }: { repair: WorkshopTvRepair }) {
  const color = WORKSHOP_STATUS_COLOR[repair.status];
  const label = WORKSHOP_STATUS_LABEL[repair.status];

  return (
    <div className="flex items-center gap-6 rounded-[1.75rem] border-[3px] bg-white px-8 py-7 shadow-lg" style={{ borderColor: color }}>
      <span
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold tabular-nums"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        {repair.displayNumber}
      </span>
      <span className="h-14 w-px shrink-0 bg-slate-200" />
      <div className="min-w-0 flex-1">
        <p className="text-3xl font-bold uppercase tracking-tight text-slate-900">
          {repair.brand} {repair.model}
        </p>
        {repair.engineCc && <p className="text-lg text-slate-500">{repair.engineCc} cc</p>}
        {repair.services.length > 0 && (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-lg text-slate-600">
            {repair.services.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        )}
      </div>
      <span className="shrink-0 rounded-full px-5 py-2 text-lg font-bold uppercase tracking-wide text-white" style={{ backgroundColor: color }}>
        {label}
      </span>
    </div>
  );
}
