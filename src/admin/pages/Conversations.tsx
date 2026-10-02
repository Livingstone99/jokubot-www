import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, type ConversationSummary, type ConversationThread } from "../api.js";
import { localeTag } from "../i18n.js";
import { IconArrowLeft, IconBot, IconMessage } from "../jk/icons.js";
import { Avatar, ChannelMark, EmptyState, ErrorState, Loading, PageTitle, SearchInput } from "../jk/ui.js";
import { useT } from "../locale.js";
import { formatWhen, senderLabel, senderPreview } from "../ui.js";

type Filter = "all" | "whatsapp" | "telegram";

function nameOf(row: { channel: string; senderRef: string; phoneNumber?: string | null; displayName?: string | null }) {
  return row.displayName || senderLabel(row);
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function ConversationsPage() {
  const t = useT();
  const params = useParams();
  const channel: "whatsapp" | "telegram" | null =
    params.channel === "whatsapp" || params.channel === "telegram" ? params.channel : null;
  const sender = params.sender ?? null;
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => {
    setError(false);
    setItems(null);
    void api
      .conversations()
      .then((res) => setItems(res.items))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return (items ?? [])
      .filter((row) => filter === "all" || row.channel === filter)
      .filter((row) => !q || normalize(`${nameOf(row)} ${senderPreview(row)} ${row.phoneNumber ?? ""}`).includes(q))
      .sort((a, b) => b.lastReceivedAt.localeCompare(a.lastReceivedAt));
  }, [items, query, filter]);

  const open = channel && sender ? { channel, sender } : null;

  return (
    <div className={open ? "jk-page jk-conv-page has-open" : "jk-page jk-conv-page"}>
      <div className="jk-conv-head">
        <PageTitle title={t("jk.nav.conversations")} subtitle={t("jk.conv.subtitle")} />
      </div>
      <div className="jk-conv">
        <aside className="jk-conv-list" aria-label={t("jk.nav.conversations")}>
          <div className="jk-conv-tools">
            <SearchInput value={query} onChange={setQuery} placeholder={t("jk.conv.search")} />
            <div className="jk-chips" role="group" aria-label={t("jk.filter.channel")}>
              {(["all", "whatsapp", "telegram"] as Filter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? "jk-chip is-on" : "jk-chip"}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === "all" ? t("jk.filter.all") : value === "whatsapp" ? "WhatsApp" : "Telegram"}
                </button>
              ))}
            </div>
          </div>
          {error ? (
            <div className="jk-pad">
              <ErrorState message={t("jk.conv.error")} onRetry={load} />
            </div>
          ) : items === null ? (
            <div className="jk-pad">
              <Loading rows={5} height={60} />
            </div>
          ) : rows.length === 0 ? (
            <div className="jk-pad">
              <EmptyState
                icon={IconMessage}
                title={items.length === 0 ? t("jk.conv.empty") : t("jk.noResult")}
                body={items.length === 0 ? t("jk.conv.emptyBody") : t("jk.noResultBody")}
                action={
                  items.length === 0 ? (
                    <Link className="jk-btn is-primary" to="/channels">
                      {t("jk.ch.connectWa")}
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul className="jk-conv-items">
              {rows.map((row) => {
                const active = open?.channel === row.channel && open.sender === row.senderRef;
                const name = nameOf(row);
                return (
                  <li key={`${row.channel}:${row.senderRef}`}>
                    <Link
                      to={`/sessions/${row.channel}/${encodeURIComponent(row.senderRef)}`}
                      className={active ? "jk-conv-row is-active" : "jk-conv-row"}
                      aria-current={active ? "true" : undefined}
                    >
                      <Avatar name={name} size={42} />
                      <span className="jk-row-main">
                        <span className="jk-conv-top">
                          <strong>{name}</strong>
                          <time dateTime={row.lastReceivedAt}>{formatWhen(row.lastReceivedAt)}</time>
                        </span>
                        <span className="jk-row-sub">
                          <ChannelMark channel={row.channel} size={13} /> {senderPreview(row)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {open ? (
          <ConversationView channel={open.channel} sender={open.sender} summary={items?.find((r) => r.channel === open.channel && r.senderRef === open.sender)} />
        ) : (
          <div className="jk-conv-empty">
            <EmptyState icon={IconMessage} title={t("jk.conv.pick")} body={t("jk.conv.pickBody")} />
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationView({
  channel,
  sender,
  summary,
}: {
  channel: "whatsapp" | "telegram";
  sender: string;
  summary?: ConversationSummary;
}) {
  const t = useT();
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setThread(null);
    void api
      .conversation(channel, sender)
      .then(setThread)
      .catch(() => setError(true));
  }, [channel, sender]);

  useEffect(() => {
    load();
  }, [load]);

  const name = thread ? nameOf(thread) : summary ? nameOf(summary) : sender;

  // Séparateurs de jour entre les messages.
  let lastDay = "";

  return (
    <section className="jk-conv-view" aria-label={name}>
      <header className="jk-conv-view-head">
        <Link to="/sessions" className="jk-icon-btn jk-conv-back" aria-label={t("jk.back")}>
          <IconArrowLeft />
        </Link>
        <Avatar name={name} size={40} />
        <div className="jk-row-main">
          <strong>{name}</strong>
          <span className="jk-row-sub">
            <ChannelMark channel={channel} size={13} /> {channel === "telegram" ? "Telegram" : "WhatsApp"}
            {thread?.phoneNumber && thread.phoneNumber !== name ? ` · ${thread.phoneNumber}` : ""}
          </span>
        </div>
      </header>
      <div className="jk-conv-body">
        {error ? (
          <ErrorState message={t("jk.conv.threadError")} onRetry={load} />
        ) : !thread ? (
          <Loading rows={4} height={44} />
        ) : thread.messages.length === 0 ? (
          <EmptyState icon={IconMessage} title={t("jk.conv.noMessages")} />
        ) : (
          <ol className="jk-bubbles">
            {thread.messages.map((message) => {
              const date = new Date(message.receivedAt);
              const day = date.toLocaleDateString(localeTag(), { weekday: "long", day: "numeric", month: "long" });
              const showDay = day !== lastDay;
              lastDay = day;
              const mine = message.direction === "out";
              const media =
                message.mediaType === "image"
                  ? t("jk.conv.photo")
                  : message.mediaType === "audio"
                    ? t("jk.conv.voice")
                    : message.mediaType === "file"
                      ? t("jk.conv.file")
                      : null;
              return (
                <li key={message.id} className="jk-bubble-row">
                  {showDay ? <p className="jk-day-sep">{day}</p> : null}
                  <div className={mine ? "jk-bubble is-out" : "jk-bubble"}>
                    <span className="jk-sr">{mine ? t("jk.conv.sent") : t("jk.conv.received")}</span>
                    {media ? <span className="jk-bubble-media">{media}</span> : null}
                    {message.body ? <p>{message.body}</p> : null}
                    <span className="jk-bubble-meta">
                      {mine && message.triggerName ? (
                        <>
                          <IconBot size={13} /> {t("jk.conv.auto")} ·{" "}
                        </>
                      ) : null}
                      <time dateTime={message.receivedAt}>
                        {date.toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
