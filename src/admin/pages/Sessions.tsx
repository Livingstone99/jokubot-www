import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  api,
  type ConversationSummary,
  type ConversationThread,
} from "../api.js";
import {
  ChannelBadge,
  EmptyState,
  OutcomePill,
  formatWhen,
  initials,
  senderLabel,
  senderPreview,
} from "../ui.js";

const CHANNELS = ["all", "whatsapp", "telegram"] as const;

export function SessionsPage() {
  const navigate = useNavigate();
  const params = useParams<{ channel?: string; sender?: string }>();
  const selectedChannel =
    params.channel === "whatsapp" || params.channel === "telegram"
      ? params.channel
      : null;
  const selectedSender = params.sender
    ? decodeURIComponent(params.sender)
    : null;

  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [filter, setFilter] = useState<"all" | "whatsapp" | "telegram">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const result = await api.conversations();
        if (!cancelled) {
          setItems(result.items);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load sessions.");
        }
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!selectedChannel || !selectedSender) {
      setThread(null);
      setThreadError(null);
      return;
    }
    let cancelled = false;
    let first = true;
    async function tick() {
      if (!selectedChannel || !selectedSender) {
        return;
      }
      try {
        const next = await api.conversation(selectedChannel, selectedSender);
        if (!cancelled) {
          setThread(next);
          setThreadError(null);
        }
      } catch (err: unknown) {
        if (!cancelled && first) {
          setThreadError(
            err instanceof Error ? err.message : "Could not load this session.",
          );
        }
      } finally {
        first = false;
      }
    }
    setThread(null);
    setThreadError(null);
    void tick();
    const id = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [selectedChannel, selectedSender]);

  const visible = useMemo(() => {
    const source = items ?? [];
    const needle = query.trim().toLowerCase();
    return source.filter((item) => {
      if (filter !== "all" && item.channel !== filter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        item.senderRef,
        item.phoneNumber,
        item.displayName,
        senderLabel(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [items, filter, query]);

  const selectedOpen = Boolean(selectedChannel && selectedSender);

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Sessions</p>
          <h1>WhatsApp and Telegram</h1>
          <p className="lede">
            Numbers and accounts that have messaged this business. Open one to
            see that session.
          </p>
        </div>
      </header>

      {error ? (
        <p className="banner banner-danger" role="alert">
          {error}
        </p>
      ) : null}

      <article
        className={`panel session-desk${selectedOpen ? " is-open" : ""}`}
      >
        <div className="session-list">
          <div className="session-list-head">
            <label>
              Channel
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as (typeof CHANNELS)[number])
                }
              >
                <option value="all">All</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
              </select>
            </label>
            <label>
              Search
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Number or name"
              />
            </label>
          </div>
          {items === null ? (
            <div className="skeleton-table session-skeleton" aria-hidden="true" />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              body={
                items.length === 0
                  ? "When someone messages on WhatsApp or Telegram, they appear here."
                  : "No senders match this channel or search."
              }
            />
          ) : (
            <div className="session-list-items">
              {visible.map((item) => {
                const active =
                  item.channel === selectedChannel &&
                  item.senderRef === selectedSender;
                const label = senderLabel(item);
                return (
                  <Link
                    key={`${item.channel}:${item.senderRef}`}
                    to={`/sessions/${item.channel}/${encodeURIComponent(item.senderRef)}`}
                    className={active ? "session-row is-active" : "session-row"}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="avatar" aria-hidden="true">
                      {initials(label)}
                    </span>
                    <span className="session-row-copy">
                      <strong>{label}</strong>
                      <span>{senderPreview(item)}</span>
                    </span>
                    <span className="session-row-meta">
                      <ChannelBadge channel={item.channel} />
                      <time dateTime={item.lastReceivedAt}>
                        {formatWhen(item.lastReceivedAt)}
                      </time>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="session-thread">
          {!selectedOpen ? (
            <EmptyState
              title="Select a number"
              body="Choose a sender on the left to open their WhatsApp or Telegram session."
            />
          ) : threadError ? (
            <p className="banner banner-danger" role="alert">
              {threadError}
            </p>
          ) : thread === null ? (
            <div className="skeleton-table session-skeleton" aria-hidden="true" />
          ) : (
            <>
              <header className="session-thread-head">
                <button
                  type="button"
                  className="secondary compact session-back"
                  onClick={() => navigate("/sessions")}
                >
                  Back
                </button>
                <span className="avatar" aria-hidden="true">
                  {initials(senderLabel(thread))}
                </span>
                <div className="session-thread-copy">
                  <strong>{senderLabel(thread)}</strong>
                  <span>
                    {thread.displayName && thread.phoneNumber
                      ? thread.displayName
                      : thread.senderRef}
                  </span>
                </div>
                <ChannelBadge channel={thread.channel} />
              </header>
              <div className="session-thread-body">
                {thread.messages.map((message) => (
                  <article
                    key={message.id}
                    className={
                      message.direction === "out"
                        ? "session-bubble is-out"
                        : "session-bubble"
                    }
                  >
                    <p>
                      {message.body?.trim() &&
                      message.body !== "[image]" &&
                      message.body !== "[audio]" &&
                      message.body !== "[file]"
                        ? message.body
                        : message.direction === "in"
                          ? message.mediaType === "image" || message.body === "[image]"
                            ? "Photo"
                            : message.mediaType === "audio" || message.body === "[audio]"
                              ? "Voice note"
                              : message.mediaType === "file" || message.body === "[file]"
                                ? "File"
                                : "Inbound message"
                          : "Reply"}
                    </p>
                    <footer>
                      <time dateTime={message.receivedAt}>
                        {formatWhen(message.receivedAt)}
                      </time>
                      {message.direction === "in" && message.outcome ? (
                        <OutcomePill outcome={message.outcome} />
                      ) : (
                        <span className="muted">Reply</span>
                      )}
                      {message.triggerName ? (
                        <span className="muted">{message.triggerName}</span>
                      ) : null}
                      {message.sessionPublicId ? (
                        <code>{message.sessionPublicId}</code>
                      ) : null}
                    </footer>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </article>
    </section>
  );
}
