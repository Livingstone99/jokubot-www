import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, type ConversationMessage, type ConversationSummary, type ConversationThread } from "../api.js";
import { useAuth } from "../auth.js";
import { describeChannel } from "../ChannelLink.js";
import { IconArchive, IconArrowLeft, IconCheck, IconMessage, IconSearch, IconSend, IconSparkles } from "../kit/icons.js";
import { conversationKey, useInbox } from "../kit/inbox.js";
import { Avatar, ChannelIcon, EmptyBlock, ErrorBlock, Skeleton, StatusDot, useToast } from "../kit/ui.js";
import type { MessageKey } from "../i18n.js";
import { useT } from "../locale.js";
import { channelLabel, formatWhen, senderLabel, senderPreview } from "../ui.js";

type Filter = "all" | "unread" | "whatsapp" | "telegram";

const FILTERS: Array<[Filter, MessageKey]> = [
  ["all", "msg.filterAll"],
  ["unread", "msg.filterUnread"],
  ["whatsapp", "common.whatsapp"],
  ["telegram", "common.telegram"],
];

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function nameOf(row: { channel: string; senderRef: string; phoneNumber?: string | null; displayName?: string | null }) {
  return row.displayName || senderLabel(row);
}

export function MessagesPage() {
  const t = useT();
  const params = useParams();
  const channel: "whatsapp" | "telegram" | null =
    params.channel === "telegram" || params.channel === "whatsapp" ? params.channel : null;
  const sender = params.sender ?? null;
  const open = channel && sender ? { channel, sender } : null;

  return (
    <section className={open ? "page messages has-open" : "page messages"}>
      <ConversationList activeKey={open ? `${open.channel}:${open.sender}` : null} />
      {open ? (
        <ConversationView channel={open.channel} sender={open.sender} />
      ) : (
        <div className="conv-placeholder">
          <EmptyBlock icon={<IconMessage size={24} />} title={t("msg.pick")} />
        </div>
      )}
    </section>
  );
}

/* ---------- Liste ---------- */

