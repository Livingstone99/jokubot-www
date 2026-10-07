import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import * as api from "../api.js";
import { SUGGESTIONS } from "../bot.js";
import { useDb } from "../db.js";
import { t } from "../prefs.js";
import { Icon, PageHeader } from "../ui.js";

export function ConversationsPage() {
  useEffect(() => {
    document.title = `${t("Conversations")} · JokuBot`;
  }, []);

  return (
    <div className="page page-chat">
      <PageHeader title={t("Conversations")} subtitle={t("Parlez à JokuBot de votre activité : il s'en sert pour répondre à vos clients.")} />
      <TeachChat />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Avec JokuBot                                                        */
/* ------------------------------------------------------------------ */

function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);
  return ref;
}

function onEnterSend(event: KeyboardEvent<HTMLTextAreaElement>, send: () => void) {
  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
    event.preventDefault();
    send();
  }
}

function Composer({
  label,
  placeholder,
  onSend,
  disabled,
}: {
  label: string;
  placeholder: string;
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useAutoGrow(text);
  const send = () => {
    const clean = text.trim();
    if (!clean || disabled) return;
    onSend(clean);
    setText("");
  };
  return (
    <form
      className="composer"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        send();
      }}
    >
      <label className="sr-only" htmlFor="composer">
        {label}
      </label>
      <textarea
        id="composer"
        ref={ref}
        className="composer-input"
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => onEnterSend(event, send)}
        aria-describedby="composer-help"
      />
      <span id="composer-help" className="sr-only">
        {t("Entrée pour envoyer, Maj + Entrée pour aller à la ligne.")}
      </span>
      <button type="submit" className="send-btn" disabled={disabled || !text.trim()} aria-label={t("Envoyer")}>
        <Icon name="send" size={20} />
      </button>
    </form>
  );
}

function TeachChat() {
  const db = useDb();
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const firstName = db.account?.firstName ?? "";

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: db.teach.length > 1 ? "smooth" : "auto" });
  }, [db.teach.length, typing]);

  const send = async (text: string) => {
    setTyping(true);
    try {
      await api.teachSend(text);
    } finally {
      setTyping(false);
    }
  };

  // Le message d'accueil n'est pas enregistré : il s'affiche toujours dans la langue choisie.
  const greeting = {
    id: "hello",
    from: "bot" as const,
    at: "",
    text: t("Bonjour {prenom} ! Parlez-moi de votre activité : ce que vous vendez, vos prix, vos horaires, la livraison, les paiements…", { prenom: firstName }),
  };
  const messages = [greeting, ...db.teach];

  return (
    <div className="teach">
      <section className="teach-chat" aria-label={t("Discussion avec JokuBot")}>
        <div className="thread" role="log" aria-live="polite" aria-label={t("Messages")}>
          {messages.map((message) => (
            <div key={message.id} className={`bubble-row ${message.from === "me" ? "is-me" : "is-them"}`}>
              {message.from === "bot" ? (
                <img className="bubble-avatar" src={`${import.meta.env.BASE_URL}jokubot-bot.png`} alt="" width={28} height={28} />
              ) : null}
              <div className={`bubble ${message.from === "me" ? "bubble-dark" : "bubble-light"}`}>
                <span className="sr-only">{message.from === "me" ? t("Vous : ") : "JokuBot : "}</span>
                {message.text}
              </div>
            </div>
          ))}
          {typing ? (
            <div className="bubble-row is-them">
              <img className="bubble-avatar" src={`${import.meta.env.BASE_URL}jokubot-bot.png`} alt="" width={28} height={28} />
              <div className="bubble bubble-light typing" aria-label={t("JokuBot écrit")}>
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          <div ref={end} />
        </div>
        <div className="teach-bottom">
          <div className="chips" aria-label={t("Suggestions")}>
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" className="chip" disabled={typing} onClick={() => void send(t(suggestion))}>
                {t(suggestion)}
              </button>
            ))}
          </div>
          <Composer label={t("Votre message à JokuBot")} placeholder={t("Écrivez à JokuBot…")} onSend={(text) => void send(text)} disabled={typing} />
        </div>
      </section>
    </div>
  );
}
