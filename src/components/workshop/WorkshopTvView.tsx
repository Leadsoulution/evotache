"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetchWorkshopTvRepairs } from "@/services/workshopApi";
import { WORKSHOP_STATUS_COLOR, WORKSHOP_STATUS_LABEL } from "@/lib/workshopStats";
import { WrenchIcon } from "@/components/ui/icons";
import type { WorkshopTvRepair } from "@/types/workshop";

const REFRESH_MS = 8_000;
const CARDS_PER_PAGE = 4;
const PAGE_INTERVAL_MS = 8_000;

/** Unattended client-facing display for a TV in the shop's waiting area —
 * no login, no interaction expected, fixed light theme regardless of the
 * viewing browser's own dark-mode setting (a kiosk shouldn't flip look
 * depending on some earlier visitor's preference). Data comes from the
 * public /api/workshop/tv route, which already strips everything not
 * meant for a customer to see (no name/phone/price/notes/chrono). */
export function WorkshopTvView() {
  const { data } = useSWR<WorkshopTvRepair[]>("workshop-tv", fetchWorkshopTvRepairs, { refreshInterval: REFRESH_MS });
  const repairs = data ?? [];
  const pageCount = Math.max(1, Math.ceil(repairs.length / CARDS_PER_PAGE));

  // An ever-incrementing counter, never reset — the actual page shown is
  // always derived from it (`% pageCount`), so a change in how many pages
  // there are just changes the modulo, never needs the counter itself
  // reset or the interval restarted.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), PAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
  const page = tick % pageCount;

  const visible = repairs.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-slate-100 px-10 py-10 text-slate-900">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight">Atelier — Suivi des réparations</h1>
        {pageCount > 1 && (
          <div className="flex gap-1.5">
            {Array.from({ length: pageCount }).map((_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i === page ? "bg-slate-700" : "bg-slate-300"}`} />
            ))}
          </div>
        )}
      </header>

      {visible.length === 0 ? (
        <p className="mt-20 text-center text-2xl text-slate-400">Aucune moto en atelier pour le moment.</p>
      ) : (
        <div className="flex flex-1 flex-col gap-6">
          {visible.map((repair) => (
            <WorkshopTvCard key={repair.id} repair={repair} />
          ))}
        </div>
      )}
    </div>
  );
}

// Matches the reference image's principle: a small flag-shaped tab (angled
// cut on its right edge, like a ticket stub) overlapping the top-left
// corner of a thick-bordered, heavily-rounded card — not a full-width
// colored header bar. The tab carries the status (the reference's own
// "STEP 01" text was just its placeholder content, not part of the shape
// to keep) instead of a step number.
function WorkshopTvCard({ repair }: { repair: WorkshopTvRepair }) {
  const color = repair.isLate ? "#ef4444" : WORKSHOP_STATUS_COLOR[repair.status];
  const label = repair.isLate ? "En retard" : WORKSHOP_STATUS_LABEL[repair.status];

  return (
    <div className="relative pt-5">
      <div
        className="absolute left-8 top-0 z-10 px-6 py-2.5 text-lg font-bold uppercase tracking-wide text-white shadow-md"
        style={{ backgroundColor: color, clipPath: "polygon(0 0, 100% 0, calc(100% - 22px) 100%, 0 100%)" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-6 rounded-[2rem] border-[3px] bg-white px-8 py-7 shadow-lg" style={{ borderColor: color }}>
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1f`, color }}>
          <WrenchIcon className="h-7 w-7" />
        </span>
        <span className="h-14 w-px shrink-0 bg-slate-200" />
        <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span className="text-3xl font-bold tracking-tight text-slate-800">{repair.orderNumber}</span>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">
              {repair.brand} {repair.model}
            </p>
            <p className="text-lg text-slate-500">{[repair.year, repair.engineCc ? `${repair.engineCc} cc` : null].filter(Boolean).join(" • ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
