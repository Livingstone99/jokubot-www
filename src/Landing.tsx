import { useEffect, useState } from "react";

import { JokubotMark, JokubotWordmark } from "./brand/Logo.js";
import { appHref, siteHref } from "./config.js";
import { LocaleMenu, useT } from "./locale.js";
import { ThemeToggle } from "./theme.js";

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

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal, .reveal-text");
    if (!elements.length) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="land">
      <a className="land-skip" href="#pourquoi">
        {t("nav.skip")}
      </a>

      <header className="land-top">
        <div className="land-bar">
          <div className="land-nav">
            <a href={siteHref()} className="land-brand" aria-label={t("nav.brandAria")}>
              <span className="mark">
                <JokubotMark size={16} />
              </span>
              <JokubotWordmark />
            </a>
            <div className="land-nav-center">
              <nav className="land-nav-links" aria-label={t("nav.aria")}>
                <a href="#fonctionnalites">{t("nav.features")}</a>
                <a href="#tarifs">{t("nav.pricing")}</a>
                <a href="#contact">{t("nav.contact")}</a>
              </nav>
              <div className="land-nav-actions">
                <a className="land-docs-link" href={appHref("/docs")}>
                  {t("nav.docs")}
                </a>
                <a className="primary land-login-btn" href={appHref("/login")}>
                  {t("nav.login")}
                </a>
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
          </div>
          <div className="land-prefs">
            <LocaleMenu />
            <ThemeToggle />
          </div>
        </div>
        {menuOpen ? (
          <nav className="land-drawer" aria-label={t("nav.mobileAria")}>
            <a href="#fonctionnalites" onClick={() => setMenuOpen(false)}>
              {t("nav.features")}
            </a>
            <a href="#tarifs" onClick={() => setMenuOpen(false)}>
              {t("nav.pricing")}
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              {t("nav.contact")}
            </a>
            <a href={appHref("/docs")} onClick={() => setMenuOpen(false)}>
              {t("nav.docs")}
            </a>
            <a href={appHref("/login")} onClick={() => setMenuOpen(false)}>
              {t("nav.login")}
            </a>
          </nav>
        ) : null}
      </header>

      <main className="land-main">
        <section className="land-hero">
          <img
            className="land-hero-bg"
            src={siteHref("/jokubot-couverture.png")}
            alt=""
            aria-hidden="true"
          />
          <div className="land-hero-copy">
            <p className="eyebrow">{t("hero.eyebrow")}</p>
            <h1>{t("hero.title")}</h1>
            <p className="lede">{t("hero.lede")}</p>
            <div className="land-hero-actions">
              <a className="primary" href={appHref("/login")}>
                {t("hero.cta")}
                <IconArrow />
              </a>
            </div>
          </div>
        </section>

        <section className="land-invert reveal" id="pourquoi">
          <div className="land-section-inner">
            <header className="land-section-head">
              <p className="eyebrow reveal-text">{t("why.eyebrow")}</p>
              <h2 className="reveal-text" style={{ transitionDelay: "0.1s" }}>
                {t("why.title")}
              </h2>
            </header>
            <div className="timeline timeline-5">
              <div className="timeline-item">
                <span className="timeline-circle">01</span>
                <h3>{t("why.1title")}</h3>
                <p>{t("why.1body")}</p>
              </div>
              <div className="timeline-item">
                <span className="timeline-circle">02</span>
                <h3>{t("why.2title")}</h3>
                <p>{t("why.2body")}</p>
              </div>
              <div className="timeline-item">
                <span className="timeline-circle">03</span>
                <h3>{t("why.3title")}</h3>
                <p>{t("why.3body")}</p>
              </div>
              <div className="timeline-item">
                <span className="timeline-circle">04</span>
                <h3>{t("why.4title")}</h3>
                <p>{t("why.4body")}</p>
              </div>
              <div className="timeline-item">
                <span className="timeline-circle">05</span>
                <h3>{t("why.5title")}</h3>
                <p>{t("why.5body")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="land-section reveal" id="fonctionnalites">
          <header className="land-section-head">
            <p className="eyebrow reveal-text">{t("features.eyebrow")}</p>
            <h2 className="reveal-text" style={{ transitionDelay: "0.1s" }}>
              {t("features.title")}
            </h2>
          </header>
          <div className="quote-grid">
            <article className="quote-card">
              <div className="quote-card-footer">
                <span className="quote-avatar">01</span>
                <div>
                  <p className="quote-name">{t("features.1name")}</p>
                  <p className="quote-role">{t("features.role")}</p>
                </div>
              </div>
              <p className="quote-text">{t("features.1text")}</p>
            </article>
            <article className="quote-card">
              <div className="quote-card-footer">
                <span className="quote-avatar">02</span>
                <div>
                  <p className="quote-name">{t("features.2name")}</p>
                  <p className="quote-role">{t("features.role")}</p>
                </div>
              </div>
              <p className="quote-text">{t("features.2text")}</p>
            </article>
            <article className="quote-card">
              <div className="quote-card-footer">
                <span className="quote-avatar">03</span>
                <div>
                  <p className="quote-name">{t("features.3name")}</p>
                  <p className="quote-role">{t("features.role")}</p>
                </div>
              </div>
              <p className="quote-text">{t("features.3text")}</p>
            </article>
            <article className="quote-card">
              <div className="quote-card-footer">
                <span className="quote-avatar">04</span>
                <div>
                  <p className="quote-name">{t("features.4name")}</p>
                  <p className="quote-role">{t("features.role")}</p>
                </div>
              </div>
              <p className="quote-text">{t("features.4text")}</p>
            </article>
            <article className="quote-card">
              <div className="quote-card-footer">
                <span className="quote-avatar">05</span>
                <div>
                  <p className="quote-name">{t("features.5name")}</p>
                  <p className="quote-role">{t("features.role")}</p>
                </div>
              </div>
              <p className="quote-text">{t("features.5text")}</p>
            </article>
            <article className="quote-card">
              <div className="quote-card-footer">
                <span className="quote-avatar">06</span>
                <div>
                  <p className="quote-name">{t("features.6name")}</p>
                  <p className="quote-role">{t("features.role")}</p>
                </div>
              </div>
              <p className="quote-text">{t("features.6text")}</p>
            </article>
          </div>
        </section>

        <section className="land-invert reveal" id="contenu">
          <div className="land-section-inner">
            <header className="land-section-head">
              <p className="eyebrow reveal-text">{t("content.eyebrow")}</p>
              <h2 className="reveal-text" style={{ transitionDelay: "0.1s" }}>
                {t("content.title")}
              </h2>
            </header>
            <div className="media-grid">
              <article className="media-card">
                <div className="media-card-visual">
                  <img src={siteHref("/agent-telephone.jpg")} alt={t("content.1title")} loading="lazy" decoding="async" />
                </div>
                <div className="media-card-body">
                  <h3>{t("content.1title")}</h3>
                  <p>{t("content.1body")}</p>
                </div>
              </article>
              <article className="media-card">
                <div className="media-card-visual">
                  <img src={siteHref("/agent-salut.jpg")} alt={t("content.2title")} loading="lazy" decoding="async" />
                </div>
                <div className="media-card-body">
                  <h3>{t("content.2title")}</h3>
                  <p>{t("content.2body")}</p>
                </div>
              </article>
              <article className="media-card">
                <div className="media-card-visual">
                  <img src={siteHref("/agent-veste.jpg")} alt={t("content.3title")} loading="lazy" decoding="async" />
                </div>
                <div className="media-card-body">
                  <h3>{t("content.3title")}</h3>
                  <p>{t("content.3body")}</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="land-section reveal" id="reseaux">
          <header className="land-section-head">
            <p className="eyebrow reveal-text">{t("social.eyebrow")}</p>
            <h2 className="reveal-text" style={{ transitionDelay: "0.1s" }}>
              {t("social.title")}
            </h2>
          </header>
          <div className="split-panel">
            <div className="row-list">
              <div className="row-item">
                <span className="row-item-label">{t("social.row1Label")}</span>
                <p>{t("social.row1Body")}</p>
              </div>
              <div className="row-item">
                <span className="row-item-label">{t("social.row2Label")}</span>
                <p>{t("social.row2Body")}</p>
              </div>
              <div className="row-item">
                <span className="row-item-label">{t("social.row3Label")}</span>
                <p>{t("social.row3Body")}</p>
              </div>
            </div>
            <div className="callout-card">
              <p className="eyebrow">{t("social.resultLabel")}</p>
              <p>{t("social.resultText")}</p>
            </div>
          </div>
        </section>

        <section className="land-invert reveal" id="paiement">
          <div className="land-section-inner">
            <header className="land-section-head">
              <p className="eyebrow reveal-text">{t("payment.eyebrow")}</p>
              <h2 className="reveal-text" style={{ transitionDelay: "0.1s" }}>
                {t("payment.title")}
              </h2>
            </header>
            <div className="step-row cols-3">
              <div className="step-card">
                <span className="step-num">{t("payment.step1")}</span>
                <h3>{t("payment.step1Title")}</h3>
                <p>{t("payment.step1Body")}</p>
              </div>
              <div className="step-card">
                <span className="step-num">{t("payment.step2")}</span>
                <h3>{t("payment.step2Title")}</h3>
                <p>{t("payment.step2Body")}</p>
              </div>
              <div className="step-card is-featured">
                <IconShield />
                <span className="step-num">{t("payment.step3")}</span>
                <h3>{t("payment.step3Title")}</h3>
                <p>{t("payment.step3Body")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="land-section reveal" id="tarifs">
          <header className="land-section-head">
            <p className="eyebrow reveal-text">{t("pricing.eyebrow")}</p>
            <h2 className="reveal-text" style={{ transitionDelay: "0.1s" }}>
              {t("pricing.title")}
            </h2>
          </header>
          <div className="pricing-grid">
            <div className="pricing-card">
              <span className="pricing-tag" />
              <p className="pricing-name">{t("pricing.starterName")}</p>
              <p className="pricing-price">
                15 000 F<span>{t("pricing.perMonth")}</span>
              </p>
              <p className="pricing-for">{t("pricing.starterFor")}</p>
              <ul className="pricing-features">
                <li>{t("pricing.starterFeat1")}</li>
                <li>{t("pricing.starterFeat2")}</li>
                <li>{t("pricing.starterFeat3")}</li>
                <li>{t("pricing.starterFeat4")}</li>
              </ul>
              <a className="secondary" href={appHref("/login")}>
                {t("pricing.starterCta")}
              </a>
            </div>
            <div className="pricing-card">
              <span className="pricing-tag" />
              <p className="pricing-name">{t("pricing.proName")}</p>
              <p className="pricing-price">
                35 000 F<span>{t("pricing.perMonth")}</span>
              </p>
              <p className="pricing-for">{t("pricing.proFor")}</p>
              <ul className="pricing-features">
                <li>{t("pricing.proFeat1")}</li>
                <li>{t("pricing.proFeat2")}</li>
                <li>{t("pricing.proFeat3")}</li>
                <li>{t("pricing.proFeat4")}</li>
                <li>{t("pricing.proFeat5")}</li>
              </ul>
              <a className="secondary" href={appHref("/login")}>
                {t("pricing.proCta")}
              </a>
            </div>
            <div className="pricing-card is-featured">
              <span className="pricing-tag">{t("pricing.businessTag")}</span>
              <p className="pricing-name">{t("pricing.businessName")}</p>
              <p className="pricing-price">
                75 000 F<span>{t("pricing.perMonth")}</span>
              </p>
              <p className="pricing-for">{t("pricing.businessFor")}</p>
              <ul className="pricing-features">
                <li>{t("pricing.businessFeat1")}</li>
                <li>{t("pricing.businessFeat2")}</li>
                <li>{t("pricing.businessFeat3")}</li>
                <li>{t("pricing.businessFeat4")}</li>
                <li>{t("pricing.businessFeat5")}</li>
              </ul>
              <a className="primary" href={appHref("/login")}>
                {t("pricing.businessCta")}
              </a>
            </div>
            <div className="pricing-card">
              <span className="pricing-tag" />
              <p className="pricing-name">{t("pricing.customName")}</p>
              <p className="pricing-price">{t("pricing.customPrice")}</p>
              <p className="pricing-for">{t("pricing.customFor")}</p>
              <ul className="pricing-features">
                <li>{t("pricing.customFeat1")}</li>
                <li>{t("pricing.customFeat2")}</li>
                <li>{t("pricing.customFeat3")}</li>
                <li>{t("pricing.customFeat4")}</li>
              </ul>
              <a className="secondary" href="#contact">
                {t("pricing.customCta")}
              </a>
            </div>
          </div>
        </section>

        <section className="land-section reveal" id="contact">
          <div className="platform">
            <div className="platform-mock" aria-hidden="true">
              <div className="platform-mock-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="platform-mock-screen">
                <div className="platform-stats">
                  {PLATFORM_STATS.map((n) => (
                    <div className="platform-stat" key={n}>
                      <span>{t(`platform.stat${n}Label`)}</span>
                      <strong>{t(`platform.stat${n}Value`)}</strong>
                    </div>
                  ))}
                </div>
                <div className="platform-chart">
                  {PLATFORM_BARS.map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <ul className="platform-activity">
                  {PLATFORM_ACTIVITY.map((n) => (
                    <li key={n}>
                      <span>{t(`platform.activity${n}`)}</span>
                      <em className={n === 3 ? "is-live" : undefined}>
                        {t(`platform.activity${n}Status`)}
                      </em>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="platform-copy">
              <p className="eyebrow reveal-text">{t("platform.eyebrow")}</p>
              <h2 className="reveal-text" style={{ transitionDelay: "0.1s" }}>
                {t("platform.title")}
              </h2>
              <p className="lede">{t("platform.lede")}</p>
              <ul className="platform-features">
                {PLATFORM_FEATURES.map((n) => (
                  <li key={n}>
                    <IconCheck />
                    {t(`platform.feat${n}`)}
                  </li>
                ))}
              </ul>
              <a className="primary" href={appHref("/login")}>
                {t("platform.cta")}
                <IconArrow />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="land-foot">
        <div className="land-foot-top">
          <div className="land-foot-brand">
            <div className="land-foot-brand-mark">
              <span className="mark">
                <JokubotMark size={16} />
              </span>
              <JokubotWordmark />
            </div>
            <p className="land-foot-tagline">{t("footer.tagline")}</p>
            <div className="land-foot-social" aria-label={t("footer.socialAria")}>
              <a href="#" aria-label="Facebook">
                <IconFacebook />
              </a>
              <a href="#" aria-label="Instagram">
                <IconInstagram />
              </a>
              <a href="#" aria-label="TikTok">
                <IconTikTok />
              </a>
              <a href="#" aria-label="LinkedIn">
                <IconLinkedIn />
              </a>
            </div>
          </div>

          <nav className="land-foot-col" aria-label={t("footer.colProduct")}>
            <p className="land-foot-col-title">{t("footer.colProduct")}</p>
            <a href="#fonctionnalites">{t("nav.features")}</a>
            <a href="#tarifs">{t("nav.pricing")}</a>
            <a href={appHref("/docs")}>{t("nav.docs")}</a>
          </nav>

          <nav className="land-foot-col" aria-label={t("footer.colCompany")}>
            <p className="land-foot-col-title">{t("footer.colCompany")}</p>
            <a href="#pourquoi">{t("footer.linkAbout")}</a>
            <a href="#contact">{t("nav.contact")}</a>
            <a href="mailto:contact@jokubot.com">{t("footer.linkSupport")}</a>
          </nav>

          <nav className="land-foot-col" aria-label={t("footer.colLegal")}>
            <p className="land-foot-col-title">{t("footer.colLegal")}</p>
            <a href={appHref("/terms")}>{t("footer.linkTerms")}</a>
            <a href={appHref("/privacy")}>{t("footer.linkPrivacy")}</a>
          </nav>
        </div>

        <div className="land-foot-bottom">
          <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
          <span>{t("footer.bottomTag")}</span>
        </div>
      </footer>
    </div>
  );
}

const PLATFORM_STATS = [1, 2, 3, 4, 5, 6] as const;
const PLATFORM_BARS = [42, 64, 50, 78, 60, 92, 72];
const PLATFORM_ACTIVITY = [1, 2, 3] as const;
const PLATFORM_FEATURES = [1, 2, 3, 4, 5, 6] as const;

function IconCheck() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="m3.5 8.5 3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

function IconShield() {
  return (
    <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
      <path
        d="M8 2 13 3.6v3.8c0 3.2-2.1 5.3-5 6.2-2.9-.9-5-3-5-6.2V3.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="m5.6 8 1.7 1.7 3.1-3.4"
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

function IconFacebook() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path
        d="M9.6 14V8.6h1.8l.3-2.1H9.6V5.2c0-.6.2-1 1-1h1.1V2.3c-.2 0-.9-.1-1.6-.1-1.6 0-2.7 1-2.7 2.8v1.5H5.7v2.1h1.7V14z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <rect
        x="2.2"
        y="2.2"
        width="11.6"
        height="11.6"
        rx="3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="8" r="2.9" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11.3" cy="4.7" r="0.8" fill="currentColor" />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path
        d="M9.1 1.8c.3 1.5 1.2 2.4 2.8 2.6v1.9c-1-.1-1.9-.4-2.8-1v4.4a3.4 3.4 0 1 1-3.4-3.4c.2 0 .4 0 .6.1v1.9a1.5 1.5 0 1 0 1 1.4V1.8z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <rect
        x="2.2"
        y="2.2"
        width="11.6"
        height="11.6"
        rx="2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="5.4" cy="5.6" r="0.9" fill="currentColor" />
      <path d="M4.6 7.4h1.6V12H4.6z" fill="currentColor" />
      <path
        d="M7.6 7.4h1.5v.8c.3-.5.9-.9 1.7-.9 1.2 0 1.9.8 1.9 2.2V12h-1.6V9.8c0-.6-.3-1-.8-1s-.9.4-.9 1V12H7.6z"
        fill="currentColor"
      />
    </svg>
  );
}
