import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { api } from "../api.js";
import { appHref } from "../../config.js";
import { useAuth } from "../auth.js";
import { JokubotMark } from "../brand/Logo.js";
import { LocaleMenu, useT } from "../locale.js";
import { ThemeToggle } from "../theme.js";
import { hasChannelSetup, initials } from "../ui.js";

const NAV_KEY = "mvs.navCollapsed";

export function AppShell() {
  const { me, refresh, setMe } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(NAV_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups: NavGroup[] = [
    {
      label: t("nav.gOverview"),
      links: [
        { to: "/overview", label: t("nav.overview"), end: true, icon: IconGrid },
        { to: "/activity", label: t("nav.activity"), icon: IconPulse },
        { to: "/usage", label: t("nav.usage"), icon: IconUsage },
      ],
    },
    {
      label: t("nav.gVerify"),
      links: [
        { to: "/verify", label: t("nav.verify"), icon: IconScan, needsChannel: true },
        { to: "/sessions", label: t("nav.sessions"), icon: IconChat },
        { to: "/purposes", label: t("nav.purposes"), icon: IconTag },
      ],
    },
    {
      label: t("nav.gAutomate"),
      links: [
        { to: "/setup", label: t("nav.setup"), icon: IconGuide },
        { to: "/triggers", label: t("nav.triggers"), icon: IconBolt },
        { to: "/reactions", label: t("nav.reactions"), icon: IconReply },
      ],
    },
    {
      label: t("nav.workspace"),
      links: [
        { to: "/settings", label: t("nav.settings"), icon: IconSliders },
        { to: "/developers", label: t("nav.developers"), icon: IconKey },
      ],
    },
  ];

  useEffect(() => {
    document.title = t("nav.titleBusiness");
  }, [t]);

  useEffect(() => {
    const tenant = me?.tenant;
    if (!tenant) {
      return;
    }
    const watched =
      tenant.whatsappLinked ||
      tenant.telegramLinked ||
      Boolean(tenant.whatsappNumber) ||
      Boolean(tenant.telegramBotUsername) ||
      tenant.whatsappStatus === "disconnected" ||
      tenant.telegramStatus === "disconnected" ||
      tenant.telegramStatus === "degraded";
    if (!watched) {
      return;
    }
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refresh();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [
    me?.tenant,
    refresh,
  ]);

  async function onLogout() {
    await api.logout();
    setMe(null);
    navigate("/login");
  }

  function onCollapse() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(NAV_KEY, next ? "1" : "0");
      return next;
    });
  }

  const channelsReady = hasChannelSetup(me?.tenant);
  const channelHint = t("nav.channelHint");
  const appClass = [
    "app",
    collapsed ? "is-collapsed" : "",
    mobileOpen ? "nav-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClass}>
      <div className="sidebar-slot">
        <aside className="sidebar">
          <NavLink to="/overview" className="sidebar-brand" onClick={() => setMobileOpen(false)}>
            <span className="mark" aria-hidden="true">
              <JokubotMark size={32} />
            </span>
            <span className="wordmark">jokubot</span>
          </NavLink>
          <nav aria-label={t("nav.workspace")}>
            {groups.map((group) => (
              <div className="nav-group" key={group.label}>
                <p className="nav-label">{group.label}</p>
                {group.links.map((link) =>
                  link.needsChannel && !channelsReady ? (
                    <span
                      key={link.to}
                      className="nav is-disabled"
                      title={channelHint}
                      aria-disabled="true"
                    >
                      <link.icon />
                      <span>{link.label}</span>
                    </span>
                  ) : (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      title={link.label}
                      className={({ isActive }) => (isActive ? "nav is-active" : "nav")}
                      onClick={() => setMobileOpen(false)}
                    >
                      <link.icon />
                      <span>{link.label}</span>
                    </NavLink>
                  ),
                )}
              </div>
            ))}
            <div className="nav-group nav-help">
              <p className="nav-label">{t("nav.gHelp")}</p>
              <a className="nav" href={appHref("/docs")} title={t("nav.docs")}>
                <IconBook />
                <span>{t("nav.docs")}</span>
              </a>
              <a className="nav" href={appHref("/status")} title={t("nav.status")}>
                <IconPulse />
                <span>{t("nav.status")}</span>
              </a>
              <a className="nav" href={appHref("/security")} title={t("nav.security")}>
                <IconShield />
                <span>{t("nav.security")}</span>
              </a>
            </div>
          </nav>
        </aside>
        <button
          type="button"
          className="sidebar-fold"
          aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          aria-expanded={!collapsed}
          onClick={onCollapse}
        >
          <IconChevron />
        </button>
      </div>

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn topbar-menu"
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <IconMenu />
          </button>
          <div className="topbar-spacer" />
          <div className="topbar-tools">
            <ThemeToggle />
            <LocaleMenu />
            <UserMenu
              name={me?.name || me?.email || ""}
              email={me?.email ?? ""}
              onLogout={() => void onLogout()}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </header>

        <main className="content">
          <div className="route-root" key={pathname}>
            <Outlet />
          </div>
        </main>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="nav-scrim"
          aria-label={t("nav.closeMenu")}
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
    </div>
  );
}

