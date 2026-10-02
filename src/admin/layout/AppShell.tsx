import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { api } from "../api.js";
import { appHref } from "../../config.js";
import { useAuth } from "../auth.js";
import { JokubotMark } from "../brand/Logo.js";
import { LocaleToggle, useT } from "../locale.js";
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
  const operate = [
    { to: "/overview", label: t("nav.overview"), end: true, icon: IconGrid },
    { to: "/sessions", label: t("nav.sessions"), icon: IconChat },
    { to: "/verify", label: t("nav.verify"), icon: IconScan },
    { to: "/purposes", label: t("nav.purposes"), icon: IconTag },
    { to: "/setup", label: t("nav.setup"), icon: IconGuide },
    { to: "/triggers", label: t("nav.triggers"), icon: IconBolt },
    { to: "/reactions", label: t("nav.reactions"), icon: IconReply },
    { to: "/activity", label: t("nav.activity"), icon: IconPulse },
    { to: "/usage", label: t("nav.usage"), icon: IconUsage },
  ];
  const workspace = [
    { to: "/settings", label: t("nav.settings"), icon: IconSliders },
    { to: "/developers", label: t("nav.developers"), icon: IconKey },
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
      <header className="topbar">
        <button
          type="button"
          className="icon-btn topbar-menu"
          aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <IconMenu />
        </button>
        <span className="mark" aria-hidden="true">
          <JokubotMark size={44} />
        </span>
        <div className="topbar-brand">
          <strong className="wordmark">jokubot</strong>
          <span>{me?.tenant.name}</span>
        </div>
        <span className="kind">
          {t(me?.tenant.accountKind === "individual" ? "nav.kindIndividual" : "nav.kindBusiness")}
        </span>
        <div className="topbar-spacer" />
        <div className="topbar-user">
          <span className="avatar" aria-hidden="true">
            {initials(me?.name || me?.email || "u")}
          </span>
          <div className="topbar-user-copy">
            <strong>{me?.name || me?.email}</strong>
            <span>{me?.name ? me.email : t("common.owner")}</span>
          </div>
          <button type="button" className="ghost" onClick={() => void onLogout()}>
            {t("nav.signOut")}
          </button>
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="app-body">
        <div className="sidebar-slot">
          <aside className="sidebar">
            <nav>
              <p className="nav-label">{t("nav.operate")}</p>
              {operate.map((link) =>
                link.to === "/verify" && !channelsReady ? (
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
              <p className="nav-label">{t("nav.workspace")}</p>
              {workspace.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  className={({ isActive }) => (isActive ? "nav is-active" : "nav")}
                  onClick={() => setMobileOpen(false)}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </NavLink>
              ))}
              <div className="nav-legal">
                <a href={appHref("/docs")} onClick={() => setMobileOpen(false)}>
                  {t("nav.docs")}
                </a>
                <a href={appHref("/status")} onClick={() => setMobileOpen(false)}>
                  {t("nav.status")}
                </a>
                <a href={appHref("/security")} onClick={() => setMobileOpen(false)}>
                  {t("nav.security")}
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

function IconGrid() {
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

function IconChat() {
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

function IconScan() {
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

function IconTag() {
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

function IconPulse() {
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

function IconUsage() {
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

function IconReply() {
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

function IconGuide() {
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

function IconBolt() {
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

function IconSliders() {
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

function IconKey() {
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
