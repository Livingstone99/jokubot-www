import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { api, type InboundRow } from "../api.js";
import { useAuth } from "../auth.js";
import { JokubotMark } from "../brand/Logo.js";
import type { MessageKey } from "../i18n.js";
import {
  IconActivity,
  IconBell,
  IconBot,
  IconCard,
  IconChevronDown,
  IconCode,
  IconHome,
  IconLink,
  IconList,
  IconLogout,
  IconMenu,
  IconMore,
  IconPlus,
  IconSettings,
  IconSparkles,
  IconTag,
  IconUser,
  IconX,
  type IconComponent,
} from "../jk/icons.js";
import { Avatar, Dropdown, Switch, ToastProvider } from "../jk/ui.js";
import { useLocale, useT } from "../locale.js";
import { useTheme } from "../theme.js";
import { formatWhen, senderLabel } from "../ui.js";
import { activityLabel } from "../pages/ActivityFeed.js";

/** add : petit bouton « + » à droite de l'entrée du menu. */
type NavItem = { to: string; label: MessageKey; icon: IconComponent; end?: boolean; add?: { to: string; label: MessageKey } };

/** Menu principal : les mots d'un commerçant, pas ceux d'un développeur. */
export const MAIN_NAV: NavItem[] = [
  { to: "/overview", label: "jk.nav.dashboard", icon: IconHome, end: true },
  { to: "/triggers", label: "jk.nav.automations", icon: IconBot },
  { to: "/channels", label: "jk.nav.channels", icon: IconLink },
  { to: "/activity", label: "jk.nav.activity", icon: IconActivity },
  { to: "/usage", label: "jk.nav.usage", icon: IconCard },
  { to: "/settings", label: "jk.nav.settings", icon: IconSettings },
];

/** Outils moins fréquents, gardés accessibles. */
export const TOOLS_NAV: NavItem[] = [
  { to: "/setup", label: "jk.nav.assistant", icon: IconSparkles },
  { to: "/reactions", label: "jk.nav.reactions", icon: IconList },
  { to: "/purposes", label: "jk.nav.purposes", icon: IconTag },
  { to: "/developers", label: "jk.nav.developer", icon: IconCode },
];

const BOTTOM_NAV: NavItem[] = [
  { to: "/overview", label: "jk.nav.home", icon: IconHome, end: true },
  { to: "/triggers", label: "jk.nav.autoShort", icon: IconBot },
  { to: "/more", label: "jk.nav.more", icon: IconMore },
];

const MORE_ROUTES = ["/more", "/channels", "/activity", "/usage", "/settings", "/setup", "/reactions", "/purposes", "/developers"];

function titleFor(pathname: string): MessageKey {
  const all = [...MAIN_NAV, ...TOOLS_NAV];
  const found = all.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  if (pathname.startsWith("/more")) return "jk.nav.more";
  // Plus dans le menu, mais encore ouvert depuis l'activité récente du tableau de bord.
  if (pathname.startsWith("/sessions")) return "jk.nav.conversations";
  if (pathname.startsWith("/verify")) return "jk.nav.verify";
  return found?.label ?? "jk.nav.dashboard";
}

