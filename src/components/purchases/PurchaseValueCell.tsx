"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Menu } from "@/components/ui/Menu";
import { ContentLinkField } from "@/components/socialmedia/content/ContentLinkField";
import { MediaLightbox } from "@/components/ui/MediaLightbox";
import type { MediaPreview } from "@/components/ui/MediaLightbox";
import { ChevronDownIcon, ImageIcon, VideoIcon, XIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { formatBytes } from "@/lib/attachmentUtils";
import { getBadgeStyle } from "@/lib/badgeColor";
import { MAX_PURCHASE_FILE_BYTES } from "@/services/purchaseApi";
import { cn } from "@/lib/cn";
import type { PurchaseColumnDef } from "@/types/purchase";

interface PurchaseValueCellProps {
  column: PurchaseColumnDef;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const textInputClass =
  "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 outline-none hover:border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:text-slate-200 dark:hover:border-slate-700 dark:focus:ring-indigo-950";

export function PurchaseValueCell({ column, value, onChange, readOnly }: PurchaseValueCellProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const [preview, setPreview] = useState<MediaPreview | null>(null);

  // Keep the local draft in sync whenever the committed value changes from
  // outside this cell (e.g. after a save round-trip) — render-time reset,
  // same pattern used by the dialogs elsewhere in this app.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PURCHASE_FILE_BYTES) {
      toast.error(`"${file.name}" exceeds ${formatBytes(MAX_PURCHASE_FILE_BYTES)}.`);
      return;
    }
    onChange(await readFileAsDataUrl(file));
  }

  if (column.type === "text") {
    if (readOnly) return <span className="block truncate px-2 py-1 text-sm text-slate-700 dark:text-slate-200">{value || "—"}</span>;
    return (
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== value) onChange(draft);
        }}
        placeholder="Empty"
        aria-label={column.name}
        className={textInputClass}
      />
    );
  }

  if (column.type === "number") {
    if (readOnly) return <span className="block truncate px-2 py-1 text-sm text-slate-700 dark:text-slate-200">{value || "—"}</span>;
    return (
      <input
        type="number"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== value) onChange(draft);
        }}
        placeholder="0"
        aria-label={column.name}
        className={textInputClass}
      />
    );
  }

  if (column.type === "date") {
    if (readOnly) return <span className="block truncate px-2 py-1 text-sm text-slate-700 dark:text-slate-200">{value || "—"}</span>;
    return (
      <input
        type="date"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value);
        }}
        aria-label={column.name}
        className={textInputClass}
      />
    );
  }

  if (column.type === "dropdown") {
    const selected = column.options.find((option) => option.label === value) ?? null;
    if (readOnly) {
      return (
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-1 text-xs font-medium",
            !selected && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          )}
          style={selected ? getBadgeStyle(selected.color) : undefined}
        >
          {value || "—"}
        </span>
      );
    }
    const options = [
      { value: "", label: "—" },
      ...column.options.map((option) => ({
        value: option.label,
        label: option.label,
        icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />,
      })),
    ];
    return (
      <Menu
        options={options}
        value={[value]}
        onChange={(next) => onChange(next[0] ?? "")}
        ariaLabel={`Set ${column.name}`}
        renderTrigger={({ open }) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
              !selected && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
              open && "ring-2 ring-indigo-400"
            )}
            style={selected ? getBadgeStyle(selected.color) : undefined}
          >
            {value || "—"}
            <ChevronDownIcon className="h-3 w-3 opacity-60" />
          </span>
        )}
      />
    );
  }

  if (column.type === "link") {
    return <ContentLinkField value={value || null} onChange={(next) => onChange(next ?? "")} readOnly={readOnly} />;
  }

  if (column.type === "image") {
    if (value) {
      return (
        <>
          <span className="group relative inline-block">
            <button
              type="button"
              onClick={() => setPreview({ kind: "image", src: value, name: column.name })}
              className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={`View ${column.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt={column.name} className="h-10 w-10 cursor-pointer rounded-md object-cover" />
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white group-hover:flex"
                aria-label={`Remove ${column.name}`}
              >
                <XIcon className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
          <MediaLightbox media={preview} onClose={() => setPreview(null)} />
        </>
      );
    }
    if (readOnly) return <span className="text-xs text-slate-400">—</span>;
    return (
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700"
        aria-label={`Upload ${column.name}`}
      >
        <ImageIcon className="h-4 w-4" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
      </button>
    );
  }

  // video
  if (value) {
    return (
      <>
        <span className="group relative inline-block">
          <button
            type="button"
            onClick={() => setPreview({ kind: "video", src: value, name: column.name })}
            className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={`View ${column.name}`}
          >
            <video src={value} className="h-10 w-16 cursor-pointer rounded-md bg-black object-cover" muted />
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white group-hover:flex"
              aria-label={`Remove ${column.name}`}
            >
              <XIcon className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
        <MediaLightbox media={preview} onClose={() => setPreview(null)} />
      </>
    );
  }
  if (readOnly) return <span className="text-xs text-slate-400">—</span>;
  return (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-700"
      aria-label={`Upload ${column.name}`}
    >
      <VideoIcon className="h-4 w-4" />
      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="sr-only" />
    </button>
  );
}
