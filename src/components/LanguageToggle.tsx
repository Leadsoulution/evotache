"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/cn";
import type { Locale } from "@/hooks/useLanguage";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "fr", label: "FR" },
  { value: "en", label: "EN" },
];

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  function cycle() {
    const currentIndex = OPTIONS.findIndex((o) => o.value === locale);
    setLocale(OPTIONS[(currentIndex + 1) % OPTIONS.length].value);
  }

  return (
    <>
      <button
        type="button"
        onClick={cycle}
        title={`Language: ${locale.toUpperCase()}`}
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:hidden dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        {locale.toUpperCase()}
        <span className="sr-only">Cycle language (currently {locale})</span>
      </button>

      <div
        role="group"
        aria-label="Language"
        className="hidden items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 sm:flex dark:border-slate-700 dark:bg-slate-900"
      >
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            aria-pressed={locale === value}
            title={label}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-200",
              locale === value && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
