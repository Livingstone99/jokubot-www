// Audio : un texte, lu par une voix JokuBot ou enregistré avec la voix du commerçant.

import { useEffect, useRef, useState } from "react";

import { t } from "../prefs.js";
import { Icon, PageHeader } from "../ui.js";

const MAX_SECONDS = 120;
const MAX_CHARS = 1000;

type VoiceLang = "fr" | "en" | "es" | "pt" | "ar" | "de" | "it" | "nl";
type Mode = "catalog" | "mine";
type Result = { url: string | null; name: string; script: string; kind: Mode; voice: string };

const VOICES: { id: string; name: string; lang: VoiceLang; label: string; voice: string; sample: string }[] = [
  { id: "fr", name: "Henri", lang: "fr", label: "Français", voice: "fr-FR", sample: "Bonjour. Voici un court extrait de cette voix." },
  { id: "en", name: "Andrew", lang: "en", label: "Anglais", voice: "en-US", sample: "Hello. This is a short sample of this voice." },
  { id: "es", name: "Álvaro", lang: "es", label: "Espagnol", voice: "es-ES", sample: "Hola. Esta es una muestra breve de esta voz." },
  { id: "pt", name: "Antônio", lang: "pt", label: "Portugais", voice: "pt-BR", sample: "Olá. Esta é uma amostra curta desta voz." },
  { id: "ar", name: "Hamed", lang: "ar", label: "Arabe", voice: "ar-SA", sample: "مرحبا. هذه عينة قصيرة من هذا الصوت." },
  { id: "de", name: "Conrad", lang: "de", label: "Allemand", voice: "de-DE", sample: "Hallo. Dies ist eine kurze Probe dieser Stimme." },
  { id: "it", name: "Diego", lang: "it", label: "Italien", voice: "it-IT", sample: "Ciao. Questo è un breve esempio di questa voce." },
  { id: "nl", name: "Maarten", lang: "nl", label: "Néerlandais", voice: "nl-NL", sample: "Hallo. Dit is een kort voorbeeld van deze stem." },
];

