"use client";

import { useTheme } from "@/hooks/useTheme";
import { LaptopIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/hooks/useTheme";

const OPTIONS: { value: ThemePreference; icon: typeof SunIcon; label: string }[] = [
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
  { value: "system", icon: LaptopIcon, label: "System" },
];

export function ThemeToggle() {
  const { preference, setTheme } = useTheme();

  function cycle() {
    const currentIndex = OPTIONS.findIndex((o) => o.value === preference);
    setTheme(OPTIONS[(currentIndex + 1) % OPTIONS.length].value);
  }

  const CurrentIcon = OPTIONS.find((o) => o.value === preference)?.icon ?? LaptopIcon;

  return (
    <>
      <button
        type="button"
        onClick={cycle}
        title={`Theme: ${preference}`}
        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:hidden dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="sr-only">Cycle theme (currently {preference})</span>
      </button>

      <div
        role="group"
        aria-label="Theme"
        className="hidden items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 sm:flex dark:border-slate-700 dark:bg-slate-900"
      >
        {OPTIONS.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={preference === value}
            title={label}
            className={cn(
              "rounded-md p-1.5 text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-200",
              preference === value && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
