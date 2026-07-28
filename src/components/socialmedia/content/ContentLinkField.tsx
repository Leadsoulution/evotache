"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import { LinkIcon, PencilIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface ContentLinkFieldProps {
  value: string | null;
  onChange: (next: string | null) => void;
  readOnly?: boolean;
  className?: string;
}

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Inline-editable "link to the published post" field, used both in dialogs and directly in the list view. */
export function ContentLinkField({ value, onChange, readOnly, className }: ContentLinkFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function commit() {
    onChange(normalizeUrl(draft));
    setEditing(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") {
      setDraft(value ?? "");
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        placeholder="https://…"
        className={cn(
          "w-full min-w-[140px] rounded-md border border-indigo-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 dark:border-indigo-700 dark:bg-slate-900 dark:text-slate-100",
          className
        )}
      />
    );
  }

  if (value) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <LinkIcon className="h-3 w-3" />
          Open
        </a>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            className="rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800"
            aria-label="Edit link"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  }

  if (readOnly) return <span className={cn("text-xs text-slate-400", className)}>—</span>;

  return (
    <button
      type="button"
      onClick={() => {
        setDraft("");
        setEditing(true);
      }}
      className={cn("inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400", className)}
    >
      <PlusIcon className="h-3 w-3" />
      Add link
    </button>
  );
}
