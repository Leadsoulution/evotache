"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "evotasks.theme";

function applyTheme(preference: ThemePreference): void {
  const isDark = preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    // Must read localStorage post-mount (not in a lazy initializer) so the toggle's
    // highlighted button matches server-rendered markup on hydration, then corrects.
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const initial = stored ?? "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreference(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const setTheme = useCallback((next: ThemePreference) => {
    setPreference(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  return { preference, setTheme };
}
