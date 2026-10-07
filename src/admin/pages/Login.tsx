import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { siteHref } from "../../config.js";
import { JokubotMark, JokubotWordmark } from "../brand/Logo.js";
import { LocaleMenu, useT } from "../locale.js";

export function LoginPage() {
  const { setMe } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.login(email, password);
      setMe(result.me);
      navigate("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.signInError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <AuthStory />
      <div className="auth-form">
        <div className="auth-toolbar">
          <LocaleMenu />
        </div>
        <form className="panel auth-card" onSubmit={(event) => void onSubmit(event)}>
          <h1>{t("auth.signIn")}</h1>
          <p className="auth-lede">{t("auth.signInLead")}</p>
          <label>
            {t("common.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder={t("auth.emailPlaceholder")}
              required
            />
          </label>
          <label>
            {t("common.password")}
            <span className="input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-reveal"
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  {showPassword ? (
                    <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  ) : null}
                </svg>
              </button>
            </span>
          </label>
          {error ? (
            <p className="error auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t("auth.signingIn") : t("auth.signIn")}
          </button>
          <p className="hint">
            {t("auth.newBusinessLead")} <Link to="/signup">{t("auth.createAccount")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export function AuthStory({ eyebrow }: { eyebrow?: string }) {
  const t = useT();
  const storyEyebrow = eyebrow ?? t("www.hero.eyebrow");
  return (
    <aside className="auth-story has-bot">
      <img
        className="auth-story-art auth-story-bot"
        src={siteHref("/bot-assis.jpg")}
        alt=""
        aria-hidden="true"
      />
      <div className="auth-story-copy">
        <a href={siteHref("/")} className="auth-story-brand">
          <span className="mark" aria-hidden="true">
            <JokubotMark size={18} />
          </span>
          <JokubotWordmark />
        </a>
        <p className="eyebrow">{storyEyebrow}</p>
      </div>
    </aside>
  );
}
