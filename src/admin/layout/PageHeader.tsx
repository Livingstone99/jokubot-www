import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { JokubotMark } from "../brand/Logo.js";
import type { MessageKey } from "../i18n.js";
import { IconCheck, IconGlobe, IconHelp, IconLogout, IconMoon, IconSun, IconUser, IconX } from "../kit/icons.js";
import { useLocale, useT } from "../locale.js";
import { useTheme } from "../theme.js";
import { initials } from "../ui.js";

type PageMeta = {
  title: MessageKey;
  help: MessageKey;
  action?: { to: string; label: MessageKey };
};

/** Titre et aide de chaque page, choisis d'après l'adresse. */
const PAGES: Array<[string, PageMeta]> = [
  ["/overview", { title: "nav2.home", help: "help.home", action: { to: "/automations/assistant", label: "assist.open" } }],
  ["/messages", { title: "nav2.messages", help: "help.messages" }],
  ["/automations", { title: "nav2.automations", help: "help.automations" }],
  ["/channels", { title: "nav2.channels", help: "help.channels" }],
  ["/usage", { title: "nav2.usage", help: "help.usage" }],
  ["/settings", { title: "nav2.settings", help: "help.settings" }],
  ["/more", { title: "nav2.more", help: "help.more" }],
  ["/verify", { title: "nav2.verify", help: "help.verify" }],
  ["/purposes", { title: "nav2.purposes", help: "help.purposes" }],
  ["/developers", { title: "nav2.developers", help: "help.developers" }],
  ["/journal", { title: "nav2.journal", help: "help.journal" }],
];

function metaFor(pathname: string): PageMeta {
  return PAGES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? PAGES[0]![1];
}

export function PageHeader({
  name,
  email,
  onLogout,
}: {
  name: string;
  email: string;
  onLogout: () => void;
}) {
  const t = useT();
  const { pathname } = useLocation();
  const meta = metaFor(pathname);
  const { theme, toggleTheme } = useTheme();
  const themeLabel = theme === "dark" ? t("theme.toLight") : t("theme.toDark");

  return (
    <header className="page-header">
      <h1 className="page-header-title">{t(meta.title)}</h1>
      <div className="page-header-tools">
        {meta.action ? (
          <Link className="primary page-header-action" to={meta.action.to}>
            <JokubotMark size={20} />
            <span>{t(meta.action.label)}</span>
          </Link>
        ) : null}
        <HelpButton key={pathname} text={t(meta.help)} title={t(meta.title)} />
        <button
          type="button"
          className="header-icon"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
        <AccountMenu name={name} email={email} onLogout={onLogout} />
      </div>
    </header>
  );
}

/** Bouton « ? » : courte explication de la page. */
function HelpButton({ text, title }: { text: string; title: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useDismiss(open, rootRef, () => setOpen(false));

  return (
    <div className="header-pop" ref={rootRef}>
      <button
        type="button"
        className="header-icon"
        aria-label={t("help.open")}
        title={t("help.open")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <IconHelp />
      </button>
      {open ? (
        <div className="header-panel help-panel" id={panelId} role="dialog" aria-label={title}>
          <div className="help-head">
            <strong>{title}</strong>
            <button
              type="button"
              className="header-icon is-small"
              aria-label={t("help.close")}
              onClick={() => setOpen(false)}
            >
              <IconX size={16} />
            </button>
          </div>
          <p>{text}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Avatar : profil, langue, déconnexion. */
function AccountMenu({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, rootRef, () => setOpen(false));

  return (
    <div className="header-pop" ref={rootRef}>
      <button
        type="button"
        className="avatar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.userMenu")}
        onClick={() => setOpen((value) => !value)}
      >
        {initials(name || "u")}
      </button>
      {open ? (
        <div className="header-panel account-panel" role="menu">
          <div className="account-head">
            <strong>{name}</strong>
            {email && email !== name ? <span>{email}</span> : null}
          </div>
          <Link to="/settings" role="menuitem" className="menu-row" onClick={() => setOpen(false)}>
            <IconUser size={18} />
            {t("header.profile")}
          </Link>
          <div className="menu-group" role="group" aria-label={t("header.language")}>
            <span className="menu-group-label">
              <IconGlobe size={18} />
              {t("header.language")}
            </span>
            {(["fr", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={locale === code}
                className="menu-row is-sub"
                onClick={() => setLocale(code)}
              >
                {code === "fr" ? "Français" : "English"}
                {locale === code ? <IconCheck size={16} /> : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            className="menu-row is-danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <IconLogout size={18} />
            {t("nav.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Ferme un menu au clic extérieur ou avec Échap. */
function useDismiss(open: boolean, ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close]);
}
