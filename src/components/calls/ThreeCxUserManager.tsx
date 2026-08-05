"use client";

import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ColorSwatchPicker } from "@/components/admin/ColorSwatchPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Avatar } from "@/components/ui/Avatar";
import { EyeIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { InternalUser } from "@/lib/callStats";

interface ThreeCxUserManagerProps {
  open: boolean;
  users: InternalUser[];
  onClose: () => void;
  onSave: (dn: string, patch: { name?: string; color?: string; hidden?: boolean }) => Promise<void>;
}

/** Manage-users modal for the Calls page — lets the auto-detected 3CX
 * extensions be renamed, recolored, or hidden (a soft "delete": the call
 * history stays, only the picker/charts stop showing that extension).
 * Mirrors EditableOptionList's row layout (ColorSwatchPicker + inline
 * rename input + trash) but swaps the destructive delete for a
 * hide/restore toggle, since these rows aren't user-created records. */
export function ThreeCxUserManager({ open, users, onClose, onSave }: ThreeCxUserManagerProps) {
  const [pendingHideDn, setPendingHideDn] = useState<string | null>(null);
  if (!open) return null;

  const pendingUser = users.find((u) => u.dn === pendingHideDn) ?? null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="threecx-user-manager-title"
        className="flex max-h-[80vh] w-full max-w-md animate-scale-in flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 id="threecx-user-manager-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Utilisateurs 3CX
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <ul className="overflow-y-auto">
          {users.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">Aucun utilisateur détecté pour l&apos;instant.</li>}
          {users.map((u) => (
            <UserRow key={u.dn} user={u} onSave={onSave} onRequestHide={() => setPendingHideDn(u.dn)} />
          ))}
        </ul>

        <ConfirmDialog
          open={pendingHideDn !== null}
          title="Masquer cet utilisateur ?"
          description={pendingUser ? `"${pendingUser.name}" (${pendingUser.dn}) sera masqué du filtre et des graphiques. L'historique de ses appels reste intact — tu peux le restaurer à tout moment.` : ""}
          confirmLabel="Masquer"
          destructive
          onConfirm={async () => {
            if (pendingHideDn) await onSave(pendingHideDn, { hidden: true });
            setPendingHideDn(null);
          }}
          onCancel={() => setPendingHideDn(null)}
        />
      </div>
    </div>,
    document.body
  );
}

interface UserRowProps {
  user: InternalUser;
  onSave: (dn: string, patch: { name?: string; color?: string; hidden?: boolean }) => Promise<void>;
  onRequestHide: () => void;
}

function UserRow({ user, onSave, onRequestHide }: UserRowProps) {
  const [name, setName] = useState(user.name);

  function commit() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== user.name) onSave(user.dn, { name: trimmed });
    else setName(user.name);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      (event.target as HTMLInputElement).blur();
    }
    if (event.key === "Escape") {
      setName(user.name);
      (event.target as HTMLInputElement).blur();
    }
  }

  return (
    <li className={cn("flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-slate-800", user.hidden && "opacity-50")}>
      <ColorSwatchPicker value={user.color} onChange={(color) => onSave(user.dn, { color })} />
      <Avatar name={user.name} color={user.color} size="sm" />
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-label={`Renommer ${user.name}`}
        className="flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-slate-800 hover:border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:ring-indigo-950"
      />
      <span className="shrink-0 text-xs text-slate-400">{user.dn}</span>
      {user.hidden ? (
        <button
          type="button"
          onClick={() => onSave(user.dn, { hidden: false })}
          className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
          aria-label={`Restaurer ${user.name}`}
          title="Restaurer"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onRequestHide}
          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label={`Masquer ${user.name}`}
          title="Masquer"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
