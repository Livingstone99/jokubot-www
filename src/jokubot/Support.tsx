// Bouton flottant JokuBot : ouvre une discussion avec le service client JokuBot.
// Réponses de démonstration, gardées le temps de la visite.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { createRecognition } from "./audio.js";
import { useDb } from "./db.js";
import { t } from "./prefs.js";
import { Icon } from "./ui.js";

/** `audio` : note vocale (adresse locale du fichier) et sa durée en secondes. */
type Message = { id: number; from: "me" | "bot"; text: string; audio?: { url: string; seconds: number } };

const VOICE_MAX = 120; // secondes

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const BOT = `${import.meta.env.BASE_URL}jokubot-bot.png`;

const SIZE = 60; // côté du bouton, en px
const EDGE = 16; // marge minimale avec le bord de l'écran
const GAP = 12; // entre le bouton et la fenêtre
const POS_KEY = "jokubot.support.pos";

type Pos = { x: number; y: number };

/** Garde le bouton entièrement visible. */
function clamp(pos: Pos): Pos {
  return {
    x: Math.min(Math.max(pos.x, EDGE), window.innerWidth - SIZE - EDGE),
    y: Math.min(Math.max(pos.y, EDGE), window.innerHeight - SIZE - EDGE),
  };
}

function readPos(): Pos | null {
  try {
    const saved = JSON.parse(localStorage.getItem(POS_KEY) ?? "null") as Pos | null;
    return saved && typeof saved.x === "number" && typeof saved.y === "number" ? clamp(saved) : null;
  } catch {
    return null;
  }
}

function savePos(pos: Pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  } catch {
    // Stockage indisponible : la place vaut pour cette visite seulement.
  }
}

/** La fenêtre s'ouvre du côté où il y a le plus de place autour du bouton. */
function panelStyle(pos: Pos): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(380, vw - EDGE * 2);
  const right = pos.x + SIZE / 2 > vw / 2;
  const left = Math.min(Math.max(right ? pos.x + SIZE - width : pos.x, EDGE), vw - EDGE - width);
  const below = pos.y + SIZE / 2 < vh / 2;
  return below
    ? { left, right: "auto", width, top: pos.y + SIZE + GAP, bottom: "auto", maxHeight: Math.min(600, vh - pos.y - SIZE - GAP - EDGE) }
    : { left, right: "auto", width, bottom: vh - pos.y + GAP, top: "auto", maxHeight: Math.min(600, pos.y - GAP - EDGE) };
}

const QUICK = ["Connecter WhatsApp", "Mon abonnement", "Parler à un conseiller"];

/** Réponse de démonstration selon les mots du message. */
function reply(text: string): string {
  const s = text.toLowerCase();
  if (/whatsapp|telegram|connect/.test(s))
    return t("Pour relier une messagerie, ouvrez Connexions puis touchez « Connecter » sur la carte voulue. Le code de liaison arrive en quelques secondes.");
  if (/abonnement|prix|payer|paiement|tarif/.test(s))
    return t("Votre abonnement se gère depuis Compte. Vous pouvez payer par Mobile Money ou par carte.");
  if (/conseiller|humain|appel|personne/.test(s))
    return t("Un conseiller JokuBot vous répond sur WhatsApp sous 24 h, du lundi au samedi.");
  return t("Merci, c'est noté. Un conseiller JokuBot reprend votre demande et vous répond ici très vite.");
}

