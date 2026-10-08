// Génération d'images : décrire, choisir un style et un format, créer, télécharger.

import { useEffect, useRef, useState } from "react";

import { FORMATS, generateImage, ImageError, STYLES, type Format, type Style } from "../images.js";
import { t } from "../prefs.js";
import { Icon, PageHeader, Spinner } from "../ui.js";

const MAX_CHARS = 400;
const WAIT_SECONDS = 60;

const EXAMPLES = [
  "Une bouteille de jus de bissap sur fond jaune",
  "Un pagne wax plié sur une table en bois",
  "Un plat d'attiéké poisson vu de dessus",
];

type Made = { id: number; url: string; blob: Blob; description: string; style: Style; format: Format };

export function ImagesPage() {
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<Style>("produit");
  const [format, setFormat] = useState<Format>("carre");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const [images, setImages] = useState<Made[]>([]);
  const urls = useRef<string[]>([]);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.title = `${t("Génération d'images")} · JokuBot`;
  }, []);

  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // Compte à rebours quand le service gratuit demande une pause.
  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  const create = async (input: { description: string; style: Style; format: Format }) => {
    setError("");
    if (!input.description.trim()) {
      setError(t("Décrivez d'abord l'image que vous voulez."));
      field.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const blob = await generateImage(input.description.trim(), input.style, input.format);
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      setImages((list) => [{ id: Date.now(), url, blob, ...input, description: input.description.trim() }, ...list]);
    } catch (e) {
      if (e instanceof ImageError && e.limited) {
        setWait(WAIT_SECONDS);
        setError(t("Le service gratuit fait une pause entre deux images."));
      } else {
        setError(e instanceof ImageError ? t(e.message) : t("L'image n'a pas pu être créée. Réessayez dans un instant."));
      }
    } finally {
      setBusy(false);
    }
  };

  const share = async (image: Made) => {
    const file = new File([image.blob], "image-jokubot.jpg", { type: image.blob.type });
    const data = { files: [file], text: image.description };
    if (!navigator.canShare?.(data)) return;
    try {
      await navigator.share(data);
    } catch {
      // Partage annulé.
    }
  };
  const canShare = typeof navigator !== "undefined" && "canShare" in navigator;

  const pending = FORMATS.find((f) => f.id === format)!;
  const blocked = busy || wait > 0;

  return (
    <div className="page page-narrow">
      <PageHeader
        title={t("Génération d'images")}
        subtitle={t("Décrivez une image, JokuBot la crée pour vos produits et vos publications.")}
        back={{ to: "/accueil", label: t("Accueil") }}
      />

      <div className="audio-steps">
        <section className="audio-box" aria-label={t("Votre image")}>
          <div className="field">
            <label className="field-label" htmlFor="img-desc">
              {t("Décrivez l'image")}
            </label>
            <textarea
              id="img-desc"
              ref={field}
              className="input textarea"
              value={description}
              maxLength={MAX_CHARS}
              placeholder={t("Ex. : une bouteille de jus de bissap sur fond jaune, avec des feuilles de menthe")}
              aria-describedby="img-desc-hint"
              aria-invalid={error && !description.trim() ? true : undefined}
              onChange={(event) => {
                setDescription(event.target.value);
                if (error && !wait) setError("");
              }}
            />
            <p id="img-desc-hint" className="field-hint">
              {t("Le produit, les couleurs, le décor. Plus c'est précis, mieux c'est.")}
            </p>
            <div className="audio-langs" aria-label={t("Exemples")}>
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className="chip" onClick={() => setDescription(t(example))}>
                  {t(example)}
                </button>
              ))}
            </div>
          </div>

          <div className="field" role="radiogroup" aria-labelledby="img-style-label">
            <p id="img-style-label" className="field-label">
              {t("Style")}
            </p>
            <div className="audio-langs">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={style === s.id}
                  className={`chip${style === s.id ? " is-on" : ""}`}
                  onClick={() => setStyle(s.id)}
                >
                  {t(s.name)}
                </button>
              ))}
            </div>
          </div>

          <div className="field" role="radiogroup" aria-labelledby="img-format-label">
            <p id="img-format-label" className="field-label">
              {t("Format")}
            </p>
            <div className="img-formats">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={format === f.id}
                  className={`img-format${format === f.id ? " is-on" : ""}`}
                  onClick={() => setFormat(f.id)}
                >
                  <span className="img-format-shape" style={{ aspectRatio: `${f.width} / ${f.height}` }} aria-hidden="true" />
                  <span className="img-format-name">{t(f.name)}</span>
                  <span className="img-format-hint">{t(f.hint)}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={blocked}
            aria-busy={busy}
            onClick={() => void create({ description, style, format })}
          >
            {busy ? <Spinner /> : <Icon name="sparkle" size={20} />}
            {busy ? t("Création en cours…") : wait > 0 ? t("Nouvelle image dans {s} s", { s: wait }) : t("Créer l'image")}
          </button>
          {error ? (
            <p className="field-error" role="alert">
              {error} {wait > 0 ? t("Vous pourrez relancer dans {s} secondes.", { s: wait }) : null}
            </p>
          ) : null}
        </section>

        {busy || images.length ? (
          <section className="img-results" aria-label={t("Vos images")} aria-live="polite">
            {busy ? (
              <div className="img-card">
                <div className="img-skeleton" style={{ aspectRatio: `${pending.width} / ${pending.height}` }}>
                  <Spinner />
                  <p>{t("JokuBot dessine votre image… 10 à 30 secondes.")}</p>
                </div>
              </div>
            ) : null}
            {images.map((image) => {
              const size = FORMATS.find((f) => f.id === image.format)!;
              return (
                <figure key={image.id} className="img-card">
                  <img
                    src={image.url}
                    alt={image.description}
                    width={size.width}
                    height={size.height}
                    className="img-picture"
                  />
                  <figcaption className="img-caption">
                    <p className="img-desc">{image.description}</p>
                    <div className="audio-result-actions">
                      <a className="btn btn-primary btn-sm" href={image.url} download={`image-jokubot-${image.id}.jpg`}>
                        <Icon name="download" size={16} />
                        {t("Télécharger")}
                      </a>
                      {canShare ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void share(image)}>
                          <Icon name="external" size={16} />
                          {t("Partager")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={blocked}
                        onClick={() => void create({ description: image.description, style: image.style, format: image.format })}
                      >
                        <Icon name="sparkle" size={16} />
                        {t("Une autre version")}
                      </button>
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </section>
        ) : null}
      </div>
    </div>
  );
}
