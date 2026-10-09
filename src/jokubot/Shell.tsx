// Cadre de l'espace : menu latéral sur ordinateur, barre du bas sur téléphone.

import { useCallback, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useDb } from "./db.js";
import { SupportChat } from "./Support.js";
import { t } from "./prefs.js";
import { AppLink, Icon, PrefsControls, ReloadProvider, type IconName } from "./ui.js";

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/accueil", label: "Accueil", icon: "home" },
  { to: "/actualites", label: "Actualités", icon: "news" },
  { to: "/compte", label: "Compte", icon: "user" },
];

// Connexions n'a plus d'entrée dans le menu : on y va depuis sa carte de l'Accueil.
function isActive(pathname: string, to: string) {
  if (to === "/accueil")
    return pathname === "/" || ["/accueil", "/connecter", "/reseaux", "/audio"].some((p) => pathname.startsWith(p));
  return pathname.startsWith(to);
}

export function Brand() {
  return (
    <span className="brand">
      <img src={`${import.meta.env.BASE_URL}jokubot-bot.png`} width={32} height={32} alt="" className="brand-mark" />
      <span className="brand-name">JokuBot</span>
    </span>
  );
}

export function Shell() {
  const db = useDb();
  const location = useLocation();
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
    window.scrollTo({ top: 0 });
  }, []);

  const name = [db.account?.firstName, db.account?.lastName].filter(Boolean).join(" ");

  const links = (variant: "side" | "tab") =>
    NAV.map((item) => {
      const active = isActive(location.pathname, item.to);
      return (
        <li key={item.to}>
          <AppLink
            to={item.to}
            className={`${variant}-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon">
              <Icon name={item.icon} size={22} />
            </span>
            <span className="nav-label">{t(item.label)}</span>
          </AppLink>
        </li>
      );
    });

  return (
    <ReloadProvider onReload={reload}>
      <div className="app">
        <a href="#contenu" className="skip">
          {t("Aller au contenu")}
        </a>
        <aside className="side">
          <AppLink to="/" className="side-brand" aria-label={t("JokuBot, accueil")}>
            <Brand />
          </AppLink>
          <nav aria-label={t("Menu principal")}>
            <ul className="side-list">{links("side")}</ul>
          </nav>
          <AppLink to="/compte" className="side-user">
            <span className="avatar" aria-hidden="true">
              {(db.account?.firstName[0] ?? "?").toUpperCase()}
            </span>
            <span className="side-user-text">
              <span className="side-user-name">{name}</span>
              <span className="side-user-mail">{db.account?.email}</span>
            </span>
          </AppLink>
        </aside>

        <header className="topbar">
          <AppLink to="/" aria-label={t("JokuBot, accueil")}>
            <Brand />
          </AppLink>
          <div className="topbar-end">
            {!db.autoReplies && db.engines["service-client"] ? (
              <AppLink to="/moteurs" className="topbar-pause">
                {t("Réponses en pause")}
              </AppLink>
            ) : null}
            <PrefsControls />
          </div>
        </header>

        {/* Langue et thème, en haut à droite (ordinateur). */}
        <div className="top-tools">
          <PrefsControls />
        </div>

        <main id="contenu" className="main" tabIndex={-1} key={reloadKey}>
          <Outlet />
        </main>

        <SupportChat />

        <nav className="tabbar" aria-label={t("Menu principal")}>
          <ul className="tab-list">{links("tab")}</ul>
        </nav>
      </div>
    </ReloadProvider>
  );
}
