"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import type { TranslationKey } from "@/i18n/en";

export type Locale = "en" | "fr";

const STORAGE_KEY = "evotasks.locale";
const DEFAULT_LOCALE: Locale = "fr";
const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { en, fr };

interface LanguageContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Read post-mount, matching useTheme's SSR-safe pattern — start at the
    // default so server/client markup match on hydration, then correct.
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    const initial = stored === "en" || stored === "fr" ? stored : DEFAULT_LOCALE;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback((key: TranslationKey) => DICTIONARIES[locale][key], [locale]);

  const value = useMemo<LanguageContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