/** Aperçu local : la voix du catalogue est lue par l'appareil, dans la langue choisie. */
function preview(text: string, voice: string) {
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

function clock(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function fileExt(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
}

export function AudioPage() {
  const [script, setScript] = useState("");
  const [mode, setMode] = useState<Mode>("catalog");
  const [voiceId, setVoiceId] = useState(VOICES[0]!.id);
  const [phase, setPhase] = useState<"idle" | "recording">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const scriptRef = useRef(script);
  scriptRef.current = script;
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.title = `${t("Audio")} · JokuBot`;
  }, []);

  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      window.clearInterval(timer.current);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  useEffect(() => () => (result?.url ? URL.revokeObjectURL(result.url) : undefined), [result]);

  useEffect(() => {
    if (phase === "recording" && seconds >= MAX_SECONDS) stop();
  }, [phase, seconds]);

  const selected = VOICES.find((voice) => voice.id === voiceId) ?? VOICES[0]!;
  const busy = phase === "recording";
  const scriptChanged = Boolean(result?.kind === "mine" && result.script !== script.trim());

  function stop() {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  const start = async () => {
    const spoken = scriptRef.current.trim();
    if (!spoken) {
      setError(t("Écrivez d'abord le texte."));
      return;
    }
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t("Ce navigateur ne sait pas enregistrer. Ouvrez la page dans Chrome, Edge ou Safari."));
      return;
    }
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t("Autorisez le micro dans les réglages du navigateur, puis réessayez."));
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
      const blob = new Blob(chunks, { type });
      if (!blob.size) {
        setPhase("idle");
        return;
      }
      setResult({
        url: URL.createObjectURL(blob),
        name: `jokubot-voix.${fileExt(type)}`,
        script: scriptRef.current.trim(),
        kind: "mine",
        voice: voiceId,
      });
      setPhase("idle");
    };
    rec.start();
    recorder.current = rec;
    setSeconds(0);
    setPhase("recording");
    timer.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
  };

  const generate = () => {
    const spoken = script.trim();
    if (!spoken) {
      setError(t("Écrivez d'abord le texte."));
      return;
    }
    setError("");
    if (!preview(spoken, selected.voice)) {
      setError(t("Ce navigateur ne lit pas le texte à voix haute."));
      return;
    }
    setResult({ url: null, name: "", script: spoken, kind: "catalog", voice: selected.voice });
  };

  const hear = (voice: (typeof VOICES)[number]) => {
    setError("");
    if (!preview(voice.sample, voice.voice)) {
      setError(t("Ce navigateur ne lit pas le texte à voix haute."));
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader
        title={t("Audio")}
        subtitle={t("Écrivez le texte. Une voix JokuBot le lit, ou vous l'enregistrez avec votre voix.")}
        back={{ to: "/accueil", label: t("Accueil") }}
      />

      <div className="audio-steps">
        <section className="audio-box" aria-labelledby="audio-voice">
          <div className="field">
            <label className="field-label" htmlFor="audio-script">
              {t("Texte")}
            </label>
            <textarea
              id="audio-script"
              className="input textarea"
              rows={4}
              maxLength={MAX_CHARS}
              value={script}
              disabled={busy}
              placeholder={t("Écrivez ce que l'audio doit dire")}
              onChange={(event) => setScript(event.target.value)}
            />
            <p className="field-hint">{error ? null : t("1 000 caractères au plus.")}</p>
          </div>

          <fieldset className="audio-modes">
            <legend id="audio-voice" className="field-label">
              {t("Voix")}
            </legend>
            <div className="choice-grid cols-2">
              {(
                [
                  ["catalog", "Voix JokuBot"],
                  ["mine", "Ma voix"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className={mode === value ? "choice-card is-checked" : "choice-card"}>
                  <input
                    type="radio"
                    name="audio-voice-mode"
                    checked={mode === value}
                    disabled={busy}
                    onChange={() => setMode(value)}
                  />
                  <span className="choice-label">{t(label)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {mode === "catalog" ? (
            <ul className="audio-voices">
              {VOICES.map((voice) => {
                const on = voice.id === selected.id;
                return (
                  <li key={voice.id} className={on ? "audio-voice-row is-on" : "audio-voice-row"}>
                    <button type="button" className="audio-voice-pick" aria-pressed={on} disabled={busy} onClick={() => setVoiceId(voice.id)}>
                      <strong>{voice.name}</strong>
                      <span>{t(voice.label)}</span>
                    </button>
                    <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => hear(voice)}>
                      {t("Écouter")}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="field-hint">{t("Lisez le texte à voix haute. L'enregistrement est l'audio.")}</p>
          )}

          {phase === "recording" ? (
            <p className="audio-rec-state" aria-live="polite">
              <span className="audio-live-dot" aria-hidden="true" />
              {t("Enregistrement {time}", { time: clock(seconds) })}
            </p>
          ) : null}

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}

          {mode === "mine" ? (
            phase === "recording" ? (
              <button type="button" className="btn btn-primary" onClick={stop}>
                {t("Arrêter")}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => void start()}>
                <Icon name="mic" size={18} />
                {result?.kind === "mine" ? t("Enregistrer à nouveau") : t("Enregistrer ma voix")}
              </button>
            )
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={generate}>
              {t("Générer l'audio")}
            </button>
          )}
        </section>

        {result && result.kind === mode && (result.kind === "mine" || result.script === script.trim()) ? (
          <section className="audio-box" aria-labelledby="audio-result">
            <h2 id="audio-result" className="audio-step-title">
              {t("Audio")}
            </h2>
            {result.url ? <audio className="audio-player" controls src={result.url} /> : null}
            {result.kind === "catalog" ? (
              <p className="field-hint">{t("Aperçu avec la voix de l'appareil, dans la langue de la voix choisie.")}</p>
            ) : null}
            {scriptChanged ? (
              <p className="field-hint">{t("Le texte a changé après cet enregistrement. Enregistrez à nouveau pour qu'il corresponde.")}</p>
            ) : null}
            {result.url ? (
              <a className="btn btn-ghost" href={result.url} download={result.name}>
                <Icon name="download" size={18} />
                {t("Télécharger")}
              </a>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => preview(result.script, result.voice)}>
                <Icon name="play" size={18} />
                {t("Écouter")}
              </button>
            )}
          </section>
        ) : null}

        <section className="audio-box" aria-labelledby="audio-transcribe">
          <h2 id="audio-transcribe" className="audio-step-title">
            {t("Transcrire un message vocal")}
          </h2>
          <p className="field-hint">
            {t("Ouvrez JokuBot sur WhatsApp et envoyez un message vocal. Il est accepté s'il vient du numéro de ce compte, ou si le message contient le code et le tag.")}
          </p>
          <h3 className="audio-step-title">{t("Comment l'envoyer")}</h3>
          <ol className="audio-how">
            <li>{t("Ouvrez le lien ou scannez le code. Le message contient déjà le code et le tag.")}</li>
            <li>{t("Depuis le numéro du compte, vous pouvez envoyer seulement le message vocal.")}</li>
            <li>{t("Depuis un autre numéro, envoyez d'abord le message écrit, puis le message vocal.")}</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
