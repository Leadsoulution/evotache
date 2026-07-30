"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createPortal } from "react-dom";
import { randomPaletteColor } from "@/config/colorPalette";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { ImageIcon, XIcon } from "@/components/ui/icons";
import { AGENT_TOOLS } from "@/types/agent";
import { uploadFile } from "@/services/uploadApi";
import type { Agent, AgentKind, AgentTool } from "@/types/agent";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950";

export interface AgentFormValues {
  name: string;
  email: string;
  color: string;
  photoDataUrl: string | null;
  kind: AgentKind;
  systemPrompt: string;
  enabledTools: AgentTool[];
}

interface AgentFormDialogProps {
  open: boolean;
  editingAgent: Agent | null;
  onClose: () => void;
  onSubmit: (input: AgentFormValues) => Promise<boolean>;
}

export function AgentFormDialog({ open, editingAgent, onClose, onSubmit }: AgentFormDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(randomPaletteColor());
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [kind, setKind] = useState<AgentKind>("internal");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [enabledTools, setEnabledTools] = useState<AgentTool[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(editingAgent?.name ?? "");
      setEmail(editingAgent?.email ?? "");
      setColor(editingAgent?.color ?? randomPaletteColor());
      setPhotoDataUrl(editingAgent?.photoDataUrl ?? null);
      setPhotoError(null);
      setKind(editingAgent?.kind ?? "internal");
      setSystemPrompt(editingAgent?.systemPrompt ?? "");
      setEnabledTools(editingAgent?.enabledTools ?? ["tasks", "litiges"]);
      setError(null);
    }
  }

  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image must be smaller than 2 MB.");
      return;
    }
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      setPhotoDataUrl(await uploadFile(file, "avatars"));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  function toggleTool(toolId: AgentTool) {
    setEnabledTools((current) => (current.includes(toolId) ? current.filter((id) => id !== toolId) : [...current, toolId]));
  }

  const availableTools = AGENT_TOOLS.filter((tool) => kind === "external" || !tool.externalOnly);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const success = await onSubmit({
      name: name.trim(),
      email: email.trim(),
      color,
      photoDataUrl,
      kind,
      systemPrompt: systemPrompt.trim(),
      enabledTools,
    });
    setSubmitting(false);
    if (success) onClose();
    else setError(editingAgent ? "Couldn't save changes. Check the email isn't used by another account." : "Couldn't add this agent. Check the email isn't already in use.");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-form-title"
        className="flex max-h-[90vh] w-full max-w-sm flex-col animate-scale-in rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="agent-form-title" className="px-5 pt-5 text-base font-semibold text-slate-900 dark:text-slate-100">
          {editingAgent ? `Edit ${editingAgent.name}` : "Add AI agent"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 pb-5 pt-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Name</span>
            <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClass} />
          </label>

          <div className="flex items-center gap-3">
            <Avatar name={name || "?"} color={color} photoDataUrl={photoDataUrl} size="lg" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {photoUploading ? "Uploading…" : photoDataUrl ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={photoUploading} className="sr-only" />
                </label>
                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
                <ColorSwatchPicker value={color} onChange={setColor} />
              </div>
              {photoError && <p className="text-xs text-red-600 dark:text-red-400">{photoError}</p>}
            </div>
          </div>

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Kind</legend>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { value: "internal" as const, label: "Internal", description: "Works inside the app only: tasks, litiges, achats." },
                  { value: "external" as const, label: "External", description: "Also works outward: email, Telegram, WhatsApp, web search, integrations." },
                ]
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2",
                    kind === option.value ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === option.value}
                    onChange={() => setKind(option.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{option.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Persona / instructions</span>
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={4}
              placeholder="e.g. You are Léa, EvoTasks' operations assistant. Be concise and proactive about overdue work."
              className={inputClass}
            />
          </label>

          <fieldset className="block text-sm">
            <legend className="mb-1 font-medium text-slate-700 dark:text-slate-300">Enabled tools</legend>
            <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-1.5 dark:border-slate-700">
              {availableTools.map((tool) => (
                <label key={tool.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={enabledTools.includes(tool.id)}
                    onChange={() => toggleTool(tool.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                  />
                  <span>
                    <span className="block text-sm text-slate-700 dark:text-slate-200">{tool.label}</span>
                    <span className="block text-xs text-slate-400">{tool.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : editingAgent ? "Save changes" : "Add agent"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
