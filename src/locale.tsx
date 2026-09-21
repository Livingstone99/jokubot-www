import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  applyLocale,
  DEFAULT_LOCALE,
  LOCALE_KEY,
  localeTag,
  readStoredLocale,
  translate,
  type Locale,
  type MessageKey,
  type MessageVars,
} from "./i18n.js";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleState | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof document === "undefined") {
      return DEFAULT_LOCALE;
    }
    const current = document.documentElement.lang;
    if (current === "fr" || current === "en") {
      applyLocale(current);
      return current;
    }
    const stored = readStoredLocale();
    applyLocale(stored);
    return stored;
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    applyLocale(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // Ignore persistence failures.
    }
  }, []);

  useEffect(() => {
    applyLocale(locale);
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleState {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return value;
}

export function useT() {
  const { locale } = useLocale();
  return useCallback(
    (key: MessageKey, vars?: MessageVars) => translate(locale, key, vars),
    [locale],
  );
}

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <div
      className={["locale-toggle", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={t("locale.label")}
    >
      <button
        type="button"
        className={locale === "fr" ? "is-active" : undefined}
        aria-pressed={locale === "fr"}
        onClick={() => setLocale("fr")}
      >
        {t("locale.fr")}
      </button>
      <button
        type="button"
        className={locale === "en" ? "is-active" : undefined}
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        {t("locale.en")}
      </button>
    </div>
  );
}

export { localeTag };
export type { Locale };
