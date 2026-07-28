"use client";

import { useState } from "react";
import { useCustomFields } from "@/hooks/useCustomFields";
import { Menu } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DropdownOptionsEditor } from "@/components/ui/DropdownOptionsEditor";
import { TaskListSkeleton } from "@/components/task-list/TaskListSkeleton";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { randomPaletteColor } from "@/config/colorPalette";
import { generateId } from "@/lib/id";
import { cn } from "@/lib/cn";
import type { CustomFieldOption, CustomFieldType } from "@/types/customField";

const TYPE_OPTIONS: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "link", label: "Link" },
];

const TYPE_LABEL: Record<CustomFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  image: "Image",
  video: "Video",
  link: "Link",
};

export function CustomFieldsManager() {
  const { fields, loadState, addField, editField, removeField } = useCustomFields();
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [optionsDraft, setOptionsDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (loadState === "loading") return <TaskListSkeleton />;

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const options: CustomFieldOption[] = optionsDraft
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .map((label) => ({ id: generateId("option"), label, color: randomPaletteColor() }));
    const success = await addField({ name: trimmed, type, options });
    if (success) {
      setName("");
      setType("text");
      setOptionsDraft("");
    }
  }

  const pendingField = fields.find((f) => f.id === pendingDeleteId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {fields.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No custom fields yet. Add one below.</p>}
        <ul>
          {fields.map((field) => (
            <li key={field.id} className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FieldNameInput name={field.name} onCommit={(next) => editField(field.id, { name: next })} />
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {TYPE_LABEL[field.type]}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(field.id)}
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                  aria-label={`Delete ${field.name}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              {field.type === "select" && (
                <DropdownOptionsEditor options={field.options} onChange={(next) => editField(field.id, { options: next })} />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Add a custom field</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Client, Budget, Story points"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
            />
          </label>

          <div className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Type</span>
            <Menu
              options={TYPE_OPTIONS}
              value={[type]}
              onChange={(next) => setType(next[0] as CustomFieldType)}
              ariaLabel="Field type"
              renderTrigger={() => (
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  {TYPE_LABEL[type]}
                  <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
                </span>
              )}
            />
          </div>

          {type === "select" && (
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Options (comma-separated)</span>
              <input
                value={optionsDraft}
                onChange={(event) => setOptionsDraft(event.target.value)}
                placeholder="e.g. Small, Medium, Large"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
              />
            </label>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            Add field
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete this field?"
        description={pendingField ? `"${pendingField.name}" and its values on tasks will be removed. This cannot be undone.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await removeField(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

function FieldNameInput({ name, onCommit }: { name: string; onCommit: (next: string) => void }) {
  const [value, setValue] = useState(name);
  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== name) onCommit(trimmed);
        else setValue(name);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
      }}
      aria-label={`Field name: ${name}`}
      className={cn(
        "flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-slate-800 hover:border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:ring-indigo-950"
      )}
    />
  );
}