type NavGroup = {
  label: string;
  links: Array<{
    to: string;
    label: string;
    icon: () => React.JSX.Element;
    end?: boolean;
    needsChannel?: boolean;
  }>;
};

/** Menu du compte sous l'avatar : identité, raccourcis et déconnexion. */
function UserMenu({
  name,
  email,
  onLogout,
  onNavigate,
}: {
  name: string;
  email: string;
  onLogout: () => void;
  onNavigate: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    onNavigate();
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.userMenu")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden="true">
          {initials(name || "u")}
        </span>
        <IconChevronDown />
      </button>
      {open ? (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-head">
            <strong>{name}</strong>
            {email && email !== name ? <span>{email}</span> : null}
          </div>
          <NavLink to="/settings" role="menuitem" className="user-menu-item" onClick={close}>
            <IconSliders />
            {t("nav.settings")}
          </NavLink>
          <NavLink to="/developers" role="menuitem" className="user-menu-item" onClick={close}>
            <IconKey />
            {t("nav.developers")}
          </NavLink>
          <button
            type="button"
            role="menuitem"
            className="user-menu-item is-danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <IconLogout />
            {t("nav.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function IconBook() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 3.5c2-.8 3.8-.6 5.5.6 1.7-1.2 3.5-1.4 5.5-.6v9c-2-.8-3.8-.6-5.5.6-1.7-1.2-3.5-1.4-5.5-.6zM8 4.1v9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M8 2 13 4v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M6.5 2.5h-3v11h3M10 5l3 3-3 3M13 8H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="m4.5 6.5 3.5 3.5 3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconGrid() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 2.5h4.5v4.5H2.5zm6.5 0H13.5v4.5H9zm-6.5 6.5h4.5V13.5H2.5zM9 9h4.5v4.5H9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function IconChat() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M3 3.5h10v7H7.5L4 13v-2.5H3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconScan() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 5.5V3.5h2M13.5 5.5V3.5h-2M2.5 10.5v2h2M13.5 10.5v2h-2M3 8h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconTag() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 3.5h6.2L13.5 8 8.7 12.5H2.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle
        cx="5.2"
        cy="6.4"
        r="0.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function IconPulse() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M1.5 8h3l1.5-3 2.5 6 1.5-3h4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUsage() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 13V8M6.5 13V4.5M10.5 13V7M13.5 13V3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconReply() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M3 8h7.5A3.5 3.5 0 0 1 14 11.5V13M3 8l3-3M3 8l3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconGuide() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M3 11.5a2 2 0 1 0 .01 0M13 4.5a2 2 0 1 0 .01 0M5 10.5l6-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBolt() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M9 1.5 3.5 9h4L7 14.5 12.5 7h-4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSliders() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2 4.5h12M2 11.5h12M5.5 2.5v4M10.5 9.5v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconKey() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="6" cy="8" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8.2 8H14v2.2M11.2 8v2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M9.5 3.5 5 8l4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.5 4h11M2.5 8h11M2.5 12h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
