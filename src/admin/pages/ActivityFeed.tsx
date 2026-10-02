import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, type InboundRow } from "../api.js";
import type { MessageKey } from "../i18n.js";
import { IconActivity, IconChevronRight, IconCircleCheck, IconMessage, IconShieldCheck, IconAlert, type IconComponent } from "../jk/icons.js";
import { Badge, ChannelMark, EmptyState, ErrorState, Loading, Modal, PageTitle, SearchInput, type BadgeTone } from "../jk/ui.js";
import { localeTag } from "../i18n.js";
import { useT } from "../locale.js";
import { senderLabel } from "../ui.js";

type Kind = "received" | "replied" | "verified" | "refused";

/** Traduit l'issue technique d'un message en événement compréhensible. */
export function activityKind(outcome: string): Kind {
  if (outcome === "verified") return "verified";
  if (outcome === "triggered") return "replied";
  if (["expired", "unknown_token", "already_used", "channel_mismatch", "sender_mismatch"].includes(outcome)) return "refused";
  return "received";
}

const KIND_LABEL: Record<Kind, MessageKey> = {
  received: "jk.act.received",
  replied: "jk.act.replied",
  verified: "jk.act.verified",
  refused: "jk.act.refused",
};

const KIND_ICON: Record<Kind, IconComponent> = {
  received: IconMessage,
  replied: IconCircleCheck,
  verified: IconShieldCheck,
  refused: IconAlert,
};

export function activityLabel(outcome: string): MessageKey {
  return KIND_LABEL[activityKind(outcome)];
}

export function activityIcon(outcome: string): IconComponent {
  return KIND_ICON[activityKind(outcome)];
}

const KIND_TONE: Record<Kind, BadgeTone> = {
  received: "muted",
  replied: "outline",
  verified: "solid",
  refused: "outline",
};

const KNOWN_OUTCOMES = ["verified", "triggered", "expired", "unknown_token", "already_used", "channel_mismatch", "sender_mismatch"];

/** Issue technique → phrase courte (tableau) ou explication (détails). */
function outcomeKey(outcome: string): string {
  return KNOWN_OUTCOMES.includes(outcome) ? outcome : "received";
}
function shortDetail(outcome: string): MessageKey {
  return `jk.act.short.${outcomeKey(outcome)}` as MessageKey;
}
function explanation(outcome: string): MessageKey {
  return `jk.act.why.${outcomeKey(outcome)}` as MessageKey;
}

function channelName(channel: InboundRow["channel"]) {
  return channel === "telegram" ? "Telegram" : "WhatsApp";
}

function dateTime(value: string, long = false) {
  return new Date(value).toLocaleString(
    localeTag(),
    long
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }
      : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  );
}

type Range = "today" | "7d" | "all";

