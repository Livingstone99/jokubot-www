import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { siteHref } from "../../config.js";
import { JokubotMark, JokubotWordmark } from "../brand/Logo.js";
import { LocaleMenu, useT } from "../locale.js";
import { ThemeToggle } from "../theme.js";

export function LoginPage() {
  const { setMe } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        <AuthHome />
        <div className="auth-toolbar">
          <LocaleMenu />
          <ThemeToggle />
        </div>
        <form className="panel auth-card" onSubmit={(event) => void onSubmit(event)}>
          <p className="eyebrow">{t("auth.business")}</p>
          <h1>{t("auth.signIn")}</h1>
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
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
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

export function AuthHome() {
  return (
    <a href={siteHref("/")} className="auth-home">
      <span className="mark" aria-hidden="true">
        <JokubotMark size={16} />
      </span>
      <JokubotWordmark />
    </a>
  );
}

export function AuthStory({ eyebrow }: { eyebrow?: string }) {
  const t = useT();
  const storyEyebrow = eyebrow ?? t("www.hero.eyebrow");
  return (
    <aside className="auth-story">
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
