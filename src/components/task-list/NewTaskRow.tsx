"use client";

import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { PlusIcon } from "@/components/ui/icons";
import { useLanguage } from "@/hooks/useLanguage";

interface NewTaskRowProps {
  onCreate: (title: string) => void;
}

export function NewTaskRow({ onCreate }: NewTaskRowProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");
  const [active, setActive] = useState(false);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setActive(false);
      return;
    }
    onCreate(trimmed);
    setValue("");
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
    if (event.key === "Escape") {
      setValue("");
      (event.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <PlusIcon className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => {
          if (!value.trim()) setActive(false);
        }}
        onKeyDown={onKeyDown}
        placeholder={t("tasks.addTask")}
        aria-label={t("tasks.addTask")}
        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
      />
      {active && value.trim() && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={submit}
          className="shrink-0 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
        >
          {t("common.add")}
        </button>
      )}
    </div>
  );
}
