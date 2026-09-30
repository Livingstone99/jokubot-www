import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  api,
  type SetupAct,
  type SetupDraft,
  type SetupPending,
  type SetupSession,
} from "./api.js";
import { useAuth } from "./auth.js";
import { JokubotMark } from "./brand/Logo.js";
import { ChannelConnectCard } from "./ChannelConnect.js";
import { useT } from "./locale.js";
import { channelLabel, hasChannelSetup } from "./ui.js";

type AssistProps = {
  seed?: string;
  variant?: "page" | "compact";
  focus?: { triggerId?: string; reactionId?: string };
  onClose?: () => void;
  onApplied?: () => void;
};

type Translate = ReturnType<typeof useT>;

/** Compact entry on Overview. The thread lives on `/setup`. */
export function AgentAssistLaunch() {
  const t = useT();
  const { me } = useAuth();
  const ready = hasChannelSetup(me?.tenant);

  return (
    <article className="panel assist assist-launch-card">
      <div className="assist-launch">
        <span className="mark assist-avatar" aria-hidden="true">
          <JokubotMark size={40} />
        </span>
        <span className="assist-launch-copy">
          <strong>{t("assist.title")}</strong>
          <span className="hint">{ready ? t("assist.launchHint") : t("assist.launchBlocked")}</span>
        </span>
        <Link className="primary compact" to="/setup">
          {t("assist.open")}
        </Link>
      </div>
    </article>
  );
}

