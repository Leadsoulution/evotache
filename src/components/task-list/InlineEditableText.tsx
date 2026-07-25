"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { cn } from "@/lib/cn";

interface InlineEditableTextProps {
  value: string;
  onSubmit: (next: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel: string;
  readOnly?: boolean;
}

export function InlineEditableText({ value, onSubmit, placeholder, className, ariaLabel, readOnly }: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSubmit(trimmed);
    else setDraft(value);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  if (readOnly) {
    return (
      <span className={cn("block w-full truncate px-2 py-1 text-left text-sm text-slate-700 dark:text-slate-300", className)}>
        {value || <span className="text-slate-400">{placeholder}</span>}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-indigo-400 bg-white px-2 py-1 text-sm outline-none ring-2 ring-indigo-200 dark:border-indigo-500 dark:bg-slate-900 dark:ring-indigo-900",
          className
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={cn(
        "w-full truncate rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800",
        className
      )}
    >
      {value || <span className="text-slate-400">{placeholder}</span>}
    </button>
  );
}
