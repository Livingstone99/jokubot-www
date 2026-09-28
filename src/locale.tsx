import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  applyLocale,
  DEFAULT_LOCALE,
  LOCALE_KEY,
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

const OPTIONS: { locale: Locale; flag: string; labelKey: MessageKey }[] = [
  { locale: "fr", flag: "🇫🇷", labelKey: "locale.fr" },
  { locale: "en", flag: "🇬🇧", labelKey: "locale.en" },
];

export function LocaleMenu({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={["locale-menu", className].filter(Boolean).join(" ")} ref={rootRef}>
      <button
        type="button"
        className="locale-menu-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("locale.label")}
        onClick={() => setOpen((value) => !value)}
      >
        <IconGlobe />
        <span>{locale.toUpperCase()}</span>
        <IconChevron open={open} />
      </button>
      {open ? (
        <ul className="locale-menu-panel" role="listbox" aria-label={t("locale.label")}>
          {OPTIONS.map((option) => (
            <li key={option.locale}>
              <button
                type="button"
                role="option"
                aria-selected={locale === option.locale}
                className={locale === option.locale ? "is-active" : undefined}
                onClick={() => {
                  setLocale(option.locale);
                  setOpen(false);
                }}
              >
                <span className="locale-flag" aria-hidden="true">
                  {option.flag}
                </span>
                {t(option.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2 8h12M8 2c2 2.4 2 9.6 0 12M8 2c-2 2.4-2 9.6 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s ease" }}
    >
      <path
        d="m4 6 4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