export function AgentAssist({ seed, variant = "page", focus, onClose, onApplied }: AssistProps) {
  const t = useT();
  const seedRef = useRef((seed ?? "").trim());
  const [session, setSession] = useState<SetupSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sender, setSender] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testText, setTestText] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const compact = variant === "compact";
  const focusKey = `${focus?.triggerId ?? ""}:${focus?.reactionId ?? ""}`;

  useEffect(() => {
    const focused = Boolean(focus?.triggerId || focus?.reactionId);
    void (focused
      ? api.setupAct({
          action: "focus",
          ...(focus?.triggerId ? { triggerId: focus.triggerId } : {}),
          ...(focus?.reactionId ? { reactionId: focus.reactionId } : {}),
        })
      : api.setupSession()
    )
      .then((next) => {
        setSession(next);
        syncFields(next);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("assist.loadError"));
      });
  }, [t, focusKey]);

  useEffect(() => {
    const value = seedRef.current;
    if (!value || !session || busy || compact) {
      return;
    }
    seedRef.current = "";
    void run(() => api.setupMessage(value));
  }, [session, busy]);

  useEffect(() => {
    const node = logRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [session?.messages.length, session?.pending?.type]);

  function syncFields(next: SetupSession) {
    setContext(next.draft?.context ?? "");
    setKeyword(next.draft?.matchValue ?? "");
    setSender("");
    setTestText(
      next.pending?.type === "test_result" ? next.pending.testText : next.draft?.testText ?? "",
    );
    setApiKey("");
  }

  async function run(task: () => Promise<SetupSession>) {
    setBusy(true);
    setError(null);
    try {
      const next = await task();
      setSession(next);
      syncFields(next);
      const finished = Boolean(next.draft) && next.pending?.type === "test_result";
      const cleared = !next.draft && !next.pending;
      if (onApplied && (finished || cleared)) {
        onApplied();
      }
      if (compact && onClose && cleared) {
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("assist.sendError"));
    } finally {
      setBusy(false);
    }
  }

  function send(value: string) {
    const body = value.trim();
    if (!body || busy) {
      return;
    }
    setText("");
    void run(() => api.setupMessage(body));
  }

  function onSend(event: FormEvent) {
    event.preventDefault();
    send(text);
  }

  const pending = session?.pending ?? null;
  const draft = session?.draft ?? null;
  const messages = session?.messages ?? [];
  const needsChannel =
    Boolean(session) && !session?.workspace.whatsapp && !session?.workspace.telegram;
  const canUndo = Boolean(session?.changeset) && session?.changeset?.status !== "reverted";
  const confirming = pending?.type === "test_result";
  const idle = Boolean(session) && messages.length === 0 && !confirming;

  return (
    <>
      {error ? (
        <p className="banner banner-danger" role="alert">
          {error}
        </p>
      ) : null}

      {needsChannel && !compact ? (
        <div className="banner banner-warn">
          <div>
            <strong>{t("assist.blockedTitle")}</strong>
            <p>{t("assist.blockedBody")}</p>
          </div>
          <Link className="secondary compact" to="/settings">
            {t("assist.blockedLink")}
          </Link>
        </div>
      ) : null}

      <article className={compact ? "assist assist-desk is-compact" : "panel assist assist-desk"}>
        <div className={confirming ? "assist-thread is-quiet" : "assist-thread"}>
          <header className="assist-head">
            <span className="mark assist-avatar" aria-hidden="true">
              <JokubotMark size={36} />
            </span>
            <span className="visually-hidden">{t("assist.pageTitle")}</span>
            {compact && onClose ? (
              <button type="button" className="ghost" onClick={onClose}>
                {t("assist.rowClose")}
              </button>
            ) : messages.length > 0 ? (
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => void run(() => api.setupReset())}
              >
                {t("assist.startOver")}
              </button>
            ) : null}
          </header>

          {confirming && !busy ? null : (
          <div className="assist-log" ref={logRef}>
            {session === null ? (
              <p className="muted">{t("common.loading")}</p>
            ) : idle ? (
              <div className="assist-intro">
                <p>{t("assist.introJob")}</p>
              </div>
            ) : (
              <>
                {messages.map((row) => (
                  <div
                    key={row.id}
                    className={row.role === "user" ? "assist-msg is-user" : "assist-msg is-assistant"}
                  >
                    <p>{row.body}</p>
                  </div>
                ))}
                {busy ? (
                  <div className="assist-msg is-assistant is-working">
                    <p>{t("assist.sending")}</p>
                  </div>
                ) : null}
              </>
            )}
          </div>
          )}

          {compact && session ? (
            <div className="assist-card-pane is-inline">
              <ReplyCard
                pending={pending}
                draft={draft}
                busy={busy}
                canUndo={canUndo}
                needsChannel={needsChannel}
                context={context}
                keyword={keyword}
                sender={sender}
                apiKey={apiKey}
                testText={testText}
                onContext={setContext}
                onKeyword={setKeyword}
                onSender={setSender}
                onApiKey={setApiKey}
                onTestText={setTestText}
                onAct={(body: SetupAct) => void run(() => api.setupAct(body))}
              />
            </div>
          ) : null}

          {idle ? (
            <div className="assist-chips">
              <button
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => send(t("assist.askHours"))}
              >
                {t("assist.askHours")}
              </button>
              <button
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => send(t("assist.askPrice"))}
              >
                {t("assist.askPrice")}
              </button>
              <button
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => send(t("assist.askEvery"))}
              >
                {t("assist.askEvery")}
              </button>
            </div>
          ) : null}

          {confirming ? null : (
          <form className="assist-composer" onSubmit={onSend}>
            <label>
              <span className="visually-hidden">{t("assist.placeholder")}</span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t("assist.placeholder")}
                rows={2}
                disabled={busy}
              />
            </label>
            <button className="primary" type="submit" disabled={busy || !text.trim()}>
              {busy ? t("assist.sending") : t("assist.send")}
            </button>
          </form>
          )}
        </div>

        {compact ? null : (
          <aside className="assist-card-pane">
            {session === null ? (
              <p className="muted">{t("common.loading")}</p>
            ) : (
              <>
                {needsChannel ? <ChannelConnectCard /> : null}
                <ReplyCard
                  pending={pending}
                  draft={draft}
                  busy={busy}
                  canUndo={canUndo}
                  needsChannel={needsChannel}
                  context={context}
                  keyword={keyword}
                  sender={sender}
                  apiKey={apiKey}
                  testText={testText}
                  onContext={setContext}
                  onKeyword={setKeyword}
                  onSender={setSender}
                  onApiKey={setApiKey}
                  onTestText={setTestText}
                  onAct={(body: SetupAct) => void run(() => api.setupAct(body))}
                />
              </>
            )}
          </aside>
        )}
      </article>
    </>
  );
}

