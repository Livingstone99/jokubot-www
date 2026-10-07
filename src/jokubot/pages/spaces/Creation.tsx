import { useState, type FormEvent } from "react";

import * as api from "../../api.js";
import { useDb, type Creation } from "../../db.js";
import { dateTime } from "../../format.js";
import { downloadPoster, posterUrl } from "../../poster.js";
import { t } from "../../prefs.js";
import { copyText, Empty, Icon, Spinner, useToast } from "../../ui.js";
import { Field, str, type FieldDef } from "../../wizard/fields.js";
import { useForm } from "../../wizard/useForm.js";
import { Section } from "./shared.js";

type Leaf = Exclude<FieldDef, { kind: "group" }>;

const FIELDS: Leaf[] = [
  {
    kind: "radio",
    name: "kind",
    label: "Type",
    columns: 2,
    options: [
      { value: "image", label: "Image", description: "Une affiche pour vos réseaux et vos statuts." },
      { value: "video", label: "Vidéo", description: "Une courte vidéo de présentation.", disabled: true, badge: "Bientôt" },
    ],
  },
  {
    kind: "radio",
    name: "format",
    label: "Format",
    columns: 2,
    options: [
      { value: "carre", label: "Carré", description: "Facebook et Instagram" },
      { value: "vertical", label: "Vertical", description: "Statuts WhatsApp et stories" },
    ],
  },
  {
    kind: "textarea",
    name: "description",
    label: "Description",
    rows: 3,
    placeholder: "Pagne wax hollandais bleu, 6 yards, 15 000 FCFA",
    hint: "Le produit, sa couleur et son prix. Le prix sera mis en avant sur l'affiche.",
    required: "Décrivez le produit à mettre sur l'affiche.",
  },
];

export function CreationSpace() {
  const db = useDb();
  const toast = useToast();
  const form = useForm({ kind: "image", format: db.engines.creation?.format ?? "carre", description: "" });
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const result = db.creations.find((c) => c.id === resultId) ?? null;

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.check(FIELDS)) return;
    setBusy(true);
    try {
      const creation = await api.createVisual(str(form.values.description), str(form.values.format) as "carre");
      setResultId(creation.id);
      requestAnimationFrame(() => document.getElementById("resultat")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } finally {
      setBusy(false);
    }
  };

  const publish = async (creation: Creation) => {
    if (!db.engines.reseaux) {
      toast("Reliez d'abord votre page Facebook.", { label: "Régler", to: "/moteurs/reseaux/reglages" });
      return;
    }
    setPublishing(true);
    try {
      await api.publishPost({ text: creation.caption, creationId: creation.id });
      toast("Publié sur votre page Facebook", { label: "Voir", to: "/moteurs/reseaux" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space">
      <div className="space-cols">
        <Section title="Nouvelle création">
          <form className="card-form" onSubmit={create} noValidate>
            {FIELDS.map((field) => (
              <Field key={field.name} {...form.bind(field)} />
            ))}
            <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy}>
              {busy ? <Spinner /> : <Icon name="sparkle" size={18} />}
              {busy ? t("Création en cours…") : t("Créer le visuel")}
            </button>
          </form>
        </Section>

        <Section title="Résultat" id="resultat">
          {busy ? (
            <div className="result-wait" role="status">
              <div className="skeleton" />
              <p>{t("JokuBot dessine votre affiche…")}</p>
            </div>
          ) : result ? (
            <div className="result">
              <img
                className={`result-img is-${result.format}`}
                src={posterUrl(result.svg)}
                alt={t("Affiche : {description}", { description: result.description })}
              />
              <p className="caption">{result.caption}</p>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={async () => toast((await copyText(result.caption)) ? t("Légende copiée") : t("Copie impossible"))}
                >
                  <Icon name="copy" size={18} />
                  {t("Copier la légende")}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => void downloadPoster(result.svg, "affiche-jokubot")}>
                  <Icon name="download" size={18} />
                  {t("Télécharger")}
                </button>
                <button type="button" className="btn btn-primary" disabled={publishing} aria-busy={publishing} onClick={() => void publish(result)}>
                  {publishing ? <Spinner /> : null}
                  {t("Publier sur Facebook")}
                </button>
              </div>
            </div>
          ) : (
            <Empty title="Votre affiche apparaîtra ici">{t("Décrivez un produit, puis touchez « Créer le visuel ».")}</Empty>
          )}
        </Section>
      </div>

      <Section title="Mes créations">
        {db.creations.length === 0 ? (
          <Empty title="Aucune création pour l'instant" />
        ) : (
          <ul className="gallery">
            {db.creations.map((creation) => (
              <li key={creation.id}>
                <button
                  type="button"
                  className={`gallery-item${creation.id === resultId ? " is-active" : ""}`}
                  onClick={() => {
                    setResultId(creation.id);
                    document.getElementById("resultat")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <img src={posterUrl(creation.svg)} alt="" loading="lazy" />
                  <span className="gallery-text">{creation.description}</span>
                  <span className="gallery-date">{dateTime(creation.at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