export function AppShell() {
  const { me, refresh, setMe } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    document.title = `${t(titleFor(pathname))} · JokuBot`;
  }, [t, pathname]);

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  // Tant qu'un canal est en cours de connexion ou en panne, son état est relu toutes les 15 s.
  useEffect(() => {
    const tenant = me?.tenant;
    if (!tenant) return;
    const watched =
      tenant.whatsappLinked ||
      tenant.telegramLinked ||
      Boolean(tenant.whatsappNumber) ||
      Boolean(tenant.telegramBotUsername) ||
      tenant.whatsappStatus === "disconnected" ||
      tenant.telegramStatus === "disconnected" ||
      tenant.telegramStatus === "degraded";
    if (!watched) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    return () => window.clearInterval(id);
  }, [me?.tenant, refresh]);

  async function onLogout() {
    await api.logout().catch(() => undefined);
    setMe(null);
    navigate("/login");
  }

  const business = me?.tenant.name || me?.name || me?.email || "";

  return (
    <ToastProvider>
      <div className="jk">
        <div className="jk-app">
          <aside className="jk-sidebar" aria-label={t("jk.menu")}>
            <Brand />
            <NavList items={MAIN_NAV} />
            <p className="jk-nav-label">{t("jk.nav.tools")}</p>
            <NavList items={TOOLS_NAV} />
            <div className="jk-sidebar-foot">
              <UserMenu business={business} email={me?.email ?? ""} onLogout={() => void onLogout()} align="left" full />
            </div>
          </aside>

          <div className="jk-main">
            <header className="jk-header">
              <button
                type="button"
                className="jk-icon-btn jk-header-menu"
                aria-label={t("jk.openMenu")}
                aria-expanded={drawer}
                onClick={() => setDrawer(true)}
              >
                <IconMenu />
              </button>
              <Link to="/overview" className="jk-header-brand">
                <span className="mark" aria-hidden="true">
                  <JokubotMark size={24} />
                </span>
                JokuBot
              </Link>
              <span className="jk-header-title">{t(titleFor(pathname))}</span>
              <Notifications />
              <span className="jk-header-user">
                <UserMenu business={business} email={me?.email ?? ""} onLogout={() => void onLogout()} align="right" />
              </span>
            </header>

            <main className="jk-content" key={pathname}>
              <Outlet />
            </main>
          </div>
        </div>

        <nav className="jk-bottom-nav" aria-label={t("jk.menu")}>
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const forced = item.to === "/more" && MORE_ROUTES.some((route) => pathname.startsWith(route));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive || forced ? "jk-bottom-item is-active" : "jk-bottom-item")}
                aria-current={forced ? "page" : undefined}
              >
                <span>
                  <Icon size={20} />
                </span>
                <span>{t(item.label)}</span>
              </NavLink>
            );
          })}
        </nav>

        {drawer ? (
          <div className="jk-drawer" role="dialog" aria-modal="true" aria-label={t("jk.menu")}>
            <button type="button" className="jk-drawer-scrim" aria-label={t("jk.close")} onClick={() => setDrawer(false)} />
            <div className="jk-drawer-panel">
              <div className="jk-drawer-head">
                <Brand />
                <button type="button" className="jk-icon-btn" aria-label={t("jk.close")} onClick={() => setDrawer(false)}>
                  <IconX />
                </button>
              </div>
              <NavList items={MAIN_NAV} />
              <p className="jk-nav-label">{t("jk.nav.tools")}</p>
              <NavList items={TOOLS_NAV} />
              <div className="jk-sidebar-foot">
                <UserMenu business={business} email={me?.email ?? ""} onLogout={() => void onLogout()} align="left" full />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ToastProvider>
  );
}

function Brand() {
  return (
    <Link to="/overview" className="jk-brand">
      <span className="mark" aria-hidden="true">
        <JokubotMark size={28} />
      </span>
      <span>JokuBot</span>
    </Link>
  );
}

