import { useEffect, useId, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { appHref } from "../../config.js";
import { JokubotMark } from "../brand/Logo.js";
import {
  IconActivity,
  IconBook,
  IconBot,
  IconChart,
  IconChevronDown,
  IconCode,
  IconHome,
  IconKey,
  IconLink,
  IconMessage,
  IconMore,
  IconScan,
  IconSettings,
  IconShield,
  IconTag,
  type IconComponent,
} from "../kit/icons.js";
import { useInbox } from "../kit/inbox.js";
import { useT } from "../locale.js";

type NavItem = {
  to: string;
  label: string;
  icon: IconComponent;
  end?: boolean;
  badge?: number;
  external?: boolean;
};

const ADVANCED_KEY = "joku.nav.advancedOpen";

/** Routes rangées sous « Avancé » : le bloc s'ouvre seul quand on y est. */
const ADVANCED_ROUTES = ["/verify", "/purposes", "/developers", "/journal"];

export function useNavModel() {
  const t = useT();
  const { unreadCount } = useInbox();
  const main: NavItem[] = [
    { to: "/overview", label: t("nav2.home"), icon: IconHome, end: true },
    { to: "/messages", label: t("nav2.messages"), icon: IconMessage, badge: unreadCount },
    { to: "/automations", label: t("nav2.automations"), icon: IconBot },
    { to: "/channels", label: t("nav2.channels"), icon: IconLink },
    { to: "/usage", label: t("nav2.usage"), icon: IconChart },
    { to: "/settings", label: t("nav2.settings"), icon: IconSettings },
  ];
  const advanced: NavItem[] = [
    { to: "/verify", label: t("nav2.verify"), icon: IconScan },
    { to: "/purposes", label: t("nav2.purposes"), icon: IconTag },
    { to: "/developers", label: t("nav2.developers"), icon: IconCode },
    { to: "/journal", label: t("nav2.journal"), icon: IconActivity },
    { to: appHref("/docs"), label: t("nav.docs"), icon: IconBook, external: true },
    { to: appHref("/status"), label: t("nav2.status"), icon: IconActivity, external: true },
    { to: appHref("/security"), label: t("nav.security"), icon: IconShield, external: true },
  ];
  return { main, advanced };
}

function badgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

function NavEntry({ item, compactBadge }: { item: NavItem; compactBadge?: boolean }) {
  const t = useT();
  const Icon = item.icon;
  const badge = item.badge && item.badge > 0 ? (
    <span className="nav-badge" aria-label={t("nav2.unread", { count: item.badge })}>
      {compactBadge ? null : badgeLabel(item.badge)}
    </span>
  ) : null;
  const body = (
    <>
      <span className="nav-icon">
        <Icon />
        {badge ? <span className="nav-dot" aria-hidden="true" /> : null}
      </span>
      <span className="nav-text">{item.label}</span>
      {badge}
    </>
  );
  if (item.external) {
    return (
      <a className="nav2" href={item.to} data-tip={item.label} aria-label={item.label}>
        {body}
      </a>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => (isActive ? "nav2 is-active" : "nav2")}
      data-tip={item.label}
      aria-label={item.badge ? `${item.label}, ${t("nav2.unread", { count: item.badge })}` : item.label}
    >
      {body}
    </NavLink>
  );
}

/** Menu latéral : 260 px sur ordinateur, 72 px (icônes) sur tablette. */
export function Sidebar() {
  const t = useT();
  const { pathname } = useLocation();
  const { main, advanced } = useNavModel();
  const regionId = useId();
  const inAdvanced = ADVANCED_ROUTES.some((route) => pathname.startsWith(route));
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(ADVANCED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (inAdvanced) setOpen(true);
  }, [inAdvanced]);

  function toggle() {
    setOpen((value) => {
      const next = !value;
      try {
        localStorage.setItem(ADVANCED_KEY, next ? "1" : "0");
      } catch {
        // Ignore.
      }
      return next;
    });
  }

  return (
    <aside className="sidebar2" aria-label={t("nav2.mainMenu")}>
      <Link to="/overview" className="sidebar2-brand" aria-label="jokubot">
        <span className="mark" aria-hidden="true">
          <JokubotMark size={30} />
        </span>
        <span className="wordmark">jokubot</span>
      </Link>
      <nav className="sidebar2-main" aria-label={t("nav2.mainMenu")}>
        {main.map((item) => (
          <NavEntry key={item.to} item={item} />
        ))}
      </nav>
      <div className="sidebar2-advanced">
        <button
          type="button"
          className={inAdvanced ? "nav2 advanced-toggle is-within" : "nav2 advanced-toggle"}
          aria-expanded={open}
          aria-controls={regionId}
          data-tip={t("nav2.advanced")}
          onClick={toggle}
        >
          <span className="nav-icon">
            <IconKey />
          </span>
          <span className="nav-text">{t("nav2.advanced")}</span>
          <IconChevronDown className="advanced-chevron" size={16} />
        </button>
        <div id={regionId} className="advanced-list" hidden={!open}>
          {advanced.map((item) => (
            <NavEntry key={item.to} item={item} />
          ))}
        </div>
      </div>
    </aside>
  );
}

/** Barre du bas sur téléphone : 5 entrées. */
export function BottomNav() {
  const t = useT();
  const { unreadCount } = useInbox();
  const { pathname } = useLocation();
  const items: NavItem[] = [
    { to: "/overview", label: t("nav2.home"), icon: IconHome, end: true },
    { to: "/messages", label: t("nav2.messagesShort"), icon: IconMessage, badge: unreadCount },
    { to: "/automations", label: t("nav2.automationsShort"), icon: IconBot },
    { to: "/channels", label: t("nav2.channelsShort"), icon: IconLink },
    { to: "/more", label: t("nav2.more"), icon: IconMore },
  ];
  // « Plus » reste actif sur les pages qu'il regroupe.
  const moreActive = ["/more", "/usage", "/settings", ...ADVANCED_ROUTES].some((route) =>
    pathname.startsWith(route),
  );
  return (
    <nav className="bottom-nav" aria-label={t("nav2.mainMenu")}>
      {items.map((item) => {
        const Icon = item.icon;
        const forceActive = item.to === "/more" && moreActive;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive || forceActive ? "bottom-item is-active" : "bottom-item")}
            aria-current={forceActive ? "page" : undefined}
          >
            <span className="nav-icon">
              <Icon />
              {item.badge ? (
                <span className="bottom-badge" aria-label={t("nav2.unread", { count: item.badge })}>
                  {badgeLabel(item.badge)}
                </span>
              ) : null}
            </span>
            <span className="bottom-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/** Page « Plus » du mobile : Utilisation, Réglages et Avancé. */
export function MorePage() {
  const t = useT();
  const { main, advanced } = useNavModel();
  const extra = main.filter((item) => item.to === "/usage" || item.to === "/settings");
  return (
    <section className="page more-page">
      <ul className="more-list">
        {extra.map((item) => (
          <li key={item.to}>
            <NavEntry item={item} />
          </li>
        ))}
      </ul>
      <h2 className="section-label">{t("nav2.advanced")}</h2>
      <ul className="more-list">
        {advanced.map((item) => (
          <li key={item.to}>
            <NavEntry item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
