// Espace d'un réseau social (X, Instagram, Facebook, TikTok) : compte,
// nouvelle publication, publications, déconnexion. Données fictives.

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate, useParams } from "react-router-dom";

import * as api from "../api.js";
import { network } from "../catalog.js";
import { connectionOf, useDb, type SocialId, type SocialPost } from "../db.js";
import { amount, dateTime } from "../format.js";
import { t } from "../prefs.js";
import { isSocial, MOCK_FOLLOWERS, RHYTHM_LABEL, SOCIAL_IDS, SOCIAL_RULES, SocialLogo } from "../social.js";
import { AppLink, Empty, Icon, PageHeader, Spinner, StatusPill, useConfirm, useToast } from "../ui.js";
import { Field, hourLabel, str, type FieldDef } from "../wizard/fields.js";
import { useForm } from "../wizard/useForm.js";
import { Section } from "./spaces/shared.js";

type Leaf = Exclude<FieldDef, { kind: "group" }>;

/** Passage d'un réseau à l'autre. */
function NetworkSwitcher({ current }: { current: SocialId }) {
  const db = useDb();
  return (
    <nav className="net-switch" aria-label={t("Réseaux sociaux")}>
      {SOCIAL_IDS.map((id) => {
        const active = id === current;
        const connected = connectionOf(db, id).connected;
        return (
          <AppLink key={id} to={`/reseaux/${id}`} className={`net-switch-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <SocialLogo id={id} size={18} />
            <span className="net-switch-name">{network(id).name}</span>
            <span className={`dot${connected ? " is-on" : ""}`} aria-hidden="true" />
            <span className="sr-only">{connected ? t("Connecté") : t("Non connecté")}</span>
          </AppLink>
        );
      })}
    </nav>
  );
}

function mediaHint(id: SocialId): string {
  const rule = SOCIAL_RULES[id].media;
  if (rule === "required-image") return "Instagram demande une image ou une vidéo.";
  if (rule === "required-video") return "TikTok demande une vidéo.";
  return "Facultatif : une image ou une vidéo.";
}

type Slot = "now" | "today18" | "tomorrow12" | "tomorrow18" | "custom";

/** Date d'un créneau, ou null pour « maintenant » / « autre date ». */
function slotDate(slot: Slot): Date | null {
  const date = new Date();
  if (slot === "today18") date.setHours(18, 0, 0, 0);
  else if (slot === "tomorrow12" || slot === "tomorrow18") {
    date.setDate(date.getDate() + 1);
    date.setHours(slot === "tomorrow12" ? 12 : 18, 0, 0, 0);
  } else return null;
  return date;
}

const SLOTS: { id: Slot; label: string }[] = [
  { id: "now", label: "Maintenant" },
  { id: "today18", label: "Aujourd'hui 18 h" },
  { id: "tomorrow12", label: "Demain 12 h" },
  { id: "tomorrow18", label: "Demain 18 h" },
  { id: "custom", label: "Autre date" },
];

function Composer({ id }: { id: SocialId }) {
  const toast = useToast();
  const rules = SOCIAL_RULES[id];
  const name = network(id).name;
  const fields: Leaf[] = [
    {
      kind: "textarea",
      name: "postText",
      label: "Texte",
      rows: 5,
      required: "Écrivez le texte de la publication.",
      validate: (v) => (str(v).length > rules.maxLength ? t("Le texte est trop long pour ce réseau : {n} caractères au plus.", { n: rules.maxLength }) : null),
    },
    {
      kind: "datetime",
      name: "postWhen",
      label: "Date et heure",
      validate: (v) => (str(v) && new Date(str(v)).getTime() < Date.now() ? "Cette date est passée. Choisissez une date à venir, ou laissez vide." : null),
    },
  ];
  const form = useForm({ postText: "", postWhen: "" });
  const [slot, setSlot] = useState<Slot>("now");
  const [media, setMedia] = useState<SocialPost["media"] | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const length = str(form.values.postText).length;

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setMediaError(null);
    if (!file) return setMedia(null);
    const kind = file.type.startsWith("video/") ? "video" : "image";
    if (rules.media === "required-video" && kind !== "video") {
      setMediaError(t("TikTok accepte seulement les vidéos. Choisissez un fichier vidéo."));
      event.target.value = "";
      return setMedia(null);
    }
    setMedia({ kind, name: file.name });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // « Autre date » : le champ date devient obligatoire.
    const checked = slot === "custom" ? fields.map((f) => (f.name === "postWhen" ? { ...f, optional: false, required: "Choisissez la date de publication." } : f)) : fields.slice(0, 1);
    const valid = form.check(checked);
    const needsMedia = rules.media !== "optional" && !media;
    if (needsMedia) setMediaError(t(mediaHint(id)));
    if (!valid) return;
    if (needsMedia) return fileInput.current?.focus();
    setBusy(true);
    try {
      const when = slot === "custom" ? str(form.values.postWhen) : (slotDate(slot)?.toISOString() ?? "");
      const post = await api.socialPublish({
        network: id,
        text: str(form.values.postText),
        ...(media ? { media } : {}),
        ...(when ? { scheduledFor: when } : {}),
      });
      form.setValues({ postText: "", postWhen: "" });
      setSlot("now");
      setMedia(null);
      if (fileInput.current) fileInput.current.value = "";
      toast(post.status === "programme" ? t("Publication programmée") : t("Publié sur {reseau}", { reseau: name }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card-form" onSubmit={submit} noValidate>
      {fields.slice(0, 1).map((field) => (
        <div key={field.name} className="composer-text">
          <Field {...form.bind(field)} />
          <p className={`char-count${length > rules.maxLength ? " is-over" : ""}`} aria-live="polite">
            {amount(length)} / {amount(rules.maxLength)}
          </p>
        </div>
      ))}
      <div className={`field${mediaError ? " has-error" : ""}`}>
        <label className="field-label" htmlFor={`media-${id}`}>
          {t("Image ou vidéo")}
          {rules.media === "optional" ? <span className="field-optional"> {t("(facultatif)")}</span> : null}
        </label>
        <input
          ref={fileInput}
          id={`media-${id}`}
          className="file-input"
          type="file"
          accept={rules.accept}
          onChange={onFile}
          aria-describedby={`media-${id}-hint`}
          aria-invalid={mediaError ? true : undefined}
        />
        <p id={`media-${id}-hint`} className={mediaError ? "field-error" : "field-hint"}>
          {mediaError ?? t(mediaHint(id))}
        </p>
      </div>
      <fieldset className="field">
        <legend className="field-label">{t("Quand publier ?")}</legend>
        <div className="slots" role="group" aria-label={t("Créneaux de publication")}>
          {SLOTS.map((option) => {
            const date = slotDate(option.id);
            const past = date !== null && date.getTime() <= Date.now();
            return (
              <button
                key={option.id}
                type="button"
                className={`slot${slot === option.id ? " is-active" : ""}`}
                aria-pressed={slot === option.id}
                disabled={past}
                onClick={() => setSlot(option.id)}
              >
                {t(option.label)}
              </button>
            );
          })}
        </div>
      </fieldset>
      {slot === "custom"
        ? fields.slice(1).map((field) => <Field key={field.name} {...form.bind({ ...field, optional: false })} />)
        : null}
      <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy}>
        {busy ? <Spinner /> : null}
        {slot === "now" ? t("Publier sur {reseau}", { reseau: name }) : t("Programmer la publication")}
      </button>
    </form>
  );
}

function PostList({ id }: { id: SocialId }) {
  const db = useDb();
  const confirm = useConfirm();
  const toast = useToast();
  const posts = db.socialPosts.filter((p) => p.network === id);
  if (posts.length === 0) {
    return <Empty title="Aucune publication pour l'instant">Vos publications sur ce réseau apparaîtront ici.</Empty>;
  }
  return (
    <ul className="posts">
      {posts.map((post) => (
        <li key={post.id} className="post">
          <span className="post-media" aria-hidden="true">
            <Icon name={post.media?.kind === "video" ? "play" : post.media ? "image" : "text"} size={22} />
          </span>
          <div className="post-body">
            <p className="post-text">{post.text}</p>
            <p className="post-meta">
              {post.scheduledFor ? t("Prévu : {date}", { date: dateTime(post.scheduledFor) }) : dateTime(post.at)}
              {post.status === "publie" ? ` · ${t("{n} j'aime", { n: amount(post.likes) })} · ${t("{n} commentaires", { n: amount(post.comments) })}` : ""}
            </p>
          </div>
          <div className="post-side">
            <StatusPill tone={post.status === "publie" ? "solid" : "outline"}>{post.status === "publie" ? t("Publié") : t("Programmé")}</StatusPill>
            <button
              type="button"
              className="icon-btn"
              aria-label={t("Supprimer la publication")}
              onClick={async () => {
                const ok = await confirm({
                  title: t("Supprimer cette publication ?"),
                  text: t("Elle disparaîtra aussi de votre compte {reseau}.", { reseau: network(id).name }),
                  confirm: t("Supprimer la publication"),
                  danger: true,
                });
                if (!ok) return;
                await api.removeSocialPost(post.id);
                toast(t("Publication supprimée"));
              }}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NetworkPage() {
  const { id = "" } = useParams();
  const db = useDb();
  const confirm = useConfirm();
  const toast = useToast();
  const known = isSocial(id);

  useEffect(() => {
    if (known) document.title = `${network(id).name} · JokuBot`;
  }, [id, known]);

  if (!known) return <Navigate to="/" replace />;
  const info = network(id);
  const connection = connectionOf(db, id);
  const postCount = db.socialPosts.filter((p) => p.network === id).length;
  const prefs = db.socialPrefs[id];

  return (
    <div className="page">
      <PageHeader
        back={{ to: "/", label: t("Connexions") }}
        title={
          <span className="net-title">
            <span className="social-logo is-large" aria-hidden="true">
              <SocialLogo id={id} size={28} />
            </span>
            {info.name}
          </span>
        }
        subtitle={connection.connected ? t("Compte connecté : {compte}", { compte: connection.account ?? "" }) : t("Ce réseau n'est pas encore connecté.")}
      />
      <NetworkSwitcher current={id} />

      {!connection.connected ? (
        <div className="net-empty">
          <span className="social-logo is-xl" aria-hidden="true">
            <SocialLogo id={id} size={40} />
          </span>
          <h2 className="net-empty-title">{t("{reseau} n'est pas connecté", { reseau: info.name })}</h2>
          <p className="net-empty-text">{t("Connectez votre compte pour publier et suivre vos publications depuis JokuBot.")}</p>
          <AppLink to={`/connecter/${id}`} className="btn btn-primary">
            {t("Connecter {reseau}", { reseau: info.cta })}
          </AppLink>
        </div>
      ) : (
        <div className="space">
          <Section title="Compte connecté" id="s-compte">
            <div className="account-card">
              <span className="social-logo is-large" aria-hidden="true">
                <SocialLogo id={id} size={28} />
              </span>
              <div className="account-main">
                <p className="account-name">{connection.account}</p>
                <p className="account-meta">{connection.since ? t("Connecté : {date}", { date: dateTime(connection.since) }) : t("Connecté")}</p>
                {prefs ? (
                  <p className="account-meta">
                    {prefs.rhythm === "manuel"
                      ? t("Publication : seulement quand vous le demandez")
                      : t("Publication : {rythme}, à {heure}", { rythme: t(RHYTHM_LABEL[prefs.rhythm]).toLowerCase(), heure: hourLabel(prefs.time) })}
                  </p>
                ) : null}
              </div>
              <dl className="account-stats">
                <div>
                  <dt>{t("Abonnés")}</dt>
                  <dd>{amount(MOCK_FOLLOWERS[id])}</dd>
                </div>
                <div>
                  <dt>{t("Publications")}</dt>
                  <dd>{amount(postCount)}</dd>
                </div>
              </dl>
            </div>
          </Section>

          <div className="space-cols">
            <Section title="Créer une publication" id="s-creer">
              <Composer key={id} id={id} />
            </Section>
            <Section title="Publications" id="s-publications">
              <PostList id={id} />
            </Section>
          </div>

          <Section title="Déconnecter le compte" id="s-deconnecter">
            <div className="card-form disconnect-card">
              <p className="muted-text">{t("JokuBot ne pourra plus publier sur ce compte. Vos publications restent sur {reseau}.", { reseau: info.name })}</p>
              <button
                type="button"
                className="btn btn-ghost btn-danger-text"
                onClick={async () => {
                  const ok = await confirm({
                    title: t("Déconnecter {reseau} ?", { reseau: info.name }),
                    text: t("JokuBot ne pourra plus publier sur ce compte. Vous pourrez le reconnecter à tout moment."),
                    confirm: t("Déconnecter {reseau}", { reseau: info.name }),
                    danger: true,
                  });
                  if (!ok) return;
                  await api.disconnect(id);
                  toast(t("{reseau} est déconnecté", { reseau: info.name }));
                }}
              >
                {t("Déconnecter le compte")}
              </button>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