function ConversationList({ activeKey }: { activeKey: string | null }) {
  const t = useT();
  const inbox = useInbox();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return (inbox.items ?? [])
      .filter((row) => !inbox.isArchived(row))
      .filter((row) => {
        if (filter === "unread") return inbox.isUnread(row);
        if (filter === "whatsapp" || filter === "telegram") return row.channel === filter;
        return true;
      })
      .filter((row) => !q || normalize(`${nameOf(row)} ${senderPreview(row)}`).includes(q))
      .sort((a, b) => b.lastReceivedAt.localeCompare(a.lastReceivedAt));
  }, [inbox, query, filter]);

  return (
    <aside className="conv-list" aria-label={t("msg.listLabel")}>
      <div className="conv-tools">
        <label className="search-field">
          <IconSearch size={18} />
          <span className="sr-only">{t("msg.search")}</span>
          <input
            type="search"
            value={query}
            placeholder={t("msg.search")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="chip-row" role="group" aria-label={t("msg.filters")}>
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "chip is-on" : "chip"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(label)}
              {value === "unread" && inbox.unreadCount > 0 ? ` (${inbox.unreadCount})` : ""}
            </button>
          ))}
        </div>
        {inbox.unreadCount > 0 ? (
          <button type="button" className="text-button" onClick={inbox.markAllRead}>
            {t("msg.markAllRead")}
          </button>
        ) : null}
      </div>

      {inbox.items === null ? (
        <Skeleton lines={5} height={64} />
      ) : inbox.error && inbox.items.length === 0 ? (
        <ErrorBlock message={t("home.messagesError")} onRetry={() => void inbox.refresh()} />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={<IconMessage size={24} />}
          title={inbox.items.length === 0 ? t("home.emptyMessages") : t("msg.noResult")}
          action={
            inbox.items.length === 0 ? (
              <Link className="secondary compact" to="/channels">
                {t("home.qConnect")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="conv-items">
          {rows.map((row) => (
            <ConversationRow key={conversationKey(row)} row={row} active={activeKey === conversationKey(row)} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function ConversationRow({ row, active }: { row: ConversationSummary; active: boolean }) {
  const t = useT();
  const inbox = useInbox();
  const unread = inbox.isUnread(row);
  const name = nameOf(row);
  return (
    <li>
      <Link
        to={`/messages/${row.channel}/${encodeURIComponent(row.senderRef)}`}
        className={["conv-row", active ? "is-active" : "", unread ? "is-unread" : ""].filter(Boolean).join(" ")}
        aria-current={active ? "true" : undefined}
      >
        <Avatar name={name} size={42} />
        <span className="conv-main">
          <span className="conv-top">
            <strong>{name}</strong>
            <time dateTime={row.lastReceivedAt}>{formatWhen(row.lastReceivedAt)}</time>
          </span>
          <span className="conv-bottom">
            <ChannelIcon channel={row.channel} size={13} />
            <span className="conv-preview">{senderPreview(row)}</span>
            {unread ? <span className="kit-badge is-dot" role="img" aria-label={t("home.unread")} /> : null}
          </span>
        </span>
      </Link>
    </li>
  );
}

/* ---------- Conversation ---------- */

function ConversationView({ channel, sender }: { channel: "whatsapp" | "telegram"; sender: string }) {
  const t = useT();
  const { me } = useAuth();
  const inbox = useInbox();
  const toast = useToast();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setThread(null);
    void api
      .conversation(channel, sender)
      .then(setThread)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("msg.loadError")));
  }, [channel, sender, t]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = (inbox.items ?? []).find((row) => row.channel === channel && row.senderRef === sender);

  // Ouvrir une conversation la marque comme lue.
  useEffect(() => {
    if (summary && inbox.isUnread(summary)) inbox.markRead(summary);
  }, [summary, inbox]);

  const channelState = describeChannel(t, channel, me?.tenant);
  const name = thread ? nameOf(thread) : summary ? nameOf(summary) : sender;

  function onArchive() {
    if (!summary) return;
    inbox.archive(summary);
    toast({
      text: t("msg.archived"),
      action: { label: t("msg.undo"), onClick: () => inbox.unarchive(summary) },
    });
    navigate("/messages");
  }

  return (
    <article className="conv-view" aria-label={name}>
      <header className="conv-head">
        <Link className="header-icon conv-back" to="/messages" aria-label={t("msg.back")}>
          <IconArrowLeft />
        </Link>
        <Avatar name={name} size={40} />
        <div className="conv-head-main">
          <strong>{name}</strong>
          <span className="conv-head-meta">
            <ChannelIcon channel={channel} size={13} />
            {channelLabel(channel)}
            <StatusDot
              tone={channelState.status === "connected" ? "ok" : "off"}
              label={channelState.status === "connected" ? t("home.connected") : t("home.notConnected")}
            />
          </span>
        </div>
        <div className="conv-actions">
          {summary && inbox.isUnread(summary) ? (
            <button type="button" className="header-icon" aria-label={t("msg.markRead")} title={t("msg.markRead")} onClick={() => inbox.markRead(summary)}>
              <IconCheck />
            </button>
          ) : null}
          <button type="button" className="header-icon" aria-label={t("msg.archive")} title={t("msg.archive")} onClick={onArchive} disabled={!summary}>
            <IconArchive />
          </button>
          <Link className="secondary compact conv-assist" to="/automations/assistant">
            <IconSparkles size={18} />
            <span>{t("msg.letAssistant")}</span>
          </Link>
        </div>
      </header>

      <div className="conv-body" aria-live="polite">
        {error ? (
          <ErrorBlock message={t("msg.loadError")} onRetry={load} />
        ) : !thread ? (
          <Skeleton lines={4} height={44} />
        ) : thread.messages.length === 0 ? (
          <EmptyBlock title={t("msg.emptyThread")} />
        ) : (
          <ol className="bubbles">
            {thread.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ol>
        )}
      </div>

      <Composer channelReady={channelState.status === "connected"} />
    </article>
  );
}

export function MessageBubble({ message }: { message: ConversationMessage }) {
  const t = useT();
  const mine = message.direction === "out";
  const media =
    message.mediaType === "image"
      ? t("msg.mediaImage")
      : message.mediaType === "audio"
        ? t("msg.mediaAudio")
        : message.mediaType === "file"
          ? t("msg.mediaFile")
          : null;
  const time = new Date(message.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <li className={mine ? "bubble is-mine" : "bubble"}>
      <span className="sr-only">{mine ? t("msg.sent") : t("msg.received")}</span>
      {media ? <span className="bubble-media">{media}</span> : null}
      {message.body ? <p>{message.body}</p> : null}
      <span className="bubble-meta">
        {mine && message.triggerName ? `${t("msg.autoReply")} · ` : ""}
        <time dateTime={message.receivedAt}>{time}</time>
      </span>
    </li>
  );
}

/** Zone de réponse. L'API ne permet pas encore l'envoi manuel (voir docs/ui-hypotheses.md). */
function Composer({ channelReady }: { channelReady: boolean }) {
  const t = useT();
  const sendAvailable = false;
  return (
    <form className="composer" onSubmit={(event) => event.preventDefault()}>
      <label className="sr-only" htmlFor="composer-input">
        {t("msg.write")}
      </label>
      <textarea
        id="composer-input"
        rows={1}
        placeholder={t("msg.write")}
        disabled={!sendAvailable}
        aria-describedby="composer-note"
      />
      <button type="submit" className="primary" disabled={!sendAvailable}>
        <IconSend size={18} />
        <span>{t("msg.send")}</span>
      </button>
      <p className="composer-note" id="composer-note">
        {channelReady ? t("msg.sendUnavailable") : t("msg.channelOff")}
      </p>
    </form>
  );
}
