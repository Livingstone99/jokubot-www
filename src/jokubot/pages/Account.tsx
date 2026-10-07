import { useEffect, useState, type FormEvent } from "react";

import * as api from "../api.js";
import { NETWORKS } from "../catalog.js";
import { connectionOf, useDb } from "../db.js";
import { t } from "../prefs.js";
import { AppLink, Empty, Icon, Monogram, PageHeader, Rich, Spinner, useConfirm, useToast } from "../ui.js";
import { Field, str, type FieldDef } from "../wizard/fields.js";
import { useForm } from "../wizard/useForm.js";
import { Section } from "./spaces/shared.js";

type Leaf = Exclude<FieldDef, { kind: "group" }>;

const FIELDS: Leaf[] = [
  { kind: "text", name: "firstName", label: "Prénom", autoComplete: "given-name", required: "Indiquez votre prénom." },
  { kind: "text", name: "lastName", label: "Nom", autoComplete: "family-name", optional: true },
  { kind: "email", name: "email", label: "Adresse e-mail", autoComplete: "email" },
];

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferredPrompt: InstallPrompt | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPrompt;
  });
}

function Install() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(deferredPrompt);
  const [installed, setInstalled] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as InstallPrompt;
      setPrompt(deferredPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <p className="muted-text">{t("JokuBot est installé sur cet appareil. Ouvrez-le depuis votre écran d'accueil.")}</p>;
  if (ios) {
    return (
      <ol className="howto">
        <li>
          <Rich text="Dans Safari, touchez **Partager** (le carré avec une flèche vers le haut)." />
        </li>
        <li>
          <Rich text="Puis **Sur l'écran d'accueil**, et **Ajouter**." />
        </li>
      </ol>
    );
  }
  if (prompt) {
    return (
      <button
        type="button"
        className="btn btn-primary"
        onClick={async () => {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice.outcome === "accepted") setInstalled(true);
          deferredPrompt = null;
          setPrompt(null);
        }}
      >
        <Icon name="download" size={18} />
        {t("Installer l'application")}
      </button>
    );
  }
  return (
    <p className="muted-text">
      {t("Sur Android, ouvrez cette page dans Chrome : le bouton d'installation apparaîtra ici. Sur ordinateur, utilisez l'icône d'installation dans la barre d'adresse.")}
    </p>
  );
}

export function AccountPage() {
  const db = useDb();
  const toast = useToast();
  const confirm = useConfirm();
  const form = useForm({
    firstName: db.account?.firstName ?? "",
    lastName: db.account?.lastName ?? "",
    email: db.account?.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  const connected = NETWORKS.filter((n) => connectionOf(db, n.id).connected);

  useEffect(() => {
    document.title = `${t("Compte")} · JokuBot`;
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.check(FIELDS)) return;
    setSaving(true);
    await api.saveProfile({ firstName: str(form.values.firstName), lastName: str(form.values.lastName), email: str(form.values.email) });
    setSaving(false);
    toast(t("Profil enregistré"));
  };

  return (
    <div className="page page-narrow">
      <PageHeader title={t("Compte")} />

      <Section title={t("Vos informations")} id="s-infos">
        <form className="card-form" onSubmit={save} noValidate>
          <div className="form-grid">
            {FIELDS.map((field) => (
              <Field key={field.name} {...form.bind(field)} />
            ))}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
            {saving ? <Spinner /> : null}
            {t("Enregistrer")}
          </button>
        </form>
      </Section>

      <Section title={t("Réseaux connectés")} id="s-reseaux">
        {connected.length === 0 ? (
          <Empty title={t("Aucune messagerie connectée")} action={<AppLink to="/" className="btn btn-ghost">{t("Connecter une messagerie")}</AppLink>} />
        ) : (
          <ul className="list-card">
            {connected.map((net) => (
              <li key={net.id} className="list-row">
                <Monogram id={net.id} filled size="sm" />
                <span className="list-text">
                  <span className="list-title">{net.name}</span>
                  <span className="list-sub">{connectionOf(db, net.id).account}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-danger-text"
                  onClick={async () => {
                    const ok = await confirm({
                      title: t("Déconnecter {reseau} ?", { reseau: net.name }),
                      text: t("JokuBot ne répondra plus à vos clients sur cette messagerie. Vous pourrez la reconnecter à tout moment."),
                      confirm: t("Déconnecter {reseau}", { reseau: net.name }),
                      danger: true,
                    });
                    if (!ok) return;
                    await api.disconnect(net.id);
                    toast(t("{reseau} est déconnecté", { reseau: net.name }));
                  }}
                >
                  {t("Déconnecter")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("Installer l'application")} id="s-installer">
        <div className="card-form">
          <p className="muted-text">{t("Gardez JokuBot sur votre écran d'accueil, comme une application, pour répondre plus vite.")}</p>
          <Install />
        </div>
      </Section>

      <button
        type="button"
        className="btn btn-ghost logout"
        onClick={async () => {
          const ok = await confirm({
            title: t("Se déconnecter ?"),
            text: t("JokuBot continue de répondre à vos clients. Vous pourrez revenir avec votre e-mail et votre mot de passe."),
            confirm: t("Se déconnecter"),
          });
          if (!ok) return;
          api.logout();
          window.location.hash = "#/";
        }}
      >
        <Icon name="logout" size={18} />
        {t("Se déconnecter")}
      </button>
    </div>
  );
}
