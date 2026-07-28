"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Menu } from "@/components/ui/Menu";
import { MediaLightbox } from "@/components/ui/MediaLightbox";
import type { MediaPreview } from "@/components/ui/MediaLightbox";
import { ContentLinkField } from "@/components/socialmedia/content/ContentLinkField";
import { ChevronDownIcon, ImageIcon, VideoIcon, XIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { formatBytes } from "@/lib/attachmentUtils";
import { getBadgeStyle } from "@/lib/badgeColor";
import { MAX_CUSTOM_FIELD_FILE_BYTES } from "@/services/customFieldApi";
import { cn } from "@/lib/cn";
import type { CustomFieldDef } from "@/types/customField";

interface CustomFieldCellProps {
  field: CustomFieldDef;
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

export function CustomFieldCell({ field, value, onChange, readOnly }: CustomFieldCellProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<MediaPreview | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_CUSTOM_FIELD_FILE_BYTES) {
      toast.error(`"${file.name}" exceeds ${formatBytes(MAX_CUSTOM_FIELD_FILE_BYTES)}.`);
      return;
    }
    onChange(await readFileAsDataUrl(file));
  }

  if (field.type === "select") {
    const selected = field.options.find((option) => option.label === value) ?? null;
    if (readOnly || field.options.length === 0) {
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
      ...field.options.map((option) => ({
        value: option.label,
        label: option.label,
        icon: <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />,
      })),
    ];
    return (
      <Menu
        options={options}
        value={value ? [value] : []}
        onChange={(next) => onChange(next[0] ?? "")}
        ariaLabel={`Set ${field.name}`}
        align="end"
        renderTrigger={({ open }) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
              !selected && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
              open && "ring-2 ring-indigo-400"
            )}
            style={selected ? getBadgeStyle(selected.color) : undefined}
          >
            {value || <span className="text-slate-400">Select…</span>}
            <ChevronDownIcon className="h-3 w-3 opacity-60" />
          </span>
        )}
      />
    );
  }

  if (field.type === "link") {
    return <ContentLinkField value={value || null} onChange={(next) => onChange(next ?? "")} readOnly={readOnly} />;
  }

  if (field.type === "image") {
    if (value) {
      return (
        <>
          <span className="group relative inline-block">
            <button
              type="button"
              onClick={() => setPreview({ kind: "image", src: value, name: field.name })}
              className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={`View ${field.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt={field.name} className="h-10 w-10 cursor-pointer rounded-md object-cover" />
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white group-hover:flex"
                aria-label={`Remove ${field.name}`}
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
        aria-label={`Upload ${field.name}`}
      >
        <ImageIcon className="h-4 w-4" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
      </button>
    );
  }

  if (field.type === "video") {
    if (value) {
      return (
        <>
          <span className="group relative inline-block">
            <button
              type="button"
              onClick={() => setPreview({ kind: "video", src: value, name: field.name })}
              className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={`View ${field.name}`}
            >
              <video src={value} className="h-10 w-16 cursor-pointer rounded-md bg-black object-cover" muted />
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white group-hover:flex"
                aria-label={`Remove ${field.name}`}
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
        aria-label={`Upload ${field.name}`}
      >
        <VideoIcon className="h-4 w-4" />
        <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} className="sr-only" />
      </button>
    );
  }

  return <TextLikeCell field={field} value={value} onChange={onChange} readOnly={readOnly} />;
}

function TextLikeCell({ field, value, onChange, readOnly }: CustomFieldCellProps) {
  const [draft, setDraft] = useState(value);

  if (readOnly) {
    return <span className="block truncate px-2 py-1 text-sm text-slate-600 dark:text-slate-300">{value || "—"}</span>;
  }

  function commit() {
    if (draft !== value) onChange(draft);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") (event.target as HTMLInputElement).blur();
    if (event.key === "Escape") {
      setDraft(value);
      (event.target as HTMLInputElement).blur();
    }
  }

  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      aria-label={field.name}
      placeholder="—"
      className="w-full rounded-md px-2 py-1 text-sm text-slate-700 outline-none hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-200 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-900 dark:focus:ring-indigo-900"
    />
  );
}
