// Audio : vous parlez, JokuBot clone votre voix et répète vos mots dans la langue choisie.

import { useEffect, useRef, useState } from "react";

import { createRecognition, DEMO_TEXT, lang, LANGS, speak, TranslateError, voiceReady, voiceTranslate, type LangCode, type VoiceResult } from "../audio.js";
import { t } from "../prefs.js";
import { Icon, PageHeader, Spinner, useToast } from "../ui.js";

const MAX_SECONDS = 120;
/** Temps minimum par étape, pour que l'on voie JokuBot avancer. */
const STEP_MS = 900;

type Phase = "idle" | "recording" | "working" | "done";
type Recording = { url: string; file: File };

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function AudioPage() {
  const [from, setFrom] = useState<LangCode>("fr");
  const [to, setTo] = useState<LangCode>("en");
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [heard, setHeard] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [original, setOriginal] = useState<Recording | null>(null);
  const [result, setResult] = useState<(VoiceResult & { url: string | null; to: LangCode; demo?: boolean }) | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<ReturnType<typeof createRecognition>>(null);
  const timer = useRef<number | undefined>(undefined);
  const live = useRef(false);
  const said = useRef("");
  const canDictate = useRef(createRecognition() !== null).current;
  const toast = useToast();

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

  useEffect(() => () => (original ? URL.revokeObjectURL(original.url) : undefined), [original]);
  useEffect(() => () => (result?.url ? URL.revokeObjectURL(result.url) : undefined), [result]);

  useEffect(() => {
    if (phase === "recording" && seconds >= MAX_SECONDS) stop();
  }, [phase, seconds]);

  const start = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t("Ce navigateur ne sait pas enregistrer. Ouvrez la page dans Chrome, Edge ou Safari."));
      return;
    }
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t("JokuBot n'a pas accès au micro. Autorisez le micro dans les réglages du navigateur, puis réessayez."));
      return;
    }
    stream.current = media;
    said.current = "";
    setHeard("");
    setResult(null);
    setOriginal(null);

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(media);
    rec.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(chunks, { type });
      const recording = { url: URL.createObjectURL(blob), file: new File([blob], `voix-jokubot.${ext}`, { type }) };
      setOriginal(recording);
      void process(recording);
    };
    rec.start();
    recorder.current = rec;

    // Dictée en même temps : vos mots s'affichent pendant que vous parlez.
    const dictation = createRecognition();
    if (dictation) {
      dictation.lang = lang(from).voice;
      dictation.continuous = true;
      dictation.interimResults = true;
      dictation.onresult = (event) => {
        let pending = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i]!;
          if (r.isFinal) said.current = `${said.current} ${r[0]!.transcript.trim()}`.trim();
          else pending += r[0]!.transcript;
        }
        setHeard(`${said.current} ${pending}`.trim());
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
    setSeconds(0);
    setPhase("recording");
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  function stop() {
    live.current = false;
    recognition.current?.stop();
    recognition.current = null;
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    setStep(0);
    setPhase("working");
    // La suite part de rec.onstop, quand l'enregistrement est prêt.
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  /** Montre les étapes, puis le résultat. `make` fait le vrai travail (ou la démo). */
  const run = async (make: () => Promise<VoiceResult>, demo = false) => {
    const advance = window.setInterval(() => setStep((s) => Math.min(s + 1, 2)), STEP_MS);
    try {
      const [made] = await Promise.all([
        make(),
        new Promise((resolve) => window.setTimeout(resolve, STEP_MS * 3)),
      ]);
      setResult({ ...made, url: made.audio ? URL.createObjectURL(made.audio) : null, to, demo });
      setPhase("done");
    } catch (err) {
      setError(err instanceof TranslateError ? t(err.message) : t("JokuBot n'a pas pu créer votre voix. Réessayez dans un instant."));
      setPhase("idle");
    } finally {
      window.clearInterval(advance);
    }
  };

  const process = async (recording: Recording) => {
    // La dictée livre parfois ses derniers mots juste après l'arrêt.
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    await run(() => voiceTranslate(recording.file, said.current, from, to));
  };

  // Démo : le parcours complet avec une phrase d'exemple, sans parler.
  const demo = () => {
    setError("");
    setResult(null);
    setOriginal(null);
    setStep(0);
    setPhase("working");
    void run(async () => ({ text: DEMO_TEXT[from], translation: DEMO_TEXT[to], audio: null }), true);
  };

  const restart = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setResult(null);
    setOriginal(null);
    setHeard("");
    setError("");
    setPhase("idle");
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const target = t(lang(to).name);
  const steps = [t("Clonage de votre voix"), t("Traduction en {langue}", { langue: target }), t("Création de l'audio")];

  const resultFile =
    result?.audio ? new File([result.audio], `voix-jokubot-${result.to}.mp3`, { type: result.audio.type || "audio/mpeg" }) : null;
  const canShareFile = Boolean(resultFile && navigator.canShare?.({ files: [resultFile] }));

  // On envoie l'audio avec la voix clonée, jamais le texte.
  const sendAudio = async () => {
    if (!result) return;
    if (!resultFile || !result.url) {
      toast(
        result.demo
          ? t("Démo : avec le serveur JokuBot, ce bouton envoie votre voix clonée sur WhatsApp.")
          : t("L'envoi de votre voix clonée sera possible dès que le serveur JokuBot sera branché."),
      );
      return;
    }
    // Téléphone : la feuille de partage propose WhatsApp, l'audio part en note vocale.
    if (canShareFile) {
      try {
        await navigator.share({ files: [resultFile] });
      } catch {
        // Partage annulé.
      }
      return;
    }
    // Ordinateur : WhatsApp ne reçoit pas de fichier par lien. On télécharge l'audio et on ouvre WhatsApp Web.
    const link = document.createElement("a");
    link.href = result.url;
    link.download = resultFile.name;
    link.click();
    window.open("https://web.whatsapp.com/", "_blank", "noreferrer");
    toast(t("Audio téléchargé : glissez-le dans la discussion WhatsApp."));
  };

  const busy = phase === "recording" || phase === "working";

  return (
    <div className="page page-narrow">
      <PageHeader
        title={t("Audio")}
        subtitle={t("Parlez dans votre langue : JokuBot répète vos mots dans la langue choisie, avec votre voix.")}
        back={{ to: "/accueil", label: t("Accueil") }}
      />

      <div className="audio-steps">
        <section className="audio-box" aria-label={t("Langues")}>
          <div className="voice-langs">
            <div className="field">
              <label className="field-label" htmlFor="voice-from">
                {t("Vous parlez")}
              </label>
              <div className="select-wrap">
                <select
                  id="voice-from"
                  className="input select"
                  value={from}
                  disabled={busy}
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
            <button
              type="button"
              className="btn btn-ghost voice-swap"
              onClick={swap}
              disabled={busy}
              aria-label={t("Inverser les langues")}
              title={t("Inverser les langues")}
            >
              <Icon name="swap" size={20} />
            </button>
            <div className="field">
              <label className="field-label" htmlFor="voice-to">
                {t("Votre voix en")}
              </label>
              <div className="select-wrap">
                <select
                  id="voice-to"
                  className="input select"
                  value={to}
                  disabled={busy}
                  onChange={(event) => setTo(event.target.value as LangCode)}
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
          </div>

          {/* Le micro */}
          <div className="voice-stage" aria-live="polite">
            {phase === "recording" ? (
              <button type="button" className="audio-rec voice-mic is-on" onClick={stop} aria-label={t("Arrêter l'enregistrement")}>
                <span className="audio-rec-stop" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="audio-rec voice-mic"
                onClick={() => void start()}
                disabled={phase === "working"}
                aria-label={t("Parler")}
              >
                {phase === "working" ? <Spinner /> : <Icon name="mic" size={36} />}
              </button>
            )}

            {phase === "recording" ? (
              <>
                <p className="audio-rec-state">
                  <span className="audio-live-dot" aria-hidden="true" />
                  {t("JokuBot vous écoute…")} <span className="audio-clock">{clock(seconds)}</span>
                </p>
                <p className="field-hint">{t("Touchez le carré quand vous avez fini.")}</p>
              </>
            ) : phase === "working" ? (
              <p className="audio-rec-state">{t("JokuBot prépare votre voix en {langue}…", { langue: target })}</p>
            ) : phase === "done" ? (
              <p className="audio-rec-state">{t("Touchez le micro pour un nouveau message")}</p>
            ) : (
              <>
                <p className="audio-rec-state">{t("Touchez le micro et parlez")}</p>
                {canDictate || voiceReady ? null : (
                  <p className="field-hint">{t("Ce navigateur n'écrit pas la voix : ouvrez la page dans Chrome ou Edge.")}</p>
                )}
                <button type="button" className="link-btn" onClick={demo}>
                  {t("Voir une démo")}
                </button>
              </>
            )}

            {phase === "recording" && heard ? <p className="voice-heard">« {heard} »</p> : null}
          </div>

          {phase === "working" ? (
            <ol className="voice-progress">
              {steps.map((label, i) => {
                const state = i < step ? "is-done" : i === step ? "is-now" : "";
                return (
                  <li key={label} className={`voice-progress-step ${state}`}>
                    <span className="voice-progress-dot" aria-hidden="true">
                      {i < step ? <Icon name="check" size={14} /> : null}
                    </span>
                    {label}
                  </li>
                );
              })}
            </ol>
          ) : null}

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        {/* Le résultat */}
        {phase === "done" && result ? (
          <section className="audio-box" aria-labelledby="voice-result">
            <h2 id="voice-result" className="audio-step-title">
              {t("Votre voix en {langue}", { langue: t(lang(result.to).name) })}
              {result.demo ? <span className="voice-demo-badge">{t("Démo")}</span> : null}
            </h2>

            {result.url ? (
              <audio className="audio-player" controls autoPlay src={result.url} />
            ) : (
              <div className="voice-preview">
                <button type="button" className="btn btn-primary" onClick={() => speak(result.translation, result.to)}>
                  <Icon name="play" size={18} />
                  {t("Écouter")}
                </button>
                <p className="field-hint">
                  {t("Aperçu avec la voix de l'appareil. Votre voix clonée sera disponible dès que le serveur JokuBot sera branché.")}
                </p>
              </div>
            )}

            <p className="voice-translation">{result.translation}</p>

            <details className="voice-original">
              <summary>{result.demo ? t("Phrase d'exemple") : t("Ce que vous avez dit")}</summary>
              <p>{result.text}</p>
              {original ? <audio className="audio-player" controls src={original.url} /> : null}
            </details>

            <div className="audio-final">
              <button type="button" className="btn btn-primary btn-block" onClick={() => void sendAudio()}>
                <Icon name="send" size={20} />
                {t("Envoyer l'audio sur WhatsApp")}
              </button>
              {result.url && !canShareFile ? (
                <p className="field-hint">{t("Sur ordinateur, l'audio est téléchargé puis WhatsApp Web s'ouvre : glissez le fichier dans la discussion.")}</p>
              ) : null}
              {result.url && resultFile ? (
                <a className="btn btn-ghost btn-block" href={result.url} download={resultFile.name}>
                  <Icon name="download" size={20} />
                  {t("Télécharger l'audio")}
                </a>
              ) : null}
              <button type="button" className="btn btn-ghost btn-block" onClick={restart}>
                <Icon name="refresh" size={20} />
                {t("Recommencer")}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
