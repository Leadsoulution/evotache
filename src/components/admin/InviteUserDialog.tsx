"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { ROLE_CONFIG, ROLE_ORDER } from "@/config/roleMeta";
import { cn } from "@/lib/cn";
import type { Role } from "@/types/user";

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7", "#ef4444"];

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; email: string; password: string; role: Role; color: string }) => Promise<boolean>;
}

export function InviteUserDialog({ open, onClose, onSubmit }: InviteUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("member");
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const success = await onSubmit({ name: name.trim(), email: email.trim(), password, role, color });
    setSubmitting(false);
    if (success) handleClose();
    else setError("Couldn't add this user. Check the email isn't already in use.");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-user-title"
        className="w-full max-w-sm animate-scale-in rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="invite-user-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Add user
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Full name</span>
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClass} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Temporary password</span>
            <input type="text" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className={inputClass} />
          </label>

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Role</legend>
            <div className="flex flex-col gap-1.5">
              {ROLE_ORDER.map((roleOption) => (
                <label
                  key={roleOption}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2",
                    role === roleOption ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  <input type="radio" name="role" checked={role === roleOption} onChange={() => setRole(roleOption)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{ROLE_CONFIG[roleOption].label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{ROLE_CONFIG[roleOption].description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add user"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
