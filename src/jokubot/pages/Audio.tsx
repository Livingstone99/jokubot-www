// Audio : enregistrer un message, le traduire, l'envoyer sur WhatsApp.

import { useEffect, useRef, useState } from "react";

import { createRecognition, lang, LANGS, MAX_CHARS, speak, translate, TranslateError, type LangCode } from "../audio.js";
import { t } from "../prefs.js";
import { Icon, PageHeader, Spinner } from "../ui.js";

const MAX_SECONDS = 120;

type Result = { code: LangCode; text: string };

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function AudioPage() {
  const [from, setFrom] = useState<LangCode>("fr");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<{ url: string; file: File } | null>(null);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState("");
  const [targets, setTargets] = useState<LangCode[]>(["en"]);
  const [results, setResults] = useState<Result[]>([]);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");
  const [phone, setPhone] = useState("");

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<ReturnType<typeof createRecognition>>(null);
  const timer = useRef<number | undefined>(undefined);
  const live = useRef(false);
  const canDictate = useRef(createRecognition() !== null).current;
  const canShareFiles = typeof navigator !== "undefined" && "canShare" in navigator;

  useEffect(() => {
    document.title = `${t("Audio")} · JokuBot`;
  }, []);

  // En quittant la page : micro coupé, lecture arrêtée.
  useEffect(
    () => () => {
      live.current = false;
      recognition.current?.stop();
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      window.clearInterval(timer.current);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  useEffect(() => () => (audio ? URL.revokeObjectURL(audio.url) : undefined), [audio]);

  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) stop();
  }, [recording, seconds]);

  const start = async () => {
    setMicError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError(t("Ce navigateur ne sait pas enregistrer. Ouvrez la page dans Chrome, Edge ou Safari, ou écrivez votre message ci-dessous."));
      return;
    }
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(t("JokuBot n'a pas accès au micro. Autorisez le micro dans les réglages du navigateur, puis réessayez."));
      return;
    }
    stream.current = media;
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(media);
    rec.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(chunks, { type });
      setAudio({ url: URL.createObjectURL(blob), file: new File([blob], `message-jokubot.${ext}`, { type }) });
    };
    rec.start();
    recorder.current = rec;

    // Dictée en même temps : le texte s'écrit pendant que vous parlez.
    const dictation = createRecognition();
    if (dictation) {
      dictation.lang = lang(from).voice;
      dictation.continuous = true;
      dictation.interimResults = true;
      dictation.onresult = (event) => {
        let final = "";
        let pending = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]!;
          if (result.isFinal) final += result[0]!.transcript;
          else pending += result[0]!.transcript;
        }
        if (final) setText((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${final.trim()}`);
        setInterim(pending);
      };
      // La dictée s'arrête d'elle-même après un silence : on la relance tant qu'on enregistre.
      dictation.onend = () => {
        if (live.current) {
          try {
            dictation.start();
          } catch {
            // Déjà relancée.
          }
        }
      };
      dictation.onerror = () => undefined;
      recognition.current = dictation;
      try {
        dictation.start();
      } catch {
        recognition.current = null;
      }
    }

    live.current = true;
    setResults([]);
    setSeconds(0);
    setRecording(true);
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  function stop() {
    live.current = false;
    recognition.current?.stop();
    recognition.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    window.clearInterval(timer.current);
    setInterim("");
    setRecording(false);
  }

  const restart = () => {
    setAudio(null);
    setText("");
    setResults([]);
    setTranslateError("");
  };

  const toggleTarget = (code: LangCode) =>
    setTargets((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]));

  const chosen = targets.filter((code) => code !== from);
  const message = text.trim();

  const runTranslate = async () => {
    setTranslateError("");
    if (!message) return setTranslateError(t("Enregistrez ou écrivez d'abord votre message."));
    if (!chosen.length) return setTranslateError(t("Choisissez au moins une langue."));
    setTranslating(true);
    try {
      const list = await Promise.all(chosen.map(async (code) => ({ code, text: await translate(message, from, code) })));
      setResults(list);
    } catch (error) {
      setTranslateError(error instanceof TranslateError ? t(error.message) : t("La traduction n'a pas abouti. Réessayez dans un instant."));
    } finally {
      setTranslating(false);
    }
  };

  const allInOne = results.map((r) => `${t(lang(r.code).name)} :\n${r.text}`).join("\n\n");

  const shareAudio = async (caption: string) => {
    if (!audio) return;
    const data = { files: [audio.file], text: caption };
    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
      } catch {
        // Partage annulé.
      }
    }
  };
  const audioShareable = Boolean(audio && canShareFiles && navigator.canShare?.({ files: [audio.file] }));

  return (
    <div className="page page-narrow">
      <PageHeader
        title={t("Audio")}
        subtitle={t("Enregistrez un message, JokuBot le traduit dans plusieurs langues et vous l'envoyez sur WhatsApp.")}
        back={{ to: "/accueil", label: t("Accueil") }}
      />

      <div className="audio-steps">
        {/* 1. Le message */}
        <section className="audio-box" aria-labelledby="audio-step-1">
          <h2 id="audio-step-1" className="audio-step-title">
            <span className="audio-step-num">1</span>
            {t("Votre message")}
          </h2>

          <div className="field">
            <label className="field-label" htmlFor="audio-from">
              {t("Vous parlez en")}
            </label>
            <div className="select-wrap">
              <select
                id="audio-from"
                className="input select"
                value={from}
                disabled={recording}
                onChange={(event) => setFrom(event.target.value as LangCode)}
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {t(l.name)}
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={18} className="select-icon" />
            </div>
          </div>

          <div className="audio-recorder">
            {recording ? (
              <button type="button" className="audio-rec is-on" onClick={stop} aria-label={t("Arrêter l'enregistrement")}>
                <span className="audio-rec-stop" aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="audio-rec" onClick={() => void start()} aria-label={t("Enregistrer un audio")}>
                <Icon name="mic" size={30} />
              </button>
            )}
            <div className="audio-rec-text" aria-live="polite">
              {recording ? (
                <>
                  <p className="audio-rec-state">
                    <span className="audio-live-dot" aria-hidden="true" />
                    {t("Enregistrement…")} <span className="audio-clock">{clock(seconds)}</span>
                  </p>
                  <p className="field-hint">{t("Touchez le carré pour arrêter. 2 minutes au plus.")}</p>
                </>
              ) : audio ? (
                <>
                  <p className="audio-rec-state">{t("Message enregistré")}</p>
                  <button type="button" className="link-btn" onClick={restart}>
                    {t("Recommencer")}
                  </button>
                </>
              ) : (
                <>
                  <p className="audio-rec-state">{t("Touchez le micro et parlez")}</p>
                  <p className="field-hint">{t("Votre voix est enregistrée et écrite en même temps.")}</p>
                </>
              )}
            </div>
          </div>
          {micError ? (
            <p className="field-error" role="alert">
              {micError}
            </p>
          ) : null}

          {audio && !recording ? <audio className="audio-player" controls src={audio.url} /> : null}

          <div className="field">
            <label className="field-label" htmlFor="audio-text">
              {t("Texte du message")}
            </label>
            <textarea
              id="audio-text"
              className="input textarea"
              value={recording && interim ? `${text} ${interim}`.trim() : text}
              readOnly={recording}
              maxLength={MAX_CHARS}
              placeholder={t("Le texte apparaît ici pendant que vous parlez. Vous pouvez aussi l'écrire.")}
              onChange={(event) => setText(event.target.value)}
              aria-describedby="audio-text-hint"
            />
            <p id="audio-text-hint" className="field-hint">
              {canDictate
                ? t("Corrigez le texte si besoin : c'est lui qui est traduit.")
                : t("Ce navigateur n'écrit pas la voix : écrivez votre message ici.")}{" "}
              {t("{n} / {max} caractères.", { n: text.length, max: MAX_CHARS })}
            </p>
          </div>
        </section>

        {/* 2. Les langues */}
        <section className="audio-box" aria-labelledby="audio-step-2">
          <h2 id="audio-step-2" className="audio-step-title">
            <span className="audio-step-num">2</span>
            {t("Traduire en")}
          </h2>
          <div className="audio-langs" role="group" aria-labelledby="audio-step-2">
            {LANGS.filter((l) => l.code !== from).map((l) => {
              const on = targets.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  className={`chip${on ? " is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggleTarget(l.code)}
                >
                  {on ? <Icon name="check" size={16} /> : null}
                  {t(l.name)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={translating || recording}
            aria-busy={translating}
            onClick={() => void runTranslate()}
          >
            {translating ? <Spinner /> : <Icon name="globe" size={20} />}
            {chosen.length > 1 ? t("Traduire en {n} langues", { n: chosen.length }) : t("Traduire")}
          </button>
          {translateError ? (
            <p className="field-error" role="alert">
              {translateError}
            </p>
          ) : null}
        </section>

        {/* 3. L'envoi */}
        {results.length ? (
          <section className="audio-box" aria-labelledby="audio-step-3">
            <h2 id="audio-step-3" className="audio-step-title">
              <span className="audio-step-num">3</span>
              {t("Envoyer sur WhatsApp")}
            </h2>

            <div className="field">
              <label className="field-label" htmlFor="audio-phone">
                {t("Numéro WhatsApp du client")} <span className="field-optional">{t("(facultatif)")}</span>
              </label>
              <input
                id="audio-phone"
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+225 07 08 45 12 30"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                aria-describedby="audio-phone-hint"
              />
              <p id="audio-phone-hint" className="field-hint">
                {t("Avec l'indicatif du pays. Sans numéro, WhatsApp vous laisse choisir le contact.")}
              </p>
            </div>

            <ul className="audio-results">
              {results.map((result) => (
                <li key={result.code} className="audio-result">
                  <div className="audio-result-head">
                    <p className="audio-result-lang">{t(lang(result.code).name)}</p>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => speak(result.text, result.code)}
                    >
                      <Icon name="play" size={16} />
                      {t("Écouter")}
                    </button>
                  </div>
                  <label className="sr-only" htmlFor={`audio-result-${result.code}`}>
                    {t("Traduction en {langue}", { langue: t(lang(result.code).name) })}
                  </label>
                  <textarea
                    id={`audio-result-${result.code}`}
                    className="input textarea audio-result-text"
                    value={result.text}
                    onChange={(event) =>
                      setResults((list) => list.map((r) => (r.code === result.code ? { ...r, text: event.target.value } : r)))
                    }
                  />
                  <div className="audio-result-actions">
                    <a className="btn btn-primary btn-sm" href={whatsappUrl(phone, result.text)} target="_blank" rel="noreferrer">
                      <Icon name="send" size={16} />
                      {t("Envoyer en {langue}", { langue: t(lang(result.code).name) })}
                    </a>
                    {audioShareable ? (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void shareAudio(result.text)}>
                        <Icon name="mic" size={16} />
                        {t("Partager l'audio et ce texte")}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="audio-final">
              {results.length > 1 ? (
                <a className="btn btn-primary btn-block" href={whatsappUrl(phone, allInOne)} target="_blank" rel="noreferrer">
                  <Icon name="send" size={20} />
                  {t("Envoyer toutes les langues en un message")}
                </a>
              ) : null}
              {audio ? (
                <a className="btn btn-ghost btn-block" href={audio.url} download={audio.file.name}>
                  <Icon name="download" size={20} />
                  {t("Télécharger l'audio")}
                </a>
              ) : null}
              <p className="field-hint">
                {audioShareable
                  ? t("Sur téléphone, « Partager l'audio » envoie votre voix avec le texte traduit.")
                  : t("WhatsApp reçoit le texte traduit. Pour joindre votre voix, téléchargez l'audio puis ajoutez-le dans la discussion.")}
              </p>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
