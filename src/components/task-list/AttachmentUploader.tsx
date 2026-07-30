"use client";

import { useRef, useState } from "react";
import { LinkIcon, UploadIcon } from "@/components/ui/icons";

interface AttachmentUploaderProps {
  onUploadFile: (file: File) => void;
  onAddLink: (name: string, url: string) => void;
}

export function AttachmentUploader({ onUploadFile, onAddLink }: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onUploadFile(file);
    event.target.value = "";
  }

  function submitLink() {
    if (!linkUrl.trim()) return;
    onAddLink(linkName.trim() || linkUrl.trim(), linkUrl.trim());
    setLinkName("");
    setLinkUrl("");
    setLinkMode(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <UploadIcon className="h-3.5 w-3.5" />
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setLinkMode((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LinkIcon className="h-3.5 w-3.5" />
          Add link
        </button>
        <span className="text-xs text-slate-400">Images, PDFs, videos, spreadsheets — up to 20MB each.</span>
      </div>

      {linkMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
          <input
            value={linkName}
            onChange={(event) => setLinkName(event.target.value)}
            placeholder="Link name (optional)"
            className="w-40 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={submitLink}
            disabled={!linkUrl.trim()}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