function NavList({ items }: { items: NavItem[] }) {
  const t = useT();
  return (
    <nav className="jk-nav" aria-label={t("jk.menu")}>
      {items.map((item) => {
        const Icon = item.icon;
        const link = (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={t(item.label)}
            className={({ isActive }) => (isActive ? "jk-nav-item is-active" : "jk-nav-item")}
          >
            <Icon size={20} />
            <span>{t(item.label)}</span>
          </NavLink>
        );
        if (!item.add) return link;
        return (
          <div key={item.to} className="jk-nav-row">
            {link}
            <Link className="jk-nav-add" to={item.add.to} title={t(item.add.label)} aria-label={t(item.add.label)}>
              <IconPlus size={16} />
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

/** Menu du profil : commerce, profil, paramètres, langue, thème, déconnexion. */
function UserMenu({
  business,
  email,
  onLogout,
  align,
  full,
}: {
  business: string;
  email: string;
  onLogout: () => void;
  align: "left" | "right";
  full?: boolean;
}) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  return (
    <Dropdown
      label={t("jk.profileMenu")}
      align={align}
      className={full ? "is-full" : undefined}
      trigger={
        full ? (
          <span className="jk-user">
            <Avatar name={business} size={36} />
            <span className="jk-user-text">
              <strong>{business}</strong>
              <span>{email}</span>
            </span>
            <IconChevronDown size={16} />
          </span>
        ) : (
          <>
            <Avatar name={business} size={34} />
            <IconChevronDown size={16} />
          </>
        )
      }
    >
      {(close) => (
        <>
          <div className="jk-menu-head">
            <strong>{business}</strong>
            <span>{email}</span>
          </div>
          <Link to="/settings" role="menuitem" className="jk-menu-item" onClick={close}>
            <IconUser size={18} />
            {t("jk.myProfile")}
          </Link>
          <Link to="/settings" role="menuitem" className="jk-menu-item" onClick={close}>
            <IconSettings size={18} />
            {t("jk.nav.settings")}
          </Link>
          <div className="jk-menu-sep" />
          <div className="jk-menu-item" role="group" aria-label={t("jk.language")}>
            <span style={{ flex: 1 }}>{t("jk.language")}</span>
            {(["fr", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                className={locale === code ? "jk-btn is-primary is-small" : "jk-btn is-secondary is-small"}
                aria-pressed={locale === code}
                onClick={() => setLocale(code)}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="jk-menu-item">
            <span style={{ flex: 1 }}>{t("jk.darkMode")}</span>
            <Switch checked={theme === "dark"} label={t("jk.darkMode")} onChange={(next) => setTheme(next ? "dark" : "light")} />
          </div>
          <div className="jk-menu-sep" />
          <button
            type="button"
            role="menuitem"
            className="jk-menu-item"
            onClick={() => {
              close();
              onLogout();
            }}
          >
            <IconLogout size={18} />
            {t("jk.logout")}
          </button>
        </>
      )}
    </Dropdown>
  );
}

/** Cloche : les derniers événements de l'activité. */
function Notifications() {
  const t = useT();
  const [rows, setRows] = useState<InboundRow[] | null>(null);
  useEffect(() => {
    void api
      .inbound()
      .then((res) => setRows(res.items.slice(0, 5)))
      .catch(() => setRows([]));
  }, []);
  const recent = (rows ?? []).filter((row) => Date.now() - new Date(row.receivedAt).getTime() < 24 * 3600 * 1000);
  return (
    <Dropdown
      label={t("jk.notifications")}
      align="right"
      trigger={
        <span className="jk-icon-btn" aria-hidden="true">
          <IconBell size={20} />
          {recent.length > 0 ? <span className="jk-dot" /> : null}
        </span>
      }
    >
      {(close) => (
        <>
          <div className="jk-menu-head">
            <strong>{t("jk.notifications")}</strong>
          </div>
          {rows === null ? (
            <p className="jk-muted" style={{ padding: 10 }}>
              {t("jk.loading")}
            </p>
          ) : rows.length === 0 ? (
            <p className="jk-muted" style={{ padding: 10 }}>
              {t("jk.noNotifications")}
            </p>
          ) : (
            rows.map((row) => (
              <Link key={row.id} to="/activity" className="jk-notif" onClick={close}>
                <IconActivity size={18} />
                <div>
                  <strong>{t(activityLabel(row.outcome))}</strong>
                  <span>
                    {senderLabel(row)} · {formatWhen(row.receivedAt)}
                  </span>
                </div>
              </Link>
            ))
          )}
          <div className="jk-menu-sep" />
          <Link to="/activity" className="jk-menu-item" onClick={close}>
            {t("jk.seeActivity")}
          </Link>
        </>
      )}
    </Dropdown>
  );
}
