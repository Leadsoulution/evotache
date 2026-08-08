"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SaveCallFilterModalProps {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function SaveCallFilterModal({ open, saving, onClose, onSave }: SaveCallFilterModalProps) {
  const [name, setName] = useState("");
  const [wasOpen, setWasOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the field whenever the modal transitions to open — computed
  // during render rather than in an effect, so it happens in the same
  // commit instead of triggering an extra one.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setName("");
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm animate-scale-in rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Enregistrer le filtre</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Donne un nom à cette combinaison de filtres pour la retrouver rapidement plus tard.</p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex. Manqués cette semaine"
          className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-indigo-950"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
