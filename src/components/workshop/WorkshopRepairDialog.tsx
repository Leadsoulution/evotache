"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { XIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { fromDateInputValue, fromDateTimeInputValue } from "@/lib/date";
import { WorkshopMechanicMenu } from "./WorkshopMechanicMenu";
import type { Assignee } from "@/types/task";
import type { WorkshopRepairDraft } from "@/types/workshop";

interface WorkshopRepairDialogProps {
  open: boolean;
  mechanics: Assignee[];
  onClose: () => void;
  onSubmit: (draft: WorkshopRepairDraft) => Promise<boolean>;
}

interface ServiceDraftRow {
  description: string;
  scheduledDate: string; // datetime-local value
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";
const labelClass = "mb-1 block font-medium text-slate-700 dark:text-slate-300";

const EMPTY_SERVICE: ServiceDraftRow = { description: "", scheduledDate: "" };

/** The commercial's creation form — "AJOUTER À L'ATELIER". Entry date is
 * server-set (Task.createdAt-style @default(now())), never a field here.
 * A bike can need several distinct jobs (e.g. "Plaquettes" + "Pneus"), so
 * the form takes a list of them instead of one free-text field. */
export function WorkshopRepairDialog({ open, mechanics, onClose, onSubmit }: WorkshopRepairDialogProps) {
  const [orderNumber, setOrderNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engineCc, setEngineCc] = useState("");
  const [registration, setRegistration] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [services, setServices] = useState<ServiceDraftRow[]>([EMPTY_SERVICE]);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setOrderNumber("");
      setBrand("");
      setModel("");
      setYear("");
      setEngineCc("");
      setRegistration("");
      setCustomerPhone("");
      setServices([EMPTY_SERVICE]);
      setMechanicId(null);
      setExpectedCompletionDate("");
    }
  }

  if (!open) return null;

  function updateService(index: number, patch: Partial<ServiceDraftRow>) {
    setServices((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const success = await onSubmit({
      orderNumber: orderNumber.trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: year ? Number(year) : null,
      engineCc: engineCc ? Number(engineCc) : null,
      registration: registration.trim() || null,
      customerPhone: customerPhone.trim() || null,
      mechanicId,
      expectedCompletionDate: fromDateInputValue(expectedCompletionDate),
      services: services
        .filter((s) => s.description.trim())
        .map((s) => ({ description: s.description.trim(), scheduledDate: fromDateTimeInputValue(s.scheduledDate) })),
    });
    setSubmitting(false);
    if (success) onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workshop-repair-dialog-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col animate-scale-in rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h2 id="workshop-repair-dialog-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Nouvelle moto — Atelier
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
          <label className="block text-sm">
            <span className={labelClass}>N° bon de commande</span>
            <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required placeholder="BC-2026-0125" className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className={labelClass}>Marque</span>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} required placeholder="Suzuki" className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className={labelClass}>Modèle</span>
              <input value={model} onChange={(e) => setModel(e.target.value)} required placeholder="V-Strom 650 XT" className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">
              <span className={labelClass}>Année</span>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className={labelClass}>Cylindrée / CC</span>
              <input type="number" value={engineCc} onChange={(e) => setEngineCc(e.target.value)} placeholder="650" className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className={labelClass}>Immatriculation</span>
              <input value={registration} onChange={(e) => setRegistration(e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="block text-sm">
            <span className={labelClass}>Téléphone client</span>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className={inputClass}
            />
          </label>

          <div>
            <span className={labelClass}>Prestations demandées</span>
            <div className="flex flex-col gap-2">
              {services.map((service, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={service.description}
                    onChange={(e) => updateService(index, { description: e.target.value })}
                    placeholder={index === 0 ? "Révision + vidange" : "Changement des pneus"}
                    className={inputClass}
                  />
                  <input
                    type="datetime-local"
                    value={service.scheduledDate}
                    onChange={(e) => updateService(index, { scheduledDate: e.target.value })}
                    title="Date et heure prévues"
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setServices((current) => current.filter((_, i) => i !== index))}
                      className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                      aria-label="Retirer cette prestation"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setServices((current) => [...current, { ...EMPTY_SERVICE }])}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Ajouter une prestation
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="block text-sm">
              <span className={labelClass}>Mécanicien</span>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                <WorkshopMechanicMenu mechanics={mechanics} value={mechanicId} onChange={setMechanicId} />
              </div>
            </div>
            <label className="block text-sm">
              <span className={labelClass}>Date prévue (globale)</span>
              <input type="date" value={expectedCompletionDate} onChange={(e) => setExpectedCompletionDate(e.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !orderNumber.trim() || !brand.trim() || !model.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Ajout…" : "Ajouter à l'atelier"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