function ReplyCard({
  pending,
  draft,
  busy,
  canUndo,
  needsChannel,
  context,
  keyword,
  sender,
  apiKey,
  testText,
  onContext,
  onKeyword,
  onSender,
  onApiKey,
  onTestText,
  onAct,
}: {
  pending: SetupPending | null;
  draft: SetupDraft | null;
  busy: boolean;
  canUndo: boolean;
  needsChannel: boolean;
  context: string;
  keyword: string;
  sender: string;
  apiKey: string;
  testText: string;
  onContext: (value: string) => void;
  onKeyword: (value: string) => void;
  onSender: (value: string) => void;
  onApiKey: (value: string) => void;
  onTestText: (value: string) => void;
  onAct: (body: SetupAct) => void;
}) {
  const t = useT();

  if (!draft && (needsChannel || pending?.type === "connect_channel")) {
    return null;
  }

  if (pending?.type === "reverted") {
    return (
      <div className="assist-reply-card">
        <p className="hint">{t("assist.reverted")}</p>
      </div>
    );
  }

  if (!draft && pending?.type === "ask_sender") {
    return (
      <div className="assist-reply-card">
        <SenderAsk
          pending={pending}
          sender={sender}
          busy={busy}
          onSender={onSender}
          onAct={onAct}
        />
      </div>
    );
  }

  if (!draft && pending?.type === "ask_rule") {
    return (
      <div className="assist-reply-card">
        <RuleAsk pending={pending} busy={busy} onAct={onAct} />
      </div>
    );
  }

  if (!draft && pending?.type === "hold_sender") {
    return (
      <div className="assist-reply-card">
        <p className="hint">
          {pending.list === "blacklist"
            ? t("assist.holdBlock", { number: pending.entries.join(", ") })
            : t("assist.holdAllow", { number: pending.entries.join(", ") })}
        </p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="assist-reply-card is-empty">
        <strong>{t("assist.cardEmpty")}</strong>
        <p className="hint">{t("assist.cardEmptyHint")}</p>
      </div>
    );
  }

  const when = summarizeWhen(draft, t);
  const who = summarizeWho(draft, t);
  const editingTalk = pending?.type === "approve_context";
  const showTalk = editingTalk;
  const channel = channelLabel(draft.channel);
  const confirming = pending?.type === "test_result";
  const allow = draft.whitelist ?? [];
  const block = draft.blacklist ?? [];

  return (
    <div className="assist-reply-card">
      {confirming ? (
        <div className="assist-done">
          <strong>{t("assist.doneTitle")}</strong>
          <p className="hint">{t("assist.doneHint", { channel })}</p>
        </div>
      ) : null}

      <div className="assist-field">
        <span className="assist-field-label">{t("assist.whenLabel")}</span>
        <p className="assist-when">{when}</p>
      </div>

      {confirming ? null : (
        <div className="assist-field">
          <span className="assist-field-label">{t("assist.whoLabel")}</span>
          <p className="assist-when">{who}</p>
          {allow.length + block.length > 0 ? (
            <div className="number-list-items">
              {allow.map((value) => (
                <span key={`allow-${value}`} className="number-chip">
                  {value}
                </span>
              ))}
              {block.map((value) => (
                <span key={`block-${value}`} className="number-chip is-blocked">
                  {value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {pending?.type === "test_result" ? (
        <>
          <div className="assist-field">
            <span className="assist-field-label">{t("assist.sampleLabel")}</span>
            {pending.text ? (
              <blockquote className="assist-reply">{pending.text}</blockquote>
            ) : (
              <p className="muted">{t("assist.noReply")}</p>
            )}
          </div>
          {pending.usedFallback ? (
            <p className="banner banner-warn">{t("assist.fallbackUsed")}</p>
          ) : null}
          {pending.error ? (
            <p className="banner banner-danger" role="alert">
              {pending.error}
            </p>
          ) : null}
          <label>
            {t("assist.testPlaceholder")}
            <input
              value={testText}
              onChange={(event) => onTestText(event.target.value)}
              disabled={busy}
            />
          </label>
          <div className="assist-card-actions">
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => onAct({ action: "keep" })}
            >
              {t("assist.keep")}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy || !testText.trim()}
              onClick={() => onAct({ action: "simulate", text: testText.trim() })}
            >
              {t("assist.testAgain")}
            </button>
            {canUndo ? (
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => onAct({ action: "revert" })}
              >
                {t("assist.undo")}
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {pending?.type === "ask_keyword" ? (
        <>
          <label>
            {t("assist.askKeyword")}
            <input
              value={keyword}
              onChange={(event) => onKeyword(event.target.value)}
              placeholder={t("assist.keywordPlaceholder")}
              disabled={busy}
            />
          </label>
          <div className="assist-card-actions">
            <button
              type="button"
              className="primary"
              disabled={busy || !keyword.trim()}
              onClick={() => onAct({ action: "set_keyword", keyword: keyword.trim() })}
            >
              {t("assist.saveKeyword")}
            </button>
          </div>
        </>
      ) : null}

      {pending?.type === "ask_sender" ? (
        <SenderAsk
          pending={pending}
          sender={sender}
          busy={busy}
          onSender={onSender}
          onAct={onAct}
        />
      ) : null}

      {pending?.type === "ask_rule" ? (
        <RuleAsk pending={pending} busy={busy} onAct={onAct} />
      ) : null}

      {pending?.type === "ask_channel" ? (
        <>
          <p className="assist-field-label">{t("assist.askChannel")}</p>
          <div className="assist-card-actions">
            {pending.options.map((channel) => (
              <button
                key={channel}
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => onAct({ action: "choose_channel", channel })}
              >
                {channel === "both" ? t("assist.channelBoth") : channelLabel(channel)}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {showTalk && !confirming ? (
        editingTalk ? (
          <>
            <label>
              {t("assist.talkLabel")}
              <textarea
                value={context}
                onChange={(event) => onContext(event.target.value)}
                rows={5}
                disabled={busy}
              />
            </label>
            <p className="hint">{t("assist.approveHint")}</p>
            <div className="assist-card-actions">
              <button
                type="button"
                className="primary"
                disabled={busy || context.trim().length < 8}
                onClick={() => onAct({ action: "approve_context", context })}
              >
                {t("assist.approve")}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => onContext(draft.context)}
              >
                {t("assist.resetContext")}
              </button>
            </div>
          </>
        ) : (
          <div className="assist-field">
            <span className="assist-field-label">{t("assist.talkLabel")}</span>
            <p className="assist-talk">{draft.context}</p>
          </div>
        )
      ) : null}

      {pending?.type === "ask_key" ? (
        <>
          <p className="hint">
            {draft.provider && draft.provider !== "jokubot"
              ? draft.provider
              : t("assist.jokubotDown")}
          </p>
          <label>
            {t("assist.keyPlaceholder")}
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => onApiKey(event.target.value)}
              placeholder={t("assist.keyPlaceholder")}
              disabled={busy}
            />
          </label>
          <div className="assist-card-actions">
            <button
              type="button"
              className="primary"
              disabled={busy || apiKey.trim().length < 8}
              onClick={() =>
                onAct({
                  action: "provide_key",
                  apiKey: apiKey.trim(),
                  provider: pending.provider,
                })
              }
            >
              {t("assist.saveKey")}
            </button>
          </div>
        </>
      ) : null}

    </div>
  );
}

function SenderAsk({
  pending,
  sender,
  busy,
  onSender,
  onAct,
}: {
  pending: Extract<SetupPending, { type: "ask_sender" }>;
  sender: string;
  busy: boolean;
  onSender: (value: string) => void;
  onAct: (body: SetupAct) => void;
}) {
  const t = useT();
  const block = pending.list === "blacklist";
  return (
    <>
      <label>
        {block ? t("assist.askBlock") : t("assist.askAllow")}
        <input
          value={sender}
          onChange={(event) => onSender(event.target.value)}
          placeholder={t("assist.senderPlaceholder")}
          disabled={busy}
        />
      </label>
      <div className="assist-card-actions">
        <button
          type="button"
          className="primary"
          disabled={busy || !sender.trim()}
          onClick={() =>
            onAct({ action: "set_sender", entry: sender.trim(), list: pending.list })
          }
        >
          {block ? t("assist.saveBlock") : t("assist.saveAllow")}
        </button>
      </div>
    </>
  );
}

function RuleAsk({
  pending,
  busy,
  onAct,
}: {
  pending: Extract<SetupPending, { type: "ask_rule" }>;
  busy: boolean;
  onAct: (body: SetupAct) => void;
}) {
  const t = useT();
  return (
    <>
      <p className="assist-field-label">{t("assist.askRule")}</p>
      <div className="assist-card-actions">
        {pending.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => onAct({ action: "choose_rule", triggerId: option.id })}
          >
            {option.name}
          </button>
        ))}
      </div>
    </>
  );
}

function summarizeWhen(draft: SetupDraft, t: Translate): string {
  const channel = channelLabel(draft.channel);
  if (draft.matchType === "keyword" && draft.matchValue) {
    return t("assist.summaryKeyword", { keyword: draft.matchValue, channel });
  }
  return t("assist.summaryAny", { channel });
}

function summarizeWho(draft: SetupDraft, t: Translate): string {
  const allow = draft.whitelist?.length ?? 0;
  const block = draft.blacklist?.length ?? 0;
  const who = allow === 0 ? t("assist.whoAll") : t("assist.whoAllow", { count: allow });
  const blocked =
    block === 0 ? t("assist.whoNoneBlocked") : t("assist.whoBlock", { count: block });
  return `${who}. ${blocked}.`;
}
