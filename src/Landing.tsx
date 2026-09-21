import { useEffect, useState } from "react";

import { JokubotMark, JokubotWordmark } from "./brand/Logo.js";
import { appHref, siteHref } from "./config.js";
import { LocaleToggle, useT } from "./locale.js";
import { ThemeToggle } from "./theme.js";

const SESSION_SAMPLE = `curl -X POST /v1/verification-sessions \\
  -H "Authorization: Bearer <api-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"channel": "whatsapp", "clientRef": "user-19"}'

# 201 Created
{
  "publicId": "wJ8xK2mP9QrT4vN7bH3sD1",
  "token": "VFY-9Q4XK2M8P7RDT3W6J0HNC4Z5AB",
  "deepLink": "https://wa.me/234801…?text=VFY-9Q4X…",
  "realtimeUrl": "wss://…/v1/realtime/wJ8xK2mP9QrT4vN7bH3sD1"
}`;

export function LandingPage() {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="land">
      <a className="land-skip" href="#flow">
        {t("land.skip")}
      </a>

      <header className="land-top">
        <div className="land-nav">
          <a href={siteHref()} className="land-brand" aria-label={t("land.homeAria")}>
            <span className="mark">
              <JokubotMark size={16} />
            </span>
            <JokubotWordmark />
          </a>
          <nav className="land-nav-links" aria-label={t("land.pageNav")}>
            <a href="#flow">{t("land.flow")}</a>
            <a href="#proof">{t("land.proof")}</a>
            <a href={appHref("/docs")}>{t("nav.docs")}</a>
          </nav>
          <div className="land-nav-actions">
            <a className="ghost land-signin" href={appHref("/login")}>
              {t("land.signIn")}
            </a>
            <span className="land-nav-cta">
              <a className="secondary land-cta" href={appHref("/signup")}>
                {t("land.createAccount")}
              </a>
            </span>
            <LocaleToggle />
            <ThemeToggle />
            <button
              type="button"
              className="icon-btn land-menu-btn"
              aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav className="land-drawer" aria-label={t("land.mobileNav")}>
            <a href="#flow" onClick={() => setMenuOpen(false)}>
              {t("land.flow")}
            </a>
            <a href="#proof" onClick={() => setMenuOpen(false)}>
              {t("land.proof")}
            </a>
            <a href={appHref("/docs")} onClick={() => setMenuOpen(false)}>
              {t("nav.docs")}
            </a>
            <a href={appHref("/login")} onClick={() => setMenuOpen(false)}>
              {t("land.signIn")}
            </a>
            <a href={appHref("/signup")} onClick={() => setMenuOpen(false)}>
              {t("land.createAccount")}
            </a>
          </nav>
        ) : null}
      </header>

      <main className="land-main">
        <section className="land-hero">
          <div className="land-hero-copy">
            <p className="eyebrow">{t("land.eyebrow")}</p>
            <h1>{t("land.heroTitle")}</h1>
            <p className="lede">{t("land.heroLede")}</p>
            <div className="land-hero-actions">
              <a className="primary land-cta" href={appHref("/signup")}>
                {t("land.createAccount")}
                <IconArrow />
              </a>
              <a className="ghost land-ghost-link" href={appHref("/docs")}>
                {t("land.seeApi")}
              </a>
            </div>
            <div className="land-channels">
              <span className="land-channels-label">{t("land.channels")}</span>
              <span className="land-channel">
                <span className="land-channel-dot is-whatsapp" />
                {t("common.whatsapp")}
              </span>
              <span className="land-channel">
                <span className="land-channel-dot is-telegram" />
                {t("common.telegram")}
              </span>
            </div>
          </div>

          <div className="panel land-demo" aria-label={t("land.demoAria")}>
            <div className="land-demo-head">
              <span className="live is-ok land-demo-title">
                <span className="live-dot" />
                <strong>{t("land.demoGateway")}</strong>
              </span>
              <code className="land-demo-id">wJ8xK2mP9Q…</code>
            </div>
            <div className="land-demo-body">
              <div className="land-demo-status">
                <span className="pill pill-verified">{t("ui.verified")}</span>
                <span>{t("land.demoStatus")}</span>
              </div>
              <div className="session-bubble land-demo-bubble">
                <p>
                  <code>VFY-9Q4XK2M8P7RDT3W6J0HNC4Z5AB</code>
                </p>
                <footer>
                  <span>+234 801 ••• 0142</span>
                  <span>14:02</span>
                </footer>
              </div>
              <div className="land-demo-result">
                <IconCheck />
                <strong>{t("land.demoVerified")}</strong>
                <span className="pill pill-proof-phone">{t("ui.proofPhone")}</span>
              </div>
              <p className="land-demo-foot">{t("land.demoFoot")}</p>
            </div>
          </div>
        </section>

        <section className="land-section land-operating-model" id="why">
          <header className="land-section-head">
            <p className="eyebrow">{t("land.modelEyebrow")}</p>
            <h2>{t("land.modelTitle")}</h2>
          </header>
          <div className="land-facts">
            <article className="land-fact">
              <span className="land-fact-icon">
                <IconNoReply />
              </span>
              <h3>{t("land.fact1Title")}</h3>
              <p>{t("land.fact1Body")}</p>
            </article>
            <article className="land-fact">
              <span className="land-fact-icon">
                <IconChannels />
              </span>
              <h3>{t("land.fact2Title")}</h3>
              <p>{t("land.fact2Body")}</p>
            </article>
            <article className="land-fact">
              <span className="land-fact-icon">
                <IconRecord />
              </span>
              <h3>{t("land.fact3Title")}</h3>
              <p>{t("land.fact3Body")}</p>
            </article>
          </div>
        </section>

        <section className="land-section" id="flow">
          <header className="land-section-head">
            <p className="eyebrow">{t("land.flowEyebrow")}</p>
            <h2>{t("land.flowTitle")}</h2>
          </header>
          <ol className="land-flow">
            <li className="panel land-flow-card">
              <header>
                <span>{t("land.flow1Kicker")}</span>
                <IconKey />
              </header>
              <div className="land-flow-body">
                <h3>{t("land.flow1Title")}</h3>
                <p>{t("land.flow1Body")}</p>
              </div>
            </li>
            <li className="panel land-flow-card">
              <header>
                <span>{t("land.flow2Kicker")}</span>
                <IconChat />
              </header>
              <div className="land-flow-body">
                <h3>{t("land.flow2Title")}</h3>
                <p>{t("land.flow2Body")}</p>
              </div>
            </li>
            <li className="panel land-flow-card">
              <header>
                <span>{t("land.flow3Kicker")}</span>
                <IconCheck />
              </header>
              <div className="land-flow-body">
                <h3>{t("land.flow3Title")}</h3>
                <p>{t("land.flow3Body")}</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="land-section" id="proof">
          <header className="land-section-head">
            <p className="eyebrow">{t("land.proofEyebrow")}</p>
            <h2>{t("land.proofTitle")}</h2>
          </header>
          <div className="land-proof">
            <article className="panel land-proof-row">
              <span className="land-proof-label">
                <span className="pill pill-proof-phone">{t("ui.proofPhone")}</span>
              </span>
              <p>{t("land.proofPhone")}</p>
            </article>
            <article className="panel land-proof-row">
              <span className="land-proof-label">
                <span className="pill pill-proof-identity">{t("ui.proofIdentity")}</span>
              </span>
              <p>{t("land.proofIdentity")}</p>
            </article>
          </div>
          <p className="hint land-proof-hint">{t("land.proofHint")}</p>
        </section>

        <section className="land-section" id="api">
          <div className="land-api">
            <div className="land-api-copy">
              <p className="eyebrow">{t("land.apiEyebrow")}</p>
              <h2>{t("land.apiTitle")}</h2>
              <ul className="land-api-points">
                <li>
                  <IconCheck />
                  {t("land.apiPoint1")}
                </li>
                <li>
                  <IconCheck />
                  {t("land.apiPoint2")}
                </li>
                <li>
                  <IconCheck />
                  {t("land.apiPoint3")}
                </li>
              </ul>
              <a className="ghost land-ghost-link" href={appHref("/docs")}>
                {t("docs.title")}
              </a>
            </div>
            <div className="land-terminal">
              <div className="land-terminal-bar">
                <span />
                <span />
                <span />
                <code>create_session.sh</code>
              </div>
              <pre>
                <code>{SESSION_SAMPLE}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className="land-final">
          <div className="land-final-card">
            <div>
              <p className="eyebrow">{t("land.nextEyebrow")}</p>
              <h2>{t("land.nextTitle")}</h2>
              <p>{t("land.nextBody")}</p>
            </div>
            <div className="land-final-actions">
              <a className="primary" href={appHref("/signup")}>
                {t("land.createAccount")}
              </a>
              <a className="ghost" href={appHref("/login")}>
                {t("land.signIn")}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="land-foot">
        <div className="land-foot-brand">
          <span className="mark">
            <JokubotMark size={16} />
          </span>
          <div>
            <JokubotWordmark />
            <p>{t("land.footTag")}</p>
          </div>
        </div>
        <nav className="land-foot-links" aria-label={t("land.footerNav")}>
          <a href="#flow">{t("land.flow")}</a>
          <a href="#proof">{t("land.proof")}</a>
          <a href={appHref("/docs")}>{t("nav.docs")}</a>
          <a href={appHref("/status")}>{t("nav.status")}</a>
          <a href={appHref("/security")}>{t("nav.security")}</a>
          <a href={appHref("/login")}>{t("land.signIn")}</a>
        </nav>
      </footer>
    </div>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M3 8h10M9.5 4.5 13 8l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function IconCheck() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M5.2 8.2 7.1 10l3.7-4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconNoReply() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.8 3.2h10.4v7H7.4l-3.2 2.5v-2.5H2.8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M3.6 12.6 12.4 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChannels() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M2.2 2.6h7.6v5H6.2l-2.2 1.8V7.6H2.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M13.8 6.4v5h-1.4v1.8l-2.2-1.8H6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRecord() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M4 1.8h5.2L12 4.6v9.6H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 1.8v2.8H12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="m6 9.6 1.5 1.5 2.6-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
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

function IconClose() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
