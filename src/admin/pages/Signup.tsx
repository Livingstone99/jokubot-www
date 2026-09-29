import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { COMPANY_SIZES, countryName, sortedCountryCodes } from "../business-profile.js";
import type { MessageKey } from "../i18n.js";
import { LocaleMenu, useLocale, useT } from "../locale.js";
import { ThemeToggle } from "../theme.js";
import { AuthHome, AuthStory } from "./Login.js";

type AccountKind = "individual" | "business";

export function SignupPage() {
  const { setMe } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = useLocale();
  const [accountKind, setAccountKind] = useState<AccountKind>("individual");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [country, setCountry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isBusiness = accountKind === "business";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.signup({
        accountKind,
        accountHolder,
        email,
        country,
        password,
        ...(isBusiness ? { businessName, companySize } : {}),
      });
      if (result.credentials.apiKey) {
        sessionStorage.setItem("mvs.apiKey", result.credentials.apiKey);
        sessionStorage.setItem("mvs.ingestSecret", result.credentials.ingestSecret);
        sessionStorage.setItem("mvs.mintSecret", result.credentials.mintSecret);
      }
      setMe(result.me);
      navigate("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.signupError"));
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
        <form
          className="panel auth-card is-signup"
          onSubmit={(event) => void onSubmit(event)}
        >
          <p className="eyebrow">{t("auth.signupEyebrow")}</p>
          <h1>{t("auth.signupTitle")}</h1>
          <fieldset className="auth-kind">
            <legend>{t("auth.accountKind")}</legend>
            <div className="auth-kind-choices">
              <button
                type="button"
                className={
                  accountKind === "individual"
                    ? "secondary compact is-selected"
                    : "secondary compact"
                }
                aria-pressed={accountKind === "individual"}
                onClick={() => setAccountKind("individual")}
              >
                {t("auth.kindIndividual")}
              </button>
              <button
                type="button"
                className={
                  accountKind === "business"
                    ? "secondary compact is-selected"
                    : "secondary compact"
                }
                aria-pressed={accountKind === "business"}
                onClick={() => setAccountKind("business")}
              >
                {t("auth.kindBusiness")}
              </button>
            </div>
          </fieldset>
          {isBusiness ? (
            <label>
              {t("auth.businessName")}
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                autoComplete="organization"
                required
              />
            </label>
          ) : null}
          <label>
            {t("auth.accountHolder")}
            <input
              value={accountHolder}
              onChange={(event) => setAccountHolder(event.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label>
            {t("common.email")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <div className={isBusiness ? "row" : undefined}>
            <label>
              {t("common.country")}
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                required
              >
                <option value="" disabled>
                  {t("common.selectCountry")}
                </option>
                {sortedCountryCodes(locale).map((code) => (
                  <option key={code} value={code}>
                    {countryName(code, locale)}
                  </option>
                ))}
              </select>
            </label>
            {isBusiness ? (
              <label>
                {t("auth.companySize")}
                <select
                  value={companySize}
                  onChange={(event) => setCompanySize(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    {t("auth.selectSize")}
                  </option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {t(`auth.size.${size.value}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <label>
            {t("common.password")}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={10}
              required
            />
            <span className="hint">{t("auth.passwordHint")}</span>
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t("auth.creating") : t("auth.createAccountCta")}
          </button>
          <p className="hint">
            {t("auth.hasAccountLead")} <Link to="/login">{t("auth.signInLink")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
