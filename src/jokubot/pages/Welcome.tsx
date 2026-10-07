// Création du compte, ou connexion si un compte existe déjà sur cet appareil.

import { useEffect, useState, type FormEvent } from "react";

import * as api from "../api.js";
import { useDb } from "../db.js";
import { Brand } from "../Shell.js";
import { t } from "../prefs.js";
import { PrefsControls, Spinner } from "../ui.js";
import { Field, fieldId, validateField, type FieldDef, type Values } from "../wizard/fields.js";

type Leaf = Exclude<FieldDef, { kind: "group" }>;

const SIGNUP: Leaf[] = [
  { kind: "text", name: "firstName", label: "Prénom", placeholder: "Awa", required: "Indiquez votre prénom.", autoComplete: "given-name" },
  { kind: "email", name: "email", label: "Adresse e-mail", placeholder: "awa@gmail.com", autoComplete: "email" },
  {
    kind: "secret",
    name: "password",
    label: "Mot de passe",
    autoComplete: "new-password",
    hint: "8 caractères au moins.",
    required: "Choisissez un mot de passe.",
    validate: (v) => (typeof v === "string" && v.length >= 8 ? null : "Le mot de passe doit faire au moins 8 caractères."),
  },
];

const LOGIN: Leaf[] = [
  { kind: "email", name: "email", label: "Adresse e-mail", autoComplete: "email" },
  { kind: "secret", name: "password", label: "Mot de passe", autoComplete: "current-password", required: "Saisissez votre mot de passe." },
];

export function WelcomePage() {
  const db = useDb();
  const [mode, setMode] = useState<"signup" | "login">(db.account ? "login" : "signup");
  const [values, setValues] = useState<Values>({ firstName: "", email: db.account?.email ?? "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fields = mode === "signup" ? SIGNUP : LOGIN;

  useEffect(() => {
    document.title = `${mode === "signup" ? t("Créer mon compte") : t("Se connecter")} · JokuBot`;
  }, [mode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    for (const field of fields) {
      const message = validateField(field, values);
      if (message) found[field.name] = message;
    }
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return document.getElementById(fieldId(first))?.focus();
    setBusy(true);
    try {
      const input = { email: String(values.email), password: String(values.password) };
      if (mode === "signup") await api.signup({ ...input, firstName: String(values.firstName) });
      else await api.login(input);
      window.location.hash = "#/";
    } catch (error) {
      const field = error instanceof api.ApiError && error.field ? error.field : "email";
      setErrors({ [field]: error instanceof Error ? error.message : t("Une erreur est survenue. Réessayez.") });
      document.getElementById(fieldId(field))?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="welcome">
      <aside className="welcome-side">
        {/* Le robot JokuBot qui salue, comme sur l'ancien écran de connexion. */}
        <img className="welcome-bot" src={`${import.meta.env.BASE_URL}bot-salut.jpg`} alt="" aria-hidden="true" />
        <div className="welcome-side-copy">
          <Brand />
          <p className="welcome-pitch">{t("Vos clients écrivent. JokuBot répond, jour et nuit.")}</p>
        </div>
      </aside>
      <main className="welcome-main" id="contenu">
        <div className="welcome-prefs">
          <PrefsControls />
        </div>
        <form className="welcome-form" onSubmit={submit} noValidate>
          <h1 className="wz-title">{mode === "signup" ? t("Créer mon compte") : t("Se connecter")}</h1>
          <p className="wz-help">
            {mode === "signup"
              ? t("Votre espace est prêt en quelques secondes, avec un exemple : la Boutique Awa.")
              : t("Content de vous revoir.")}
          </p>
          <div className="wz-fields">
            {fields.map((field) => (
              <Field
                key={`${mode}-${field.name}`}
                field={field}
                value={values[field.name]}
                error={errors[field.name]}
                onChange={(value) => {
                  setValues((v) => ({ ...v, [field.name]: value }));
                  setErrors(({ [field.name]: _gone, ...rest }) => rest);
                }}
              />
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
            {busy ? <Spinner /> : null}
            {mode === "signup" ? t("Créer mon compte") : t("Se connecter")}
          </button>
          <p className="welcome-switch">
            {mode === "signup" ? t("Déjà un compte ?") : t("Pas encore de compte ?")}{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setErrors({});
              }}
            >
              {mode === "signup" ? t("Se connecter") : t("Créer un compte")}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
