import { useState, type FormEvent } from "react";

import * as api from "../../api.js";
import { useDb } from "../../db.js";
import { COUNTRIES, dateTime, money } from "../../format.js";
import { t } from "../../prefs.js";
import { AppLink, Empty, Spinner, StatusPill, useToast } from "../../ui.js";
import { Field, str, type FieldDef } from "../../wizard/fields.js";
import { useForm } from "../../wizard/useForm.js";
import { Section, Thumb, VisualPicker } from "./shared.js";

type Leaf = Exclude<FieldDef, { kind: "group" }>;

const FIELDS: Leaf[] = [
  { kind: "textarea", name: "adText", label: "Texte de la publicité", rows: 4, required: "Écrivez le texte de la publicité." },
  {
    kind: "number",
    name: "adBudget",
    label: "Budget par jour (FCFA)",
    inputMode: "numeric",
    hint: "1 000 FCFA minimum.",
    required: "Indiquez le budget par jour.",
    validate: (v) => {
      const value = Number(str(v));
      if (!Number.isFinite(value)) return "Écrivez le budget en chiffres, sans espace. Exemple : 2000";
      return value < 1000 ? "Le budget minimum est de 1 000 FCFA par jour." : null;
    },
  },
  {
    kind: "select",
    name: "adDays",
    label: "Durée",
    options: [
      { value: "3", label: "3 jours" },
      { value: "7", label: "7 jours" },
      { value: "14", label: "14 jours" },
      { value: "30", label: "30 jours" },
    ],
  },
];

export function MetaSpace() {
  const db = useDb();
  const toast = useToast();
  const first = db.creations[0];
  const form = useForm({ adText: first?.caption ?? "", adBudget: "2000", adDays: "7" });
  const [visual, setVisual] = useState(first?.id ?? "");
  const [launchNow, setLaunchNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const settings = db.engines.meta;
  if (!settings) return null;

  const budget = Number(str(form.values.adBudget)) || 0;
  const days = Number(str(form.values.adDays)) || 0;
  const country = COUNTRIES.find((c) => c.code === settings.country)?.name ?? settings.country;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.check(FIELDS)) return;
    if (!visual) {
      toast(t("Choisissez un visuel pour la publicité."));
      return;
    }
    setBusy(true);
    try {
      await api.createCampaign({ text: str(form.values.adText), budget, days, creationId: visual, launchNow });
      toast(launchNow ? t("Campagne lancée") : t("Campagne créée en pause"));
    } catch (error) {
      form.fail(error, "adBudget");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space">
      <p className="banner">
        {t("Compte {compte} · publicités diffusées : {pays}.", { compte: settings.adAccount, pays: t(country) })}
      </p>
      <div className="space-cols">
        <Section title="Nouvelle campagne">
          {db.creations.length === 0 ? (
            <Empty title="Il vous faut d'abord un visuel" action={<AppLink to="/moteurs/creation" className="btn btn-primary">{t("Créer un visuel")}</AppLink>}>
              {t("La publicité montre une affiche créée par JokuBot.")}
            </Empty>
          ) : (
            <form className="card-form" onSubmit={submit} noValidate>
              <VisualPicker
                name="adVisual"
                creations={db.creations}
                value={visual}
                onChange={(id) => {
                  setVisual(id);
                  const creation = db.creations.find((c) => c.id === id);
                  if (creation) form.set("adText", creation.caption);
                }}
              />
              {FIELDS.map((field) => (
                <Field key={field.name} {...form.bind(field)} />
              ))}
              <label className="check-line">
                <input type="checkbox" checked={launchNow} onChange={(event) => setLaunchNow(event.target.checked)} />
                <span>
                  {t("Lancer tout de suite")}
                  <span className="check-hint">{t("Sinon, la campagne est créée en pause.")}</span>
                </span>
              </label>
              <p className="total" aria-live="polite">
                <span>{t("Total")}</span>
                <strong>{budget >= 1000 && days ? money(budget * days) : "—"}</strong>
                <span className="total-detail">{budget >= 1000 && days ? t("{budget} × {jours} jours", { budget: money(budget), jours: days }) : t("Indiquez un budget d'au moins 1 000 FCFA")}</span>
              </p>
              <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy}>
                {busy ? <Spinner /> : null}
                {launchNow ? t("Lancer la campagne") : t("Créer la campagne en pause")}
              </button>
            </form>
          )}
        </Section>

        <Section title="Campagnes">
          {db.campaigns.length === 0 ? (
            <Empty title="Aucune campagne pour l'instant">Vos campagnes et leur budget apparaîtront ici.</Empty>
          ) : (
            <ul className="posts">
              {db.campaigns.map((campaign, index) => (
                <li key={campaign.id} className="post">
                  <Thumb creation={db.creations.find((c) => c.id === campaign.creationId)} size={64} />
                  <div className="post-body">
                    <p className="post-title">
                      {t("Campagne {n} · {budget} par jour", { n: db.campaigns.length - index, budget: money(campaign.budget) })}
                    </p>
                    <p className="post-meta">
                      {t("{jours} jours · {total} au total · créée : {date}", { jours: campaign.days, total: money(campaign.budget * campaign.days), date: dateTime(campaign.at) })}
                    </p>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={async () => {
                        const next = campaign.status === "active" ? "pause" : "active";
                        await api.setCampaignStatus(campaign.id, next);
                        toast(next === "active" ? t("Campagne relancée") : t("Campagne mise en pause"));
                      }}
                    >
                      {campaign.status === "active" ? t("Mettre en pause") : t("Lancer")}
                    </button>
                  </div>
                  <StatusPill tone={campaign.status === "active" ? "solid" : "outline"}>
                    {campaign.status === "active" ? t("Active") : t("En pause")}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
