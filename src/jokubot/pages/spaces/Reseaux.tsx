import { useState, type FormEvent } from "react";

import * as api from "../../api.js";
import { useDb, type Post } from "../../db.js";
import { dateTime, plural } from "../../format.js";
import { t } from "../../prefs.js";
import { AppLink, Empty, Spinner, StatusPill, useToast } from "../../ui.js";
import { Field, hourLabel, str, type FieldDef } from "../../wizard/fields.js";
import { useForm } from "../../wizard/useForm.js";
import { Section, Thumb, VisualPicker } from "./shared.js";

type Leaf = Exclude<FieldDef, { kind: "group" }>;

const FIELDS: Leaf[] = [
  { kind: "textarea", name: "postText", label: "Texte", rows: 4, required: "Écrivez le texte de la publication." },
  {
    kind: "datetime",
    name: "postWhen",
    label: "Programmer pour",
    optional: true,
    hint: "Laissez vide pour publier tout de suite.",
    validate: (v) => (str(v) && new Date(str(v)).getTime() < Date.now() ? "Cette date est passée. Choisissez une date à venir, ou laissez vide." : null),
  },
];

const STATUS: Record<Post["status"], { label: string; tone: "solid" | "outline" | "muted" }> = {
  publie: { label: "Publié", tone: "solid" },
  programme: { label: "Programmé", tone: "outline" },
  echec: { label: "Échec", tone: "muted" },
};

const FREQUENCY = { jour: "chaque jour", lmv: "le lundi, le mercredi et le vendredi", lundi: "chaque lundi" } as const;

export function ReseauxSpace() {
  const db = useDb();
  const toast = useToast();
  const settings = db.engines.reseaux;
  const form = useForm({ postText: "", postWhen: "" });
  const [visual, setVisual] = useState(db.creations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!settings) return null;

  const chooseVisual = (id: string) => {
    setVisual(id);
    const creation = db.creations.find((c) => c.id === id);
    if (creation && !str(form.values.postText).trim()) form.set("postText", creation.caption);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.check(FIELDS)) return;
    setBusy(true);
    setError(null);
    try {
      const when = str(form.values.postWhen);
      const post = await api.publishPost({
        text: str(form.values.postText),
        ...(visual ? { creationId: visual } : {}),
        ...(when ? { scheduledFor: when } : {}),
      });
      form.setValues({ postText: "", postWhen: "" });
      toast(post.status === "programme" ? t("Publication programmée") : t("Publié sur votre page Facebook"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("La publication a échoué. Réessayez."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space">
      <p className="banner">
        {settings.autoPublish
          ? t("Publication automatique {quand} à {heure}, sur {sujets}.", {
              quand: t(FREQUENCY[settings.frequency]),
              heure: hourLabel(settings.time),
              sujets: plural(settings.topics.length, "sujet", "sujets"),
            })
          : t("Publication automatique désactivée : vous publiez vous-même ci-dessous.")}
        {settings.instagramId ? ` ${t("Instagram est relié.")}` : ""}
      </p>

      <div className="space-cols">
        <Section title="Nouvelle publication">
          <form className="card-form" onSubmit={submit} noValidate>
            {db.creations.length > 0 ? (
              <VisualPicker name="postVisual" creations={db.creations} value={visual} onChange={chooseVisual} allowNone />
            ) : (
              <p className="muted-text">
                {t("Pas encore de visuel.")} <AppLink to="/moteurs/creation">{t("Créez une affiche")}</AppLink>{" "}
                {t("pour l'ajouter à la publication.")}
              </p>
            )}
            {FIELDS.map((field) => (
              <Field key={field.name} {...form.bind(field)} />
            ))}
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy}>
              {busy ? <Spinner /> : null}
              {str(form.values.postWhen) ? t("Programmer la publication") : t("Publier maintenant")}
            </button>
          </form>
        </Section>

        <Section title="Publications">
          {db.posts.length === 0 ? (
            <Empty title="Aucune publication pour l'instant">Vos publications et leur résultat apparaîtront ici.</Empty>
          ) : (
            <ul className="posts">
              {db.posts.map((post) => (
                <li key={post.id} className="post">
                  <Thumb creation={db.creations.find((c) => c.id === post.creationId)} size={64} />
                  <div className="post-body">
                    <p className="post-text">{post.text}</p>
                    <p className="post-meta">
                      {post.scheduledFor ? t("Prévu : {date}", { date: dateTime(post.scheduledFor) }) : dateTime(post.at)} ·{" "}
                      {post.status === "programme" ? t("Sera publié à l'heure prévue") : t("Publié sur votre page Facebook")}
                    </p>
                  </div>
                  <StatusPill tone={STATUS[post.status].tone}>{t(STATUS[post.status].label)}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
