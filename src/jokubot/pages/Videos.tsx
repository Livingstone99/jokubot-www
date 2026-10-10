// Génération de vidéos : photos (ajoutées ou créées depuis une idée) + textes → courte vidéo.

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { generateImage, ImageError } from "../images.js";
import { t } from "../prefs.js";
import { Icon, PageHeader, Spinner } from "../ui.js";
import { draw, duration, loadImage, pickMime, record, THEMES, V_FORMATS, type Scene, type Theme, type VFormat } from "../videos.js";

const MAX_PHOTOS = 6;
const WAIT_SECONDS = 60;
const PERS = [2, 3, 4];

type Photo = { id: number; url: string; img: HTMLImageElement };

export function VideosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [idea, setIdea] = useState("");
  const [ideaBusy, setIdeaBusy] = useState(false);
  const [ideaError, setIdeaError] = useState("");
  const [wait, setWait] = useState(0);
  const [title, setTitle] = useState("");
  const [offer, setOffer] = useState("");
  const [cta, setCta] = useState(() => t("Commandez sur WhatsApp"));
  const [phone, setPhone] = useState("");
  const [format, setFormat] = useState<VFormat>("vertical");
  const [theme, setTheme] = useState<Theme>("noir");
  const [per, setPer] = useState(3);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [video, setVideo] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [photoError, setPhotoError] = useState("");

  const canvas = useRef<HTMLCanvasElement>(null);
  const job = useRef<{ cancel: () => void } | null>(null);
  const urls = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const font = useRef("system-ui, sans-serif");
  const canRecord = typeof MediaRecorder !== "undefined" && pickMime() !== "";

  const size = V_FORMATS.find((f) => f.id === format)!;
  const scene: Scene = {
    images: photos.map((p) => p.img),
    title: title.trim(),
    offer: offer.trim(),
    cta: cta.trim(),
    phone: phone.trim(),
    theme,
    per,
    font: font.current,
  };
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  useEffect(() => {
    document.title = `${t("Génération de vidéos")} · JokuBot`;
    font.current = getComputedStyle(document.body).fontFamily || font.current;
  }, []);

  useEffect(
    () => () => {
      job.current?.cancel();
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  // Aperçu en boucle (arrêté pendant l'enregistrement, qui dessine lui-même).
  useEffect(() => {
    if (recording) return;
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const s = sceneRef.current;
      const time = ((performance.now() - start) / 1000) % duration(s);
      draw(ctx, el.width, el.height, time, s);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [recording, format]);

  const keepUrl = (url: string) => {
    urls.current.push(url);
    return url;
  };

  const addFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    setPhotoError("");
    const files = Array.from(event.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    event.target.value = "";
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) setPhotoError(t("{n} photos au plus : les suivantes n'ont pas été ajoutées.", { n: MAX_PHOTOS }));
    const added: Photo[] = [];
    for (const file of files.slice(0, room)) {
      const url = keepUrl(URL.createObjectURL(file));
      try {
        added.push({ id: Date.now() + Math.random(), url, img: await loadImage(url) });
      } catch {
        setPhotoError(t("Une photo n'a pas pu être lue. Essayez une image JPG ou PNG."));
      }
    }
    setPhotos((list) => [...list, ...added]);
    setVideo(null);
  };

  const fromIdea = async () => {
    setIdeaError("");
    if (!idea.trim()) return setIdeaError(t("Décrivez d'abord l'image que vous voulez."));
    if (photos.length >= MAX_PHOTOS) return setIdeaError(t("{n} photos au plus : retirez-en une d'abord.", { n: MAX_PHOTOS }));
    setIdeaBusy(true);
    try {
      const blob = await generateImage(idea.trim(), "produit", format);
      const url = keepUrl(URL.createObjectURL(blob));
      const img = await loadImage(url);
      setPhotos((list) => [...list, { id: Date.now(), url, img }]);
      setVideo(null);
      if (!title.trim()) setTitle(idea.trim());
    } catch (e) {
      if (e instanceof ImageError && e.limited) {
        setWait(WAIT_SECONDS);
        setIdeaError(t("Le service gratuit fait une pause entre deux images."));
      } else setIdeaError(e instanceof ImageError ? t(e.message) : t("L'image n'a pas pu être créée. Réessayez dans un instant."));
    } finally {
      setIdeaBusy(false);
    }
  };

  const move = (index: number, delta: number) =>
    setPhotos((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });

  const create = async () => {
    const el = canvas.current;
    if (!el || !photos.length) return;
    setVideo(null);
    setRecording(true);
    setProgress(0);
    const current = record(el, sceneRef.current, setProgress);
    job.current = current;
    try {
      const blob = await current.done;
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      setVideo({ url: keepUrl(URL.createObjectURL(blob)), blob, ext });
    } catch {
      // Création annulée.
    } finally {
      job.current = null;
      setRecording(false);
    }
  };

  const share = async () => {
    if (!video) return;
    const file = new File([video.blob], `video-jokubot.${video.ext}`, { type: video.blob.type });
    const data = { files: [file], text: title };
    if (!navigator.canShare?.(data)) return;
    try {
      await navigator.share(data);
    } catch {
      // Partage annulé.
    }
  };
  const canShare = Boolean(video && typeof navigator !== "undefined" && navigator.canShare?.({ files: [new File([video.blob], `v.${video.ext}`, { type: video.blob.type })] }));
  const seconds = Math.round(duration(scene));

  return (
    <div className="page">
      <PageHeader
        title={t("Génération de vidéos")}
        subtitle={t("Transformez une idée ou une photo en courte vidéo pour vos réseaux.")}
        back={{ to: "/accueil", label: t("Accueil") }}
      />

      <div className="video-layout">
        <div className="audio-steps">
          {/* 1. Les images */}
          <section className="audio-box" aria-labelledby="v-step-1">
            <h2 id="v-step-1" className="audio-step-title">
              <span className="audio-step-num">1</span>
              {t("Vos images")}
            </h2>

            {photos.length ? (
              <ol className="video-thumbs">
                {photos.map((photo, i) => (
                  <li key={photo.id} className="video-thumb">
                    <img src={photo.url} alt={t("Image {n}", { n: i + 1 })} />
                    <span className="video-thumb-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div className="video-thumb-tools">
                      <button type="button" className="icon-btn" disabled={i === 0 || recording} onClick={() => move(i, -1)} aria-label={t("Avancer l'image {n}", { n: i + 1 })}>
                        <Icon name="back" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={recording}
                        onClick={() => {
                          setPhotos((list) => list.filter((p) => p.id !== photo.id));
                          setVideo(null);
                        }}
                        aria-label={t("Retirer l'image {n}", { n: i + 1 })}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}

            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => void addFiles(event)} />
            <button
              type="button"
              className="btn btn-ghost btn-block"
              disabled={recording || photos.length >= MAX_PHOTOS}
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="image" size={20} />
              {t("Ajouter des photos")}
            </button>
            {photoError ? (
              <p className="field-error" role="alert">
                {photoError}
              </p>
            ) : null}

            <div className="field">
              <label className="field-label" htmlFor="v-idea">
                {t("Ou créez une image à partir d'une idée")}
              </label>
              <div className="video-idea">
                <input
                  id="v-idea"
                  className="input"
                  value={idea}
                  maxLength={300}
                  placeholder={t("Ex. : une bouteille de jus de bissap sur fond jaune")}
                  onChange={(event) => setIdea(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void fromIdea();
                  }}
                />
                <button type="button" className="btn btn-primary" disabled={ideaBusy || wait > 0 || recording} aria-busy={ideaBusy} onClick={() => void fromIdea()}>
                  {ideaBusy ? <Spinner /> : <Icon name="sparkle" size={18} />}
                  {wait > 0 ? t("{s} s", { s: wait }) : t("Créer")}
                </button>
              </div>
              <p className="field-hint">{ideaBusy ? t("JokuBot dessine votre image… 10 à 30 secondes.") : t("Environ une image par minute avec le service gratuit.")}</p>
              {ideaError ? (
                <p className="field-error" role="alert">
                  {ideaError}
                </p>
              ) : null}
            </div>
          </section>

          {/* 2. Les textes */}
          <section className="audio-box" aria-labelledby="v-step-2">
            <h2 id="v-step-2" className="audio-step-title">
              <span className="audio-step-num">2</span>
              {t("Les textes")}
            </h2>
            <div className="field">
              <label className="field-label" htmlFor="v-title">
                {t("Titre")}
              </label>
              <input id="v-title" className="input" value={title} maxLength={60} placeholder={t("Ex. : Nouveau jus de bissap")} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="v-offer">
                {t("Prix ou offre")} <span className="field-optional">{t("(facultatif)")}</span>
              </label>
              <input id="v-offer" className="input" value={offer} maxLength={30} placeholder={t("Ex. : 1 000 F · -20 %")} onChange={(e) => setOffer(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="v-cta">
                {t("Message de fin")}
              </label>
              <input id="v-cta" className="input" value={cta} maxLength={60} onChange={(e) => setCta(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="v-phone">
                {t("Numéro affiché à la fin")} <span className="field-optional">{t("(facultatif)")}</span>
              </label>
              <input id="v-phone" className="input" type="tel" inputMode="tel" value={phone} maxLength={24} placeholder="+225 07 08 45 12 30" onChange={(e) => setPhone(e.target.value)} />
            </div>
          </section>

          {/* 3. Le rendu */}
          <section className="audio-box" aria-labelledby="v-step-3">
            <h2 id="v-step-3" className="audio-step-title">
              <span className="audio-step-num">3</span>
              {t("Format et style")}
            </h2>
            <div className="field" role="radiogroup" aria-labelledby="v-format-label">
              <p id="v-format-label" className="field-label">
                {t("Format")}
              </p>
              <div className="img-formats">
                {V_FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={format === f.id}
                    disabled={recording}
                    className={`img-format${format === f.id ? " is-on" : ""}`}
                    onClick={() => {
                      setFormat(f.id);
                      setVideo(null);
                    }}
                  >
                    <span className="img-format-shape" style={{ aspectRatio: `${f.width} / ${f.height}` }} aria-hidden="true" />
                    <span className="img-format-name">{t(f.name)}</span>
                    <span className="img-format-hint">{t(f.hint)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field" role="radiogroup" aria-labelledby="v-theme-label">
              <p id="v-theme-label" className="field-label">
                {t("Couleurs de fin")}
              </p>
              <div className="audio-langs">
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    role="radio"
                    aria-checked={theme === th.id}
                    disabled={recording}
                    className={`chip video-theme${theme === th.id ? " is-on" : ""}`}
                    onClick={() => setTheme(th.id)}
                  >
                    <span className="video-swatch" style={{ background: th.bg, borderColor: th.accent }} aria-hidden="true" />
                    {t(th.name)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field" role="radiogroup" aria-labelledby="v-per-label">
              <p id="v-per-label" className="field-label">
                {t("Durée par image")}
              </p>
              <div className="audio-langs">
                {PERS.map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={per === p} disabled={recording} className={`chip${per === p ? " is-on" : ""}`} onClick={() => setPer(p)}>
                    {t("{s} secondes", { s: p })}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Aperçu et création */}
        <aside className="video-side" aria-label={t("Aperçu de la vidéo")}>
          <div className="video-stage">
            {video && !recording ? (
              <video className="video-canvas" src={video.url} controls playsInline style={{ aspectRatio: `${size.width} / ${size.height}` }} />
            ) : null}
            <canvas
              ref={canvas}
              key={format}
              width={size.width}
              height={size.height}
              className="video-canvas"
              hidden={Boolean(video && !recording)}
              style={{ aspectRatio: `${size.width} / ${size.height}` }}
              role="img"
              aria-label={t("Aperçu animé de la vidéo")}
            />
          </div>

          {recording ? (
            <div className="video-progress" role="status">
              <div className="video-bar">
                <span style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="field-hint">{t("Création de la vidéo… {p} %. Gardez cette page ouverte.", { p: Math.round(progress * 100) })}</p>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => job.current?.cancel()}>
                {t("Annuler")}
              </button>
            </div>
          ) : video ? (
            <div className="audio-final">
              <a className="btn btn-primary btn-block" href={video.url} download={`video-jokubot.${video.ext}`}>
                <Icon name="download" size={20} />
                {t("Télécharger la vidéo")}
              </a>
              {canShare ? (
                <button type="button" className="btn btn-ghost btn-block" onClick={() => void share()}>
                  <Icon name="external" size={20} />
                  {t("Partager (WhatsApp, TikTok…)")}
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setVideo(null)}>
                {t("Modifier et recréer")}
              </button>
              {video.ext === "webm" ? (
                <p className="field-hint">{t("Ce navigateur enregistre en WebM, que WhatsApp lit mal. Pour un MP4, créez la vidéo dans Chrome récent ou Safari.")}</p>
              ) : null}
            </div>
          ) : (
            <div className="audio-final">
              <button type="button" className="btn btn-primary btn-block" disabled={!photos.length || !canRecord} onClick={() => void create()}>
                <Icon name="video" size={20} />
                {t("Créer la vidéo ({s} s)", { s: seconds })}
              </button>
              <p className="field-hint">
                {!canRecord
                  ? t("Ce navigateur ne sait pas créer de vidéo. Ouvrez la page dans Chrome, Edge ou Safari.")
                  : photos.length
                    ? t("L'aperçu tourne en boucle : c'est exactement la vidéo qui sera créée.")
                    : t("Ajoutez au moins une image pour créer la vidéo.")}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