export function ActivityFeedPage() {
  const t = useT();
  const [rows, setRows] = useState<InboundRow[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<"all" | "whatsapp" | "telegram">("all");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [range, setRange] = useState<Range>("all");
  const [selected, setSelected] = useState<InboundRow | null>(null);

  const load = useCallback(() => {
    setError(false);
    setRows(null);
    void api
      .inbound()
      .then((res) => setRows(res.items))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const since = range === "today" ? startOfDay.getTime() : range === "7d" ? Date.now() - 7 * 86400000 : 0;
    return (rows ?? []).filter((row) => {
      if (channel !== "all" && row.channel !== channel) return false;
      if (kind !== "all" && activityKind(row.outcome) !== kind) return false;
      if (new Date(row.receivedAt).getTime() < since) return false;
      if (q && !`${senderLabel(row)} ${row.triggerName ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, channel, kind, range]);

  return (
    <div className="jk-page">
      <PageTitle title={t("jk.nav.activity")} subtitle={t("jk.act.subtitle")} />

      <div className="jk-filters">
        <SearchInput value={query} onChange={setQuery} placeholder={t("jk.act.search")} />
        <label className="jk-select">
          <span className="jk-sr">{t("jk.filter.channel")}</span>
          <select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)}>
            <option value="all">{t("jk.filter.allChannels")}</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
          </select>
        </label>
        <label className="jk-select">
          <span className="jk-sr">{t("jk.filter.type")}</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="all">{t("jk.filter.allTypes")}</option>
            <option value="received">{t("jk.act.received")}</option>
            <option value="replied">{t("jk.act.replied")}</option>
            <option value="verified">{t("jk.act.verified")}</option>
            <option value="refused">{t("jk.act.refused")}</option>
          </select>
        </label>
        <label className="jk-select">
          <span className="jk-sr">{t("jk.filter.date")}</span>
          <select value={range} onChange={(event) => setRange(event.target.value as Range)}>
            <option value="all">{t("jk.filter.allDates")}</option>
            <option value="today">{t("jk.filter.today")}</option>
            <option value="7d">{t("jk.filter.7d")}</option>
          </select>
        </label>
      </div>

      {error ? (
        <ErrorState message={t("jk.act.error")} onRetry={load} />
      ) : rows === null ? (
        <Loading rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={IconActivity}
          title={rows.length === 0 ? t("jk.act.empty") : t("jk.noResult")}
          body={rows.length === 0 ? t("jk.act.emptyBody") : t("jk.noResultBody")}
          action={
            rows.length === 0 ? (
              <Link className="jk-btn is-primary" to="/channels">
                {t("jk.connectChannel")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="jk-muted jk-small jk-count">
            {filtered.length === 1 ? t("jk.act.countOne") : t("jk.act.count", { count: filtered.length })}
          </p>
          <div className="jk-table-wrap is-cards jk-act-wrap">
            <table className="jk-table jk-act-table">
              <thead>
                <tr>
                  <th scope="col">{t("jk.act.colDate")}</th>
                  <th scope="col">{t("jk.act.colEvent")}</th>
                  <th scope="col">{t("jk.act.colClient")}</th>
                  <th scope="col">{t("jk.act.colChannel")}</th>
                  <th scope="col" className="jk-col-opt">{t("jk.act.colAutomation")}</th>
                  <th scope="col" className="jk-col-opt">{t("jk.act.colDetail")}</th>
                  <th scope="col">
                    <span className="jk-sr">{t("jk.act.details")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const Icon = activityIcon(row.outcome);
                  const kindOf = activityKind(row.outcome);
                  return (
                    <tr key={row.id} className="is-clickable" onClick={() => setSelected(row)}>
                      <td className="jk-nowrap">
                        <time dateTime={row.receivedAt}>{dateTime(row.receivedAt)}</time>
                      </td>
                      <td>
                        <span className="jk-act-event">
                          <span className="jk-timeline-icon jk-col-opt">
                            <Icon size={16} />
                          </span>
                          <Badge tone={KIND_TONE[kindOf]}>{t(KIND_LABEL[kindOf])}</Badge>
                        </span>
                      </td>
                      <td>
                        <strong>{senderLabel(row)}</strong>
                      </td>
                      <td className="jk-nowrap">
                        <ChannelMark channel={row.channel} size={14} /> {channelName(row.channel)}
                      </td>
                      <td className="jk-col-opt">{row.triggerName ?? <span className="jk-muted">—</span>}</td>
                      <td className="jk-muted jk-col-opt">{t(shortDetail(row.outcome))}</td>
                      <td className="jk-cell-action">
                        <button
                          type="button"
                          className="jk-btn is-text is-small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(row);
                          }}
                        >
                          {t("jk.act.details")}
                          <IconChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="jk-cards jk-act-cards">
            {filtered.map((row) => {
              const kindOf = activityKind(row.outcome);
              return (
                <li key={row.id}>
                  <button type="button" className="jk-card jk-mini jk-act-card" onClick={() => setSelected(row)}>
                    <span className="jk-mini-top">
                      <strong>{senderLabel(row)}</strong>
                      <Badge tone={KIND_TONE[kindOf]}>{t(KIND_LABEL[kindOf])}</Badge>
                    </span>
                    <span className="jk-row-sub">
                      <ChannelMark channel={row.channel} size={13} /> {channelName(row.channel)} · {dateTime(row.receivedAt)}
                    </span>
                    <span className="jk-row-sub">
                      {t(shortDetail(row.outcome))}
                      {row.triggerName ? ` · ${row.triggerName}` : ""}
                    </span>
                    <span className="jk-act-more">
                      {t("jk.act.details")}
                      <IconChevronRight size={16} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ActivityDetails row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ---------- Détails d'un événement ---------- */

function ActivityDetails({ row, onClose }: { row: InboundRow | null; onClose: () => void }) {
  const t = useT();
  const kindOf = row ? activityKind(row.outcome) : "received";
  return (
    <Modal
      open={row !== null}
      title={row ? t(KIND_LABEL[kindOf]) : ""}
      onClose={onClose}
      footer={
        row ? (
          <>
            <Link
              className="jk-btn is-secondary"
              to={`/sessions/${row.channel}/${encodeURIComponent(row.senderRef)}`}
              onClick={onClose}
            >
              {t("jk.act.openConversation")}
            </Link>
            <button type="button" className="jk-btn is-primary" onClick={onClose}>
              {t("jk.close")}
            </button>
          </>
        ) : undefined
      }
    >
      {row ? (
        <>
          <p className="jk-act-explain">
            <Badge tone={KIND_TONE[kindOf]}>{t(shortDetail(row.outcome))}</Badge>
            <span>{t(explanation(row.outcome))}</span>
          </p>
          <dl className="jk-summary jk-act-dl">
            <div>
              <dt>{t("jk.act.colClient")}</dt>
              <dd>{senderLabel(row)}</dd>
            </div>
            <div>
              <dt>{t("jk.act.colChannel")}</dt>
              <dd>
                <ChannelMark channel={row.channel} size={14} /> {channelName(row.channel)}
              </dd>
            </div>
            <div>
              <dt>{t("jk.act.when")}</dt>
              <dd>{dateTime(row.receivedAt, true)}</dd>
            </div>
            <div>
              <dt>{t("jk.act.colAutomation")}</dt>
              <dd>{row.triggerName ?? t("jk.act.none")}</dd>
            </div>
            {row.sessionPublicId ? (
              <div>
                <dt>{t("jk.act.session")}</dt>
                <dd className="jk-mono">{row.sessionPublicId}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t("jk.act.ref")}</dt>
              <dd className="jk-mono">{row.id}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </Modal>
  );
}
