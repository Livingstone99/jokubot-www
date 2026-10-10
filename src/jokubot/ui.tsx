// Composants partagés de l'espace JokuBot.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router-dom";

import type { NetworkId } from "./db.js";
import { network } from "./catalog.js";
import { isSocial, SocialLogo } from "./social.js";
import { setLang, setTheme, t, useLang, useTheme } from "./prefs.js";

/* ------------------------------ Icônes ------------------------------ */

const PATHS = {
  home: "M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
  news: "M4 5h13v14H6a2 2 0 0 1-2-2V5zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  plug: "M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v5",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z",
  engine: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  back: "M15 18l-6-6 6-6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  download: "M12 3v12M7 10l5 5 5-5M4 20h16",
  send: "M4 12l16-8-6 16-3-7-7-1z",
  plus: "M12 5v14M5 12h14",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  chevron: "M6 9l6 6 6-6",
  book: "M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5zM20 19v2H6",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z",
  phone: "M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  play: "M7 4.5v15l12-7.5z",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5a1.5 1.5 0 1 0 0-.01",
  text: "M5 6h14M5 11h14M5 16h9",
  swap: "M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/* ------------------------ Monogramme de réseau ------------------------ */

export function Monogram({ id, filled, size = "lg" }: { id: NetworkId; filled: boolean; size?: "lg" | "sm" }) {
  const info = network(id);
  if (info.logo)
    return (
      <span className={`mono mono-${size} mono-logo`} aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}${info.logo}`} alt="" />
      </span>
    );
  return (
    <span className={`mono mono-${size}${filled ? " is-filled" : ""}`} aria-hidden="true">
      {isSocial(id) ? <SocialLogo id={id} size={size === "lg" ? 24 : 14} /> : <span>{info.mono}</span>}
    </span>
  );
}

/* ------------------------------ Divers ------------------------------ */

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner" role={label ? "status" : undefined}>
      <span className="spinner-ring" aria-hidden="true" />
      {label ? <span className="sr-only">{t(label)}</span> : null}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="switch-row">
      <div className="switch-text">
        <span id={`${id}-l`} className="switch-label">
          {label}
        </span>
        {description ? (
          <span id={`${id}-d`} className="switch-desc">
            {description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="switch-thumb" />
      </button>
    </div>
  );
}

export type TabItem = { id: string; label: ReactNode; to: string };

/** Onglets en pilule, qui sont aussi des liens (chaque onglet a son adresse). */
export function PillTabs({ items, active, label }: { items: TabItem[]; active: string; label: string }) {
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + items.length) % items.length;
    refs.current[next]?.focus();
    refs.current[next]?.click();
  };
  return (
    <div className="pills" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <AppLink
          key={item.id}
          ref={(el: HTMLAnchorElement | null) => {
            refs.current[index] = el;
          }}
          to={item.to}
          role="tab"
          aria-selected={item.id === active}
          tabIndex={item.id === active ? 0 : -1}
          className={`pill${item.id === active ? " is-active" : ""}`}
          onKeyDown={(event: KeyboardEvent) => onKeyDown(event, index)}
        >
          {item.label}
        </AppLink>
      ))}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: "solid" | "outline" | "muted"; children: ReactNode }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{t(title)}</p>
      {children ? <p className="empty-text">{typeof children === "string" ? t(children) : children}</p> : null}
      {action}
    </div>
  );
}

/* --------------------- Liens qui rechargent la vue --------------------- */

const ReloadContext = createContext<() => void>(() => {});

export function ReloadProvider({ onReload, children }: { onReload: () => void; children: ReactNode }) {
  return <ReloadContext.Provider value={onReload}>{children}</ReloadContext.Provider>;
}

/** Un lien vers la page déjà ouverte recharge la vue au lieu de ne rien faire. */
export function AppLink({ to, onClick, ...rest }: ComponentProps<typeof Link> & { to: string }) {
  const location = useLocation();
  const reload = useContext(ReloadContext);
  return (
    <Link
      to={to}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (location.pathname === to.split("?")[0]) {
          event.preventDefault();
          reload();
        }
      }}
      {...rest}
    />
  );
}

/* ------------------------------ Toasts ------------------------------ */

type Toast = { id: number; text: string; action?: { label: string; to: string } };
const ToastContext = createContext<(text: string, action?: Toast["action"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, action?: Toast["action"]) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list.slice(-2), { id, text, ...(action ? { action } : {}) }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span>{t(toast.text)}</span>
            {toast.action ? (
              <AppLink to={toast.action.to} className="toast-action">
                {t(toast.action.label)}
              </AppLink>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* --------------------------- Confirmation --------------------------- */

type ConfirmOptions = { title: string; text: ReactNode; confirm: string; danger?: boolean };
const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const ask = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      requestAnimationFrame(() => dialog.current?.showModal());
    });
  }, []);

  const close = (value: boolean) => {
    dialog.current?.close();
    resolver.current?.(value);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="confirm-title"
        onCancel={(event) => {
          event.preventDefault();
          close(false);
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close(false);
        }}
      >
        {options ? (
          <div className="dialog-body">
            <h2 id="confirm-title" className="dialog-title">
              {options.title}
            </h2>
            <div className="dialog-text">{options.text}</div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                {t("Annuler")}
              </button>
              <button
                type="button"
                className={`btn ${options.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => close(true)}
                autoFocus
              >
                {options.confirm}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

/* ------------------------------ Hooks ------------------------------ */

/** Appelle `work` tout de suite puis toutes les `ms` millisecondes. */
export function usePolling(work: () => Promise<void> | void, ms: number, enabled = true) {
  const saved = useRef(work);
  saved.current = work;
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer = 0;
    const tick = async () => {
      try {
        await saved.current();
      } finally {
        if (!stopped) timer = window.setTimeout(tick, ms);
      }
    };
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [ms, enabled]);
}

export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function PageHeader({
  title,
  subtitle,
  aside,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <header className="page-head">
      {back ? (
        <AppLink to={back.to} className="back-link">
          <Icon name="back" size={18} />
          {back.label}
        </AppLink>
      ) : null}
      <div className="page-head-row">
        <div className="page-head-text">
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-sub">{subtitle}</p> : null}
        </div>
        {aside ? <div className="page-head-aside">{aside}</div> : null}
      </div>
    </header>
  );
}

/* ------------------------ Langue et thème ------------------------ */

function FlagFR() {
  return (
    <svg className="flag" viewBox="0 0 3 2" width="20" height="14" aria-hidden="true">
      <rect width="1" height="2" fill="#002654" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#ce1126" />
    </svg>
  );
}

function FlagGB() {
  return (
    <svg className="flag" viewBox="0 0 60 30" width="20" height="14" aria-hidden="true">
      <clipPath id="flag-gb">
        <path d="M0 0v30h60V0z" />
      </clipPath>
      <g clipPath="url(#flag-gb)">
        <path d="M0 0v30h60V0z" fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#c8102e" strokeWidth="2" />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </svg>
  );
}

const LANGS = [
  { code: "fr", label: "Français", Flag: FlagFR },
  { code: "en", label: "English", Flag: FlagGB },
] as const;

/** Menu de langue : pilule « FR ⌄ » qui ouvre la liste des langues avec leur drapeau. */
function LangMenu() {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    // Le focus va sur la langue en cours ; un clic ailleurs ferme le menu.
    items.current[LANGS.findIndex((l) => l.code === lang)]?.focus();
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, lang]);

  const close = () => {
    setOpen(false);
    root.current?.querySelector<HTMLButtonElement>(".lang-pill")?.focus();
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (index + (event.key === "ArrowDown" ? 1 : -1) + LANGS.length) % LANGS.length;
      items.current[next]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="lang-menu" ref={root}>
      <button
        type="button"
        className="lang-pill"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("Langue")} : ${LANGS.find((l) => l.code === lang)?.label ?? ""}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Icon name="globe" size={18} />
        <span>{lang.toUpperCase()}</span>
        <Icon name="chevron" size={16} className="lang-chevron" />
      </button>
      {open ? (
        <div className="lang-list" role="menu" aria-label={t("Langue")}>
          {LANGS.map(({ code, label, Flag }, index) => (
            <button
              key={code}
              ref={(el) => {
                items.current[index] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={lang === code}
              lang={code}
              className={`lang-item${lang === code ? " is-active" : ""}`}
              onKeyDown={(event) => onKeyDown(event, index)}
              onClick={() => {
                setOpen(false);
                if (code !== lang) setLang(code);
              }}
            >
              <Flag />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Choix de la langue et bouton rond clair / sombre. */
export function PrefsControls() {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <div className="prefs">
      <LangMenu />
      <button
        type="button"
        className="theme-btn"
        aria-label={dark ? t("Passer en mode clair") : t("Passer en mode sombre")}
        title={dark ? t("Mode clair") : t("Mode sombre")}
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        <Icon name={dark ? "sun" : "moon"} size={20} />
      </button>
    </div>
  );
}

/** Texte traduit avec des passages en gras, notés **ainsi**. */
export function Rich({ text, vars }: { text: string; vars?: Record<string, string | number> }) {
  const parts = t(text, vars).split("**");
  return <>{parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}</>;
}