export function SupportChat() {
  const db = useDb();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  // Place choisie en faisant glisser le bouton (null : coin par défaut).
  const [pos, setPos] = useState<Pos | null>(readPos);
  const drag = useRef<{ dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const [dragging, setDragging] = useState(false);
  // Note vocale en cours (null : pas d'enregistrement).
  const [voice, setVoice] = useState<number | null>(null);
  const [micError, setMicError] = useState("");
  const voiceRef = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    timer: number;
    recognition: ReturnType<typeof createRecognition>;
    transcript: string;
    seconds: number;
    keep: boolean;
  } | null>(null);
  const urls = useRef<string[]>([]);

  // Fenêtre redimensionnée ou téléphone tourné : le bouton reste visible.
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    // Quelques pixels de tolérance : un simple appui reste un clic.
    if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 6) return;
    if (!d.moved) setDragging(true);
    d.moved = true;
    setPos(clamp({ x: event.clientX - d.dx, y: event.clientY - d.dy }));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (d?.moved) {
      justDragged.current = true;
      setPos((p) => {
        if (p) savePos(p);
        return p;
      });
    }
  };

  // Au clavier : les flèches déplacent le bouton.
  const onLauncherKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 64 : 16;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const next = clamp({ x: rect.left + move[0], y: rect.top + move[1] });
    setPos(next);
    savePos(next);
  };

  // Ouverture : le curseur va dans le champ. Fermeture : retour sur le bouton.
  useEffect(() => {
    if (open) input.current?.focus();
    else if (wasOpen.current) launcher.current?.focus();
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing, open]);

  const send = (value: string) => {
    const clean = value.trim();
    if (!clean || typing) return;
    setMessages((m) => [...m, { id: Date.now(), from: "me", text: clean }]);
    setText("");
    setTyping(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, from: "bot", text: reply(clean) }]);
      setTyping(false);
    }, 900);
  };

  const reply2 = (heard: string) => {
    setTyping(true);
    window.setTimeout(() => {
      const answer = heard
        ? reply(heard)
        : t("Bien reçu votre note vocale. Un conseiller JokuBot l'écoute et vous répond ici très vite.");
      setMessages((m) => [...m, { id: Date.now() + 1, from: "bot", text: answer }]);
      setTyping(false);
    }, 900);
  };

  const startVoice = async () => {
    setMicError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError(t("Ce navigateur ne sait pas enregistrer. Écrivez votre question, ou ouvrez la page dans Chrome, Edge ou Safari."));
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(t("JokuBot n'a pas accès au micro. Autorisez le micro dans les réglages du navigateur, puis réessayez."));
      return;
    }
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const state = voiceRef.current;
      voiceRef.current = null;
      stream.getTracks().forEach((track) => track.stop());
      if (!state?.keep || !chunks.length) return;
      const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      urls.current.push(url);
      const heard = state.transcript.trim();
      setMessages((m) => [...m, { id: Date.now(), from: "me", text: heard, audio: { url, seconds: Math.max(1, state.seconds) } }]);
      reply2(heard);
    };

    // Dictée en même temps, si le navigateur sait faire : JokuBot répond selon ce qui est dit.
    const recognition = createRecognition();
    if (recognition) {
      recognition.lang = "fr-FR";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const state = voiceRef.current;
        if (!state) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]!;
          if (result.isFinal) state.transcript += ` ${result[0]!.transcript}`;
        }
      };
      recognition.onerror = () => undefined;
      try {
        recognition.start();
      } catch {
        // Pas de dictée : la note part quand même.
      }
    }

    recorder.start();
    const timer = window.setInterval(() => {
      const state = voiceRef.current;
      if (!state) return;
      state.seconds += 1;
      setVoice(state.seconds);
      if (state.seconds >= VOICE_MAX) stopVoice(true);
    }, 1000);
    voiceRef.current = { recorder, stream, timer, recognition, transcript: "", seconds: 0, keep: false };
    setVoice(0);
  };

  /** keep : envoyer la note ; sinon elle est jetée. */
  function stopVoice(keep: boolean) {
    const state = voiceRef.current;
    if (!state) return;
    state.keep = keep;
    window.clearInterval(state.timer);
    state.recognition?.stop();
    // Laisse à la dictée le temps de rendre ses derniers mots.
    window.setTimeout(() => {
      if (state.recorder.state !== "inactive") state.recorder.stop();
    }, keep && state.recognition ? 400 : 0);
    setVoice(null);
  }

  // Fenêtre fermée pendant un enregistrement : la note est jetée.
  useEffect(() => {
    if (!open) stopVoice(false);
  }, [open]);

  // En quittant l'espace : micro coupé, fichiers libérés.
  useEffect(
    () => () => {
      stopVoice(false);
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const greeting = t("Bonjour {prenom} ! Je suis le service client JokuBot. Comment puis-je vous aider ?", {
    prenom: db.account?.firstName ?? "",
  });

  return (
    <>
      {open ? (
        <section
          className="support"
          style={pos ? panelStyle(pos) : undefined}
          role="dialog"
          aria-label={t("Service client JokuBot")}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <header className="support-head">
            <img src={BOT} alt="" width={36} height={36} className="support-head-bot" />
            <div className="support-head-text">
              <p className="support-title">{t("Service client JokuBot")}</p>
              <p className="support-sub">
                <span className="dot is-on" aria-hidden="true" />
                {t("En ligne")}
              </p>
            </div>
            <button type="button" className="icon-btn" aria-label={t("Fermer")} onClick={() => setOpen(false)}>
              <Icon name="close" size={20} />
            </button>
          </header>

          <div className="thread support-thread" role="log" aria-live="polite">
            {[{ id: 0, from: "bot" as const, text: greeting }, ...messages].map((message) => (
              <div key={message.id} className={`bubble-row ${message.from === "me" ? "is-me" : "is-them"}`}>
                {message.from === "bot" ? <img className="bubble-avatar" src={BOT} alt="" width={28} height={28} /> : null}
                <div className={`bubble ${message.from === "me" ? "bubble-dark" : "bubble-light"}${"audio" in message && message.audio ? " bubble-voice" : ""}`}>
                  <span className="sr-only">{message.from === "me" ? t("Vous : ") : "JokuBot : "}</span>
                  {"audio" in message && message.audio ? (
                    <>
                      <span className="voice-label">
                        <Icon name="mic" size={16} />
                        {t("Note vocale · {duree}", { duree: clock(message.audio.seconds) })}
                      </span>
                      <audio className="voice-player" controls src={message.audio.url} preload="metadata" />
                      {message.text ? <span className="voice-transcript">« {message.text} »</span> : null}
                    </>
                  ) : (
                    message.text
                  )}
                </div>
              </div>
            ))}
            {typing ? (
              <div className="bubble-row is-them">
                <img className="bubble-avatar" src={BOT} alt="" width={28} height={28} />
                <div className="bubble bubble-light typing" aria-label={t("JokuBot écrit")}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
            <div ref={end} />
          </div>

          {messages.length === 0 ? (
            <div className="chips support-chips">
              {QUICK.map((q) => (
                <button key={q} type="button" className="chip" onClick={() => send(t(q))}>
                  {t(q)}
                </button>
              ))}
            </div>
          ) : null}

          {micError ? (
            <p className="field-error support-error" role="alert">
              {micError}
            </p>
          ) : null}

          {voice !== null ? (
            <div className="composer voice-bar" role="group" aria-label={t("Note vocale en cours")}>
              <button type="button" className="icon-btn" onClick={() => stopVoice(false)} aria-label={t("Annuler la note vocale")}>
                <Icon name="trash" size={20} />
              </button>
              <p className="voice-live" aria-live="off">
                <span className="voice-dot" aria-hidden="true" />
                {t("Enregistrement…")} <span className="voice-clock">{clock(voice)}</span>
              </p>
              <button type="button" className="send-btn" onClick={() => stopVoice(true)} aria-label={t("Envoyer la note vocale")}>
                <Icon name="send" size={20} />
              </button>
            </div>
          ) : (
            <form
              className="composer"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                send(text);
              }}
            >
              <label className="sr-only" htmlFor="support-input">
                {t("Votre message au service client")}
              </label>
              <input
                id="support-input"
                ref={input}
                className="composer-input"
                value={text}
                placeholder={t("Écrivez votre question…")}
                onChange={(event) => setText(event.target.value)}
                autoComplete="off"
              />
              {/* Champ vide : le micro, comme sur WhatsApp. Sinon : envoyer. */}
              {text.trim() ? (
                <button type="submit" className="send-btn" disabled={typing} aria-label={t("Envoyer")}>
                  <Icon name="send" size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  className="send-btn"
                  disabled={typing}
                  onClick={() => void startVoice()}
                  aria-label={t("Enregistrer une note vocale")}
                  title={t("Enregistrer une note vocale")}
                >
                  <Icon name="mic" size={20} />
                </button>
              )}
            </form>
          )}
        </section>
      ) : null}

      <button
        ref={launcher}
        type="button"
        className={`support-launcher${open ? " is-open" : ""}${dragging ? " is-dragging" : ""}`}
        style={pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : undefined}
        aria-label={open ? t("Fermer le service client") : t("Contacter le service client JokuBot")}
        aria-expanded={open}
        aria-describedby="support-move-help"
        title={t("Service client JokuBot")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onLauncherKey}
        onClick={() => {
          // Le relâchement après un glisser ne doit pas ouvrir la fenêtre.
          if (justDragged.current) {
            justDragged.current = false;
            return;
          }
          setOpen((o) => !o);
        }}
      >
        {open ? <Icon name="close" size={24} /> : <img src={BOT} alt="" width={40} height={44} draggable={false} />}
      </button>
      <span id="support-move-help" className="sr-only">
        {t("Faites glisser le bouton, ou utilisez les flèches, pour le déplacer.")}
      </span>
    </>
  );
}
